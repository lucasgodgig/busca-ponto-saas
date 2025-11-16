/**
 * Validação de roles do sistema
 */

export const VALID_ROLES = ["admin_bp", "tenant_admin", "analyst_bp", "member"] as const;
export const VALID_USER_STATUS = ["active", "inactive"] as const;

export type ValidRole = (typeof VALID_ROLES)[number];
export type ValidUserStatus = (typeof VALID_USER_STATUS)[number];

/**
 * Valida se um valor é uma role válida
 */
export function validateRole(value: string): value is ValidRole {
  return VALID_ROLES.includes(value as ValidRole);
}

/**
 * Valida se um valor é um status de usuário válido
 */
export function validateUserStatus(value: string): value is ValidUserStatus {
  return VALID_USER_STATUS.includes(value as ValidUserStatus);
}

/**
 * Valida um filtro de role (inclui "all")
 */
export function validateRoleFilter(value: string): boolean {
  return value === "all" || validateRole(value);
}

/**
 * Valida um filtro de status de usuário (inclui "all")
 */
export function validateUserStatusFilter(value: string): boolean {
  return value === "all" || validateUserStatus(value);
}

/**
 * Obtém o label em português para uma role
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin_bp: "Admin BP",
    tenant_admin: "Tenant Admin",
    analyst_bp: "Analyst BP",
    member: "Member",
    all: "Todas as roles",
  };
  return labels[role] || role;
}

/**
 * Obtém o label em português para um status de usuário
 */
export function getUserStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    all: "Todos os status",
  };
  return labels[status] || status;
}

/**
 * Valida todos os filtros de role de uma vez
 */
export interface RoleFilterValidationResult {
  role: string;
  status: string;
  isValid: boolean;
}

export function validateRoleFilters(filters: {
  role?: string;
  status?: string;
}): RoleFilterValidationResult {
  const result: RoleFilterValidationResult = {
    role: filters.role || "all",
    status: filters.status || "all",
    isValid: true,
  };

  if (!validateRoleFilter(result.role)) {
    console.warn(`Role inválida: ${result.role}, usando "all"`);
    result.role = "all";
    result.isValid = false;
  }

  if (!validateUserStatusFilter(result.status)) {
    console.warn(`Status inválido: ${result.status}, usando "all"`);
    result.status = "all";
    result.isValid = false;
  }

  return result;
}

/**
 * Carrega filtros de role do localStorage com validação
 */
export function loadRoleFiltersFromStorage(): RoleFilterValidationResult {
  try {
    const saved = localStorage.getItem("adminPanelFilters");
    if (!saved) {
      return {
        role: "all",
        status: "all",
        isValid: true,
      };
    }

    const parsed = JSON.parse(saved);
    return validateRoleFilters(parsed);
  } catch (error) {
    console.error("Erro ao carregar filtros de role do localStorage:", error);
    return {
      role: "all",
      status: "all",
      isValid: false,
    };
  }
}

/**
 * Salva filtros de role no localStorage com validação
 */
export function saveRoleFiltersToStorage(filters: {
  role: string;
  status: string;
}): boolean {
  try {
    if (!validateRoleFilter(filters.role) || !validateUserStatusFilter(filters.status)) {
      console.warn("Tentativa de salvar filtros de role inválidos");
      return false;
    }

    localStorage.setItem("adminPanelFilters", JSON.stringify(filters));
    return true;
  } catch (error) {
    console.error("Erro ao salvar filtros de role no localStorage:", error);
    return false;
  }
}
