/**
 * API Client for communicating with the backend.
 * Uses the native fetch API. In development, requests to /api
 * are proxied to the backend server via Vite's proxy config.
 */

const API_BASE = '/api';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return {
      data: null as unknown as T,
      error: errorBody.error || `Request failed with status ${response.status}`,
    };
  }

  const data = await response.json();
  return { data };
}

/** Chat response types from the backend */
export interface ChatPlanStep {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ChatPlan {
  id: string;
  status: string;
  steps: ChatPlanStep[];
}

export interface ChatResponse {
  type: 'clarification' | 'response';
  message: string;
  intent: {
    taskType: string;
    platform: string;
    category: string;
    confidence: number;
  };
  plan?: ChatPlan;
  sessionId: string;
}

/** Send a chat message to the conversation engine */
export function sendMessage(message: string, sessionId: string) {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, sessionId }),
  });
}

/** Fetch all notes with optional filters */
export function getNotes(filters?: {
  platform?: string;
  status?: string;
  category?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.category) params.set('category', filters.category);
  const query = params.toString();
  return request<unknown[]>(`/notes${query ? `?${query}` : ''}`);
}

/** Create a new note */
export function createNote(note: {
  topic: string;
  platform: string;
  category: string;
}) {
  return request<unknown>('/notes', {
    method: 'POST',
    body: JSON.stringify(note),
  });
}

/** Publish a note */
export function publishNote(noteId: string, platform: string) {
  return request<unknown>('/publish', {
    method: 'POST',
    body: JSON.stringify({ noteId, platform }),
  });
}

/** Strategy node type */
export interface StrategyNodeResponse {
  id: string;
  scheduledDate: string;
  topic: string;
  contentType: string;
  frequency: string;
  expectedEffect: string;
  note?: {
    id: string;
    title: string;
    textContent: string;
    status: string;
  };
  status: 'planned' | 'content_ready' | 'published';
}

/** Strategy type */
export interface StrategyResponse {
  id: string;
  category: string;
  goal: string;
  nodes: StrategyNodeResponse[];
  publishReady: boolean;
  createdAt: string;
}

/** Fetch strategies */
export function getStrategies() {
  return request<{ strategies: StrategyResponse[]; total: number }>('/strategies');
}

/** Create a strategy */
export function createStrategy(strategy: {
  category: string;
  goal: string;
  platform: string;
  duration: string;
}) {
  return request<{ strategy: StrategyResponse }>('/strategies', {
    method: 'POST',
    body: JSON.stringify(strategy),
  });
}

/** Adjust a strategy node */
export function adjustStrategyNode(
  strategyId: string,
  nodeId: string,
  changes: { topic?: string; contentType?: string },
) {
  return request<{ strategy: StrategyResponse }>(
    `/strategies/${strategyId}/nodes/${nodeId}`,
    {
      method: 'PUT',
      body: JSON.stringify(changes),
    },
  );
}

/** Analytics response types */
export interface OperationSummaryResponse {
  timeRange: { start: string; end: string };
  totalNotes: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalFavorites: number;
  totalShares: number;
  topPerformingNotes: string[];
  insights: string[];
}

export interface CommentAnalysisResponse {
  noteId: string;
  totalComments: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topKeywords: string[];
  summary: string;
}

export interface OptimizationSuggestionResponse {
  type: 'timing' | 'content' | 'tags' | 'frequency';
  title: string;
  description: string;
  confidence: number;
  basedOn: string;
}

export interface AnomalyAlertResponse {
  noteId: string;
  metric: 'views' | 'likes' | 'comments' | 'favorites' | 'shares';
  currentValue: number;
  expectedValue: number;
  deviation: number;
  detectedAt: string;
  possibleReasons: string[];
}

/** Fetch analytics summary */
export function getAnalyticsSummary(timeRange: {
  startDate: string;
  endDate: string;
}) {
  const params = new URLSearchParams();
  params.set('startDate', timeRange.startDate);
  params.set('endDate', timeRange.endDate);
  const query = params.toString();
  return request<{ summary: OperationSummaryResponse }>(`/analytics/summary?${query}`);
}

/** Fetch comment analysis for a specific note */
export function getCommentAnalysis(noteId: string) {
  return request<{ analysis: CommentAnalysisResponse }>(`/analytics/comments/${encodeURIComponent(noteId)}`);
}

/** Fetch trending topics */
export function getTrending(platform?: string) {
  const params = new URLSearchParams();
  if (platform) params.set('platform', platform);
  const query = params.toString();
  return request<unknown[]>(`/trending${query ? `?${query}` : ''}`);
}

export default {
  sendMessage,
  getNotes,
  createNote,
  publishNote,
  getStrategies,
  createStrategy,
  adjustStrategyNode,
  getAnalyticsSummary,
  getCommentAnalysis,
  getTrending,
};
