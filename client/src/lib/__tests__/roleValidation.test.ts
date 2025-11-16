import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateRole,
  validateUserStatus,
  validateRoleFilter,
  validateUserStatusFilter,
  getRoleLabel,
  getUserStatusLabel,
  validateRoleFilters,
  loadRoleFiltersFromStorage,
  saveRoleFiltersToStorage,
  VALID_ROLES,
  VALID_USER_STATUS,
} from "../roleValidation";

describe("roleValidation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("validateRole", () => {
    it("deve aceitar roles válidas", () => {
      expect(validateRole("admin_bp")).toBe(true);
      expect(validateRole("tenant_admin")).toBe(true);
      expect(validateRole("analyst_bp")).toBe(true);
      expect(validateRole("member")).toBe(true);
    });

    it("deve rejeitar roles inválidas", () => {
      expect(validateRole("invalid")).toBe(false);
      expect(validateRole("admin")).toBe(false);
      expect(validateRole("ADMIN_BP")).toBe(false);
      expect(validateRole("")).toBe(false);
    });
  });

  describe("validateUserStatus", () => {
    it("deve aceitar status válidos", () => {
      expect(validateUserStatus("active")).toBe(true);
      expect(validateUserStatus("inactive")).toBe(true);
    });

    it("deve rejeitar status inválidos", () => {
      expect(validateUserStatus("invalid")).toBe(false);
      expect(validateUserStatus("ACTIVE")).toBe(false);
      expect(validateUserStatus("banned")).toBe(false);
      expect(validateUserStatus("")).toBe(false);
    });
  });

  describe("validateRoleFilter", () => {
    it("deve aceitar 'all'", () => {
      expect(validateRoleFilter("all")).toBe(true);
    });

    it("deve aceitar roles válidas", () => {
      expect(validateRoleFilter("admin_bp")).toBe(true);
      expect(validateRoleFilter("member")).toBe(true);
    });

    it("deve rejeitar valores inválidos", () => {
      expect(validateRoleFilter("invalid")).toBe(false);
      expect(validateRoleFilter("")).toBe(false);
    });
  });

  describe("validateUserStatusFilter", () => {
    it("deve aceitar 'all'", () => {
      expect(validateUserStatusFilter("all")).toBe(true);
    });

    it("deve aceitar status válidos", () => {
      expect(validateUserStatusFilter("active")).toBe(true);
      expect(validateUserStatusFilter("inactive")).toBe(true);
    });

    it("deve rejeitar valores inválidos", () => {
      expect(validateUserStatusFilter("invalid")).toBe(false);
      expect(validateUserStatusFilter("")).toBe(false);
    });
  });

  describe("getRoleLabel", () => {
    it("deve retornar labels corretos em português", () => {
      expect(getRoleLabel("admin_bp")).toBe("Admin BP");
      expect(getRoleLabel("tenant_admin")).toBe("Tenant Admin");
      expect(getRoleLabel("analyst_bp")).toBe("Analyst BP");
      expect(getRoleLabel("member")).toBe("Member");
      expect(getRoleLabel("all")).toBe("Todas as roles");
    });

    it("deve retornar o valor original para roles desconhecidas", () => {
      expect(getRoleLabel("unknown")).toBe("unknown");
    });
  });

  describe("getUserStatusLabel", () => {
    it("deve retornar labels corretos em português", () => {
      expect(getUserStatusLabel("active")).toBe("Ativo");
      expect(getUserStatusLabel("inactive")).toBe("Inativo");
      expect(getUserStatusLabel("all")).toBe("Todos os status");
    });

    it("deve retornar o valor original para status desconhecidos", () => {
      expect(getUserStatusLabel("unknown")).toBe("unknown");
    });
  });

  describe("validateRoleFilters", () => {
    it("deve validar todos os filtros corretamente", () => {
      const result = validateRoleFilters({
        role: "admin_bp",
        status: "active",
      });

      expect(result.role).toBe("admin_bp");
      expect(result.status).toBe("active");
      expect(result.isValid).toBe(true);
    });

    it("deve corrigir valores inválidos", () => {
      const result = validateRoleFilters({
        role: "invalid",
        status: "invalid",
      });

      expect(result.role).toBe("all");
      expect(result.status).toBe("all");
      expect(result.isValid).toBe(false);
    });

    it("deve usar valores padrão para campos não fornecidos", () => {
      const result = validateRoleFilters({});

      expect(result.role).toBe("all");
      expect(result.status).toBe("all");
    });
  });

  describe("loadRoleFiltersFromStorage", () => {
    it("deve retornar valores padrão quando localStorage está vazio", () => {
      const result = loadRoleFiltersFromStorage();

      expect(result.role).toBe("all");
      expect(result.status).toBe("all");
      expect(result.isValid).toBe(true);
    });

    it("deve carregar filtros válidos do localStorage", () => {
      const filters = {
        role: "admin_bp",
        status: "active",
      };

      localStorage.setItem("adminPanelFilters", JSON.stringify(filters));

      const result = loadRoleFiltersFromStorage();

      expect(result.role).toBe("admin_bp");
      expect(result.status).toBe("active");
      expect(result.isValid).toBe(true);
    });

    it("deve validar filtros carregados do localStorage", () => {
      const filters = {
        role: "invalid",
        status: "invalid",
      };

      localStorage.setItem("adminPanelFilters", JSON.stringify(filters));

      const result = loadRoleFiltersFromStorage();

      expect(result.role).toBe("all");
      expect(result.status).toBe("all");
      expect(result.isValid).toBe(false);
    });

    it("deve retornar valores padrão em caso de JSON inválido", () => {
      localStorage.setItem("adminPanelFilters", "invalid json");

      const result = loadRoleFiltersFromStorage();

      expect(result.role).toBe("all");
      expect(result.isValid).toBe(false);
    });
  });

  describe("saveRoleFiltersToStorage", () => {
    it("deve salvar filtros válidos", () => {
      const filters = {
        role: "admin_bp",
        status: "active",
      };

      const result = saveRoleFiltersToStorage(filters);

      expect(result).toBe(true);
      const saved = localStorage.getItem("adminPanelFilters");
      expect(saved).toBe(JSON.stringify(filters));
    });

    it("deve rejeitar filtros com role inválida", () => {
      const filters = {
        role: "invalid",
        status: "active",
      };

      const result = saveRoleFiltersToStorage(filters);

      expect(result).toBe(false);
    });

    it("deve rejeitar filtros com status inválido", () => {
      const filters = {
        role: "admin_bp",
        status: "invalid",
      };

      const result = saveRoleFiltersToStorage(filters);

      expect(result).toBe(false);
    });

    it("deve validar antes de salvar", () => {
      const filters = {
        role: "invalid",
        status: "active",
      };

      const result = saveRoleFiltersToStorage(filters);

      expect(result).toBe(false);
    });
  });

  describe("VALID_ROLES constant", () => {
    it("deve conter todas as roles esperadas", () => {
      expect(VALID_ROLES).toContain("admin_bp");
      expect(VALID_ROLES).toContain("tenant_admin");
      expect(VALID_ROLES).toContain("analyst_bp");
      expect(VALID_ROLES).toContain("member");
    });
  });

  describe("VALID_USER_STATUS constant", () => {
    it("deve conter todos os status esperados", () => {
      expect(VALID_USER_STATUS).toContain("active");
      expect(VALID_USER_STATUS).toContain("inactive");
    });
  });
});
