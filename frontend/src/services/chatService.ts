import { api, API_URL } from './api'
import { useAuth } from '../store/auth'
import type { ChatRequest, Message, Session, Source, StreamEvent } from '../types'

/** Decode SSE across arbitrary UTF-8/network chunk boundaries. */
export async function readSSE(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete = false
  const dispatch = (frame: string) => {
    const data = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
    if (!data) return
    const event = JSON.parse(data) as StreamEvent
    if (event.type === 'error') throw new Error(event.error)
    if (event.type === 'complete') complete = true
    onEvent(event)
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer = (buffer + decoder.decode(value, { stream: !done })).replace(/\r\n/g, '\n')
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        dispatch(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
      }
      if (done) break
    }
    if (buffer.trim()) dispatch(buffer)
    if (!complete)
      throw new Error('The response was interrupted. Retry your question to get a complete answer.')
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
export const chatService = {
  sessions: async () => (await api.get<Session[]>('/chat/sessions')).data,
  session: async (id: number, signal?: AbortSignal) =>
    (await api.get<Session & { messages: Message[] }>(`/chat/sessions/${id}`, { signal })).data,
  create: async (title: string) => (await api.post<Session>('/chat/sessions', { title })).data,
  remove: async (id: number) => {
    await api.delete(`/chat/sessions/${id}`)
  },
  ask: async (request: ChatRequest, signal?: AbortSignal) =>
    (
      await api.post<{ session_id: number; message: Message; sources: Source[] }>(
        '/chat/ask',
        request,
        { signal, timeout: 120000 },
      )
    ).data,
  stream: async (
    request: ChatRequest,
    onEvent: (event: StreamEvent) => void,
    signal: AbortSignal,
  ) => {
    const response = await fetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${useAuth.getState().token}`,
      },
      body: JSON.stringify(request),
      signal,
    })
    if (response.status === 401) {
      useAuth.getState().logout(true)
      throw new Error('Your session expired. Sign in again.')
    }
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { detail?: unknown } | null
      throw new Error(
        typeof data?.detail === 'string'
          ? data.detail
          : `Chat request failed (${response.status}). Try again.`,
      )
    }
    if (!response.body) throw new Error('Streaming is unavailable in this browser.')
    await readSSE(response.body, onEvent)
  },
}
