import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from './documentService'
import { chatService } from './chatService'
import { authService } from './authService'
import { collectionService } from './collectionService'
import * as analysisService from './analysisService'
import * as gapService from './gapDisagreementService'
import type { AnalysisKind } from '../types/analysis'

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

// Analysis Runs
export const useAnalysisRuns = (kind?: AnalysisKind) =>
  useQuery({
    queryKey: ['analysis-runs', kind],
    queryFn: () => analysisService.listAnalysisRuns(kind),
    refetchInterval: (query) =>
      query.state.data?.some(r => ['pending', 'extracting', 'synthesizing'].includes(r.status)) ? 3000 : false,
  })

export const useAnalysisRun = (id: number | null) =>
  useQuery({
    queryKey: ['analysis-run', id],
    queryFn: () => analysisService.getAnalysisRun(id!),
    enabled: id !== null,
    refetchInterval: (query) =>
      query.state.data && ['pending', 'extracting', 'synthesizing'].includes(query.state.data.status) ? 2000 : false,
  })

export const useLatestReviewEdit = (runId: number | null) =>
  useQuery({
    queryKey: ['review-edit', runId],
    queryFn: () => analysisService.getLatestReviewEdit(runId!),
    enabled: runId !== null,
  })

export const useCreateAnalysisRun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: analysisService.createAnalysisRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['analysis-runs'] })
    },
  })
}

export const useCancelAnalysisRun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: analysisService.cancelAnalysisRun,
    onSuccess: (_, runId) => {
      void queryClient.invalidateQueries({ queryKey: ['analysis-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['analysis-run', runId] })
    },
  })
}

export const useDeleteAnalysisRun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: analysisService.deleteAnalysisRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['analysis-runs'] })
    },
  })
}

export const useSaveReviewEdit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ runId, data }: { runId: number; data: Parameters<typeof analysisService.saveReviewEdit>[1] }) =>
      analysisService.saveReviewEdit(runId, data),
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({ queryKey: ['review-edit', runId] })
    },
  })
}

// ─── Gap Analysis & Disagreement Queries ──────────────────────────────────────

export const useCandidateStates = (runId?: number) => useQuery({
  queryKey: ['candidate-states', runId],
  queryFn: () => gapService.listCandidateStates(runId!),
  enabled: !!runId,
})

export const useProjectBriefs = () =>
  useQuery({ queryKey: ['project-briefs'], queryFn: gapService.listProjectBriefs })

export const useUpdateCandidateState = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      runId,
      candidateId,
      data,
    }: {
      runId: number
      candidateId: string
      data: { status: 'saved' | 'dismissed' | null; comment?: string }
    }) => gapService.updateCandidateState(runId, candidateId, data),
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({ queryKey: ['candidate-states', runId] })
    },
  })
}

export const useSaveProjectBrief = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      runId,
      candidateId,
      data,
    }: {
      runId: number
      candidateId: string
      data: { assumptions?: string[]; time_budget?: string; resource_budget?: string }
    }) => gapService.saveProjectBrief(runId, candidateId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-briefs'] })
    },
  })
}

export const useDeleteProjectBrief = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gapService.deleteProjectBrief,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-briefs'] })
    },
  })
}

export const useSaveRelationshipEvidence = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      runId,
      relationshipId,
      data,
    }: {
      runId: number
      relationshipId: string
      data: { note?: string }
    }) => gapService.saveRelationshipEvidence(runId, relationshipId, data),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['evidence-notes'] }) },
  })
}
