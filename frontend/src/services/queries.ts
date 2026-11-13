import { useQuery } from '@tanstack/react-query'
import { documentService } from './documentService'
import { chatService } from './chatService'
import { authService } from './authService'
export const useDocuments = () =>
  useQuery({
    queryKey: ['documents'],
    queryFn: ({ signal }) => documentService.list(signal),
    refetchInterval: (query) =>
      query.state.data?.documents.some((d) => d.status === 'processing' || d.status === 'uploading')
        ? 2500
        : false,
  })
export const useSessions = () => useQuery({ queryKey: ['sessions'], queryFn: chatService.sessions })
export const useUser = () =>
  useQuery({ queryKey: ['user'], queryFn: authService.me, retry: false, staleTime: 60000 })
