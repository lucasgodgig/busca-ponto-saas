/**
 * Validação e sanitização de filtros
 * Garante que apenas valores válidos sejam processados
 */

// Valores válidos para cada tipo de filtro
const VALID_STATUS_VALUES = ["all", "aberto", "em_busca", "encontrado", "cancelado"];
const VALID_DATE_VALUES = ["all", "today", "week", "month", "3months"];

/**
 * Valida se um valor de status é válido
 */
export function validateStatusFilter(value: string): boolean {
  return VALID_STATUS_VALUES.includes(value);
}

/**
 * Valida se um valor de data é válido
 */
export function validateDateFilter(value: string): boolean {
  return VALID_DATE_VALUES.includes(value);
}

/**
 * Sanitiza uma string de filtro removendo caracteres perigosos
 */
export function sanitizeFilterString(value: string): string {
  if (!value || typeof value !== "string") return "";
  
  // Remove caracteres especiais perigosos, mantém apenas letras, números, espaços e hífens
  return value
    .trim()
    .replace(/[<>\"'`]/g, "")
    .substring(0, 100); // Limita a 100 caracteres
}

/**
 * Valida um filtro de texto (busca)
 */
export function validateSearchText(value: string): string {
  if (!value || typeof value !== "string") return "";
  
  const sanitized = sanitizeFilterString(value);
  return sanitized;
}

/**
 * Valida um filtro de cidade
 */
export function validateCityFilter(value: string, availableCities: string[]): string {
  if (!value || typeof value !== "string") return "all";
  
  if (value === "all") return "all";
  
  // Verifica se a cidade existe na lista de cidades disponíveis
  const exists = availableCities.some(
    (city) => city.toLowerCase() === value.toLowerCase()
  );
  
  if (!exists) {
    console.warn(`Cidade inválida: ${value}`);
    return "all";
  }
  
  return value;
}

/**
 * Valida um filtro de segmento
 */
export function validateSegmentFilter(value: string, availableSegments: string[]): string {
  if (!value || typeof value !== "string") return "all";
  
  if (value === "all") return "all";
  
  // Verifica se o segmento existe na lista de segmentos disponíveis
  const exists = availableSegments.some(
    (segment) => segment.toLowerCase() === value.toLowerCase()
  );
  
  if (!exists) {
    console.warn(`Segmento inválido: ${value}`);
    return "all";
  }
  
  return value;
}

/**
 * Valida todos os filtros de uma vez
 */
export interface FilterValidationResult {
  status: string;
  city: string;
  segment: string;
  search: string;
  date: string;
  isValid: boolean;
}

export function validateAllFilters(
  filters: {
    status?: string;
    city?: string;
    segment?: string;
    search?: string;
    date?: string;
  },
  availableCities: string[],
  availableSegments: string[]
): FilterValidationResult {
  const result: FilterValidationResult = {
    status: filters.status || "all",
    city: filters.city || "all",
    segment: filters.segment || "all",
    search: filters.search || "",
    date: filters.date || "all",
    isValid: true,
  };

  // Validar status
  if (!validateStatusFilter(result.status)) {
    console.warn(`Status inválido: ${result.status}, usando "all"`);
    result.status = "all";
    result.isValid = false;
  }

  // Validar data
  if (!validateDateFilter(result.date)) {
    console.warn(`Data inválida: ${result.date}, usando "all"`);
    result.date = "all";
    result.isValid = false;
  }

  // Validar cidade
  result.city = validateCityFilter(result.city, availableCities);

  // Validar segmento
  result.segment = validateSegmentFilter(result.segment, availableSegments);

  // Validar texto de busca
  result.search = validateSearchText(result.search);

  return result;
}

/**
 * Carrega filtros do localStorage com validação
 */
export function loadFiltersFromStorage(
  availableCities: string[],
  availableSegments: string[]
): FilterValidationResult {
  try {
    const saved = localStorage.getItem("commercialPointsFilters");
    if (!saved) {
      return {
        status: "all",
        city: "all",
        segment: "all",
        search: "",
        date: "all",
        isValid: true,
      };
    }

    const parsed = JSON.parse(saved);
    return validateAllFilters(parsed, availableCities, availableSegments);
  } catch (error) {
    console.error("Erro ao carregar filtros do localStorage:", error);
    return {
      status: "all",
      city: "all",
      segment: "all",
      search: "",
      date: "all",
      isValid: false,
    };
  }
}

/**
 * Salva filtros no localStorage com validação
 */
export function saveFiltersToStorage(filters: {
  status: string;
  city: string;
  segment: string;
  search: string;
  date: string;
}): boolean {
  try {
    // Não salva se algum filtro for inválido
    if (
      !validateStatusFilter(filters.status) ||
      !validateDateFilter(filters.date)
    ) {
      console.warn("Tentativa de salvar filtros inválidos");
      return false;
    }

    localStorage.setItem("commercialPointsFilters", JSON.stringify(filters));
    return true;
  } catch (error) {
    console.error("Erro ao salvar filtros no localStorage:", error);
    return false;
  }
}
