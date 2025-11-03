/**
 * Constantes compartilhadas entre cliente e servidor
 */

// Limites de raio de análise (em metros)
export const MIN_RADIUS = 500;
export const MAX_RADIUS = 5000;
export const DEFAULT_RADIUS = 1500;

// Limites de cache
export const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutos

// Debounce delays (em milissegundos)
export const DEBOUNCE_SLIDER_MS = 300;
export const DEBOUNCE_SEARCH_MS = 500;

// Limites de tamanho
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Timeouts (em milissegundos)
export const API_TIMEOUT_MS = 30000; // 30 segundos
export const SPACE_API_TIMEOUT_MS = 15000; // 15 segundos

// Planos e limites
export const PLAN_LIMITS = {
  start: {
    quickQueriesPerMonth: 300,
    simultaneousStudies: 3,
    maxAttachmentSizeMB: 5,
  },
  essencial: {
    quickQueriesPerMonth: 1000,
    simultaneousStudies: 10,
    maxAttachmentSizeMB: 10,
  },
  pro: {
    quickQueriesPerMonth: -1, // ilimitado
    simultaneousStudies: -1, // ilimitado
    maxAttachmentSizeMB: 50,
  },
} as const;

// Segmentos de negócio
export const BUSINESS_SEGMENTS = [
  { value: 'academia', label: 'Academia' },
  { value: 'petshop', label: 'PetShop' },
  { value: 'farmacia', label: 'Farmácia' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'outros', label: 'Outros' },
] as const;

// Status de estudos
export const STUDY_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Prioridades
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

