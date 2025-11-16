/**
 * Validação de estudos (status, prioridade, etc)
 */

export const VALID_STUDY_STATUS = [
  "pendente",
  "em_analise",
  "concluido",
  "cancelado",
] as const;

export const VALID_STUDY_PRIORITY = ["baixa", "media", "alta"] as const;

export const VALID_REQUEST_STATUS = [
  "aberto",
  "em_busca",
  "encontrado",
  "cancelado",
] as const;

export type ValidStudyStatus = (typeof VALID_STUDY_STATUS)[number];
export type ValidStudyPriority = (typeof VALID_STUDY_PRIORITY)[number];
export type ValidRequestStatus = (typeof VALID_REQUEST_STATUS)[number];

/**
 * Valida se um valor é um status de estudo válido
 */
export function validateStudyStatus(value: string): value is ValidStudyStatus {
  return VALID_STUDY_STATUS.includes(value as ValidStudyStatus);
}

/**
 * Valida se um valor é uma prioridade válida
 */
export function validateStudyPriority(value: string): value is ValidStudyPriority {
  return VALID_STUDY_PRIORITY.includes(value as ValidStudyPriority);
}

/**
 * Valida se um valor é um status de requisição válido
 */
export function validateRequestStatus(value: string): value is ValidRequestStatus {
  return VALID_REQUEST_STATUS.includes(value as ValidRequestStatus);
}

/**
 * Valida um filtro de status de estudo (inclui "all")
 */
export function validateStudyStatusFilter(value: string): boolean {
  return value === "all" || validateStudyStatus(value);
}

/**
 * Valida um filtro de status de requisição (inclui "all")
 */
export function validateRequestStatusFilter(value: string): boolean {
  return value === "all" || validateRequestStatus(value);
}

/**
 * Obtém o label em português para um status de estudo
 */
export function getStudyStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_analise: "Em Análise",
    concluido: "Concluído",
    cancelado: "Cancelado",
    all: "Todos",
  };
  return labels[status] || status;
}

/**
 * Obtém o label em português para uma prioridade
 */
export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
  };
  return labels[priority] || priority;
}

/**
 * Obtém o label em português para um status de requisição
 */
export function getRequestStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    aberto: "Aberto",
    em_busca: "Em Busca",
    encontrado: "Encontrado",
    cancelado: "Cancelado",
    all: "Todos",
  };
  return labels[status] || status;
}

/**
 * Valida todos os filtros de estudo de uma vez
 */
export interface StudyFilterValidationResult {
  status: string;
  isValid: boolean;
}

export function validateStudyFilters(filters: {
  status?: string;
}): StudyFilterValidationResult {
  const result: StudyFilterValidationResult = {
    status: filters.status || "all",
    isValid: true,
  };

  if (!validateStudyStatusFilter(result.status)) {
    console.warn(`Status de estudo inválido: ${result.status}, usando "all"`);
    result.status = "all";
    result.isValid = false;
  }

  return result;
}

/**
 * Carrega filtros de estudo do localStorage com validação
 */
export function loadStudyFiltersFromStorage(): StudyFilterValidationResult {
  try {
    const saved = localStorage.getItem("adminStudyRequestsFilters");
    if (!saved) {
      return {
        status: "all",
        isValid: true,
      };
    }

    const parsed = JSON.parse(saved);
    return validateStudyFilters(parsed);
  } catch (error) {
    console.error("Erro ao carregar filtros de estudo do localStorage:", error);
    return {
      status: "all",
      isValid: false,
    };
  }
}

/**
 * Salva filtros de estudo no localStorage com validação
 */
export function saveStudyFiltersToStorage(filters: {
  status: string;
}): boolean {
  try {
    if (!validateStudyStatusFilter(filters.status)) {
      console.warn("Tentativa de salvar filtros de estudo inválidos");
      return false;
    }

    localStorage.setItem("adminStudyRequestsFilters", JSON.stringify(filters));
    return true;
  } catch (error) {
    console.error("Erro ao salvar filtros de estudo no localStorage:", error);
    return false;
  }
}

/**
 * Valida um status antes de enviar para o servidor
 */
export function validateStatusForUpdate(status: string): ValidStudyStatus | null {
  if (validateStudyStatus(status)) {
    return status;
  }
  console.warn(`Status inválido para atualização: ${status}`);
  return null;
}

/**
 * Valida uma prioridade antes de enviar para o servidor
 */
export function validatePriorityForUpdate(priority: string): ValidStudyPriority | null {
  if (validateStudyPriority(priority)) {
    return priority;
  }
  console.warn(`Prioridade inválida para atualização: ${priority}`);
  return null;
}
