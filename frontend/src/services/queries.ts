import { useQuery } from '@tanstack/react-query'
import { documentService } from './documentService'
import { chatService } from './chatService'
import { authService } from './authService'
import { collectionService } from './collectionService'

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

export const useCollections = () =>
  useQuery({ queryKey: ['collections'], queryFn: collectionService.listCollections })

export const useTags = () =>
  useQuery({ queryKey: ['tags'], queryFn: collectionService.listTags })

export const useCollectionDocuments = (collectionId: number | null) =>
  useQuery({
    queryKey: ['collection-documents', collectionId],
    queryFn: () => collectionService.getCollectionDocuments(collectionId!),
    enabled: collectionId !== null,
    refetchInterval: (query) => query.state.data?.some((d) => d.status === 'processing' || d.status === 'uploading') ? 2500 : false,
  })
