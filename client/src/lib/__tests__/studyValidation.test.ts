import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateStudyStatus,
  validateStudyPriority,
  validateRequestStatus,
  validateStudyStatusFilter,
  validateRequestStatusFilter,
  getStudyStatusLabel,
  getPriorityLabel,
  getRequestStatusLabel,
  validateStudyFilters,
  loadStudyFiltersFromStorage,
  saveStudyFiltersToStorage,
  validateStatusForUpdate,
  validatePriorityForUpdate,
  VALID_STUDY_STATUS,
  VALID_STUDY_PRIORITY,
  VALID_REQUEST_STATUS,
} from "../studyValidation";

describe("studyValidation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("validateStudyStatus", () => {
    it("deve aceitar status de estudo válidos", () => {
      expect(validateStudyStatus("pendente")).toBe(true);
      expect(validateStudyStatus("em_analise")).toBe(true);
      expect(validateStudyStatus("concluido")).toBe(true);
      expect(validateStudyStatus("cancelado")).toBe(true);
    });

    it("deve rejeitar status inválidos", () => {
      expect(validateStudyStatus("invalid")).toBe(false);
      expect(validateStudyStatus("PENDENTE")).toBe(false);
      expect(validateStudyStatus("")).toBe(false);
    });
  });

  describe("validateStudyPriority", () => {
    it("deve aceitar prioridades válidas", () => {
      expect(validateStudyPriority("baixa")).toBe(true);
      expect(validateStudyPriority("media")).toBe(true);
      expect(validateStudyPriority("alta")).toBe(true);
    });

    it("deve rejeitar prioridades inválidas", () => {
      expect(validateStudyPriority("invalid")).toBe(false);
      expect(validateStudyPriority("ALTA")).toBe(false);
      expect(validateStudyPriority("")).toBe(false);
    });
  });

  describe("validateRequestStatus", () => {
    it("deve aceitar status de requisição válidos", () => {
      expect(validateRequestStatus("aberto")).toBe(true);
      expect(validateRequestStatus("em_busca")).toBe(true);
      expect(validateRequestStatus("encontrado")).toBe(true);
      expect(validateRequestStatus("cancelado")).toBe(true);
    });

    it("deve rejeitar status inválidos", () => {
      expect(validateRequestStatus("invalid")).toBe(false);
      expect(validateRequestStatus("ABERTO")).toBe(false);
      expect(validateRequestStatus("")).toBe(false);
    });
  });

  describe("validateStudyStatusFilter", () => {
    it("deve aceitar 'all'", () => {
      expect(validateStudyStatusFilter("all")).toBe(true);
    });

    it("deve aceitar status válidos", () => {
      expect(validateStudyStatusFilter("pendente")).toBe(true);
      expect(validateStudyStatusFilter("concluido")).toBe(true);
    });

    it("deve rejeitar valores inválidos", () => {
      expect(validateStudyStatusFilter("invalid")).toBe(false);
      expect(validateStudyStatusFilter("")).toBe(false);
    });
  });

  describe("validateRequestStatusFilter", () => {
    it("deve aceitar 'all'", () => {
      expect(validateRequestStatusFilter("all")).toBe(true);
    });

    it("deve aceitar status válidos", () => {
      expect(validateRequestStatusFilter("aberto")).toBe(true);
      expect(validateRequestStatusFilter("encontrado")).toBe(true);
    });

    it("deve rejeitar valores inválidos", () => {
      expect(validateRequestStatusFilter("invalid")).toBe(false);
      expect(validateRequestStatusFilter("")).toBe(false);
    });
  });

  describe("getStudyStatusLabel", () => {
    it("deve retornar labels corretos em português", () => {
      expect(getStudyStatusLabel("pendente")).toBe("Pendente");
      expect(getStudyStatusLabel("em_analise")).toBe("Em Análise");
      expect(getStudyStatusLabel("concluido")).toBe("Concluído");
      expect(getStudyStatusLabel("cancelado")).toBe("Cancelado");
      expect(getStudyStatusLabel("all")).toBe("Todos");
    });

    it("deve retornar o valor original para status desconhecidos", () => {
      expect(getStudyStatusLabel("unknown")).toBe("unknown");
    });
  });

  describe("getPriorityLabel", () => {
    it("deve retornar labels corretos em português", () => {
      expect(getPriorityLabel("baixa")).toBe("Baixa");
      expect(getPriorityLabel("media")).toBe("Média");
      expect(getPriorityLabel("alta")).toBe("Alta");
    });

    it("deve retornar o valor original para prioridades desconhecidas", () => {
      expect(getPriorityLabel("unknown")).toBe("unknown");
    });
  });

  describe("getRequestStatusLabel", () => {
    it("deve retornar labels corretos em português", () => {
      expect(getRequestStatusLabel("aberto")).toBe("Aberto");
      expect(getRequestStatusLabel("em_busca")).toBe("Em Busca");
      expect(getRequestStatusLabel("encontrado")).toBe("Encontrado");
      expect(getRequestStatusLabel("cancelado")).toBe("Cancelado");
      expect(getRequestStatusLabel("all")).toBe("Todos");
    });

    it("deve retornar o valor original para status desconhecidos", () => {
      expect(getRequestStatusLabel("unknown")).toBe("unknown");
    });
  });

  describe("validateStudyFilters", () => {
    it("deve validar filtros corretamente", () => {
      const result = validateStudyFilters({
        status: "pendente",
      });

      expect(result.status).toBe("pendente");
      expect(result.isValid).toBe(true);
    });

    it("deve corrigir valores inválidos", () => {
      const result = validateStudyFilters({
        status: "invalid",
      });

      expect(result.status).toBe("all");
      expect(result.isValid).toBe(false);
    });

    it("deve usar valor padrão para campo não fornecido", () => {
      const result = validateStudyFilters({});

      expect(result.status).toBe("all");
    });
  });

  describe("loadStudyFiltersFromStorage", () => {
    it("deve retornar valores padrão quando localStorage está vazio", () => {
      const result = loadStudyFiltersFromStorage();

      expect(result.status).toBe("all");
      expect(result.isValid).toBe(true);
    });

    it("deve carregar filtros válidos do localStorage", () => {
      const filters = {
        status: "pendente",
      };

      localStorage.setItem("adminStudyRequestsFilters", JSON.stringify(filters));

      const result = loadStudyFiltersFromStorage();

      expect(result.status).toBe("pendente");
      expect(result.isValid).toBe(true);
    });

    it("deve validar filtros carregados do localStorage", () => {
      const filters = {
        status: "invalid",
      };

      localStorage.setItem("adminStudyRequestsFilters", JSON.stringify(filters));

      const result = loadStudyFiltersFromStorage();

      expect(result.status).toBe("all");
      expect(result.isValid).toBe(false);
    });

    it("deve retornar valores padrão em caso de JSON inválido", () => {
      localStorage.setItem("adminStudyRequestsFilters", "invalid json");

      const result = loadStudyFiltersFromStorage();

      expect(result.status).toBe("all");
      expect(result.isValid).toBe(false);
    });
  });

  describe("saveStudyFiltersToStorage", () => {
    it("deve salvar filtros válidos", () => {
      const filters = {
        status: "pendente",
      };

      const result = saveStudyFiltersToStorage(filters);

      expect(result).toBe(true);
      const saved = localStorage.getItem("adminStudyRequestsFilters");
      expect(saved).toBe(JSON.stringify(filters));
    });

    it("deve rejeitar filtros com status inválido", () => {
      const filters = {
        status: "invalid",
      };

      const result = saveStudyFiltersToStorage(filters);

      expect(result).toBe(false);
    });

    it("deve validar antes de salvar", () => {
      const filters = {
        status: "invalid",
      };

      const result = saveStudyFiltersToStorage(filters);

      expect(result).toBe(false);
    });
  });

  describe("validateStatusForUpdate", () => {
    it("deve aceitar status válidos", () => {
      expect(validateStatusForUpdate("pendente")).toBe("pendente");
      expect(validateStatusForUpdate("concluido")).toBe("concluido");
    });

    it("deve retornar null para status inválidos", () => {
      expect(validateStatusForUpdate("invalid")).toBeNull();
      expect(validateStatusForUpdate("")).toBeNull();
    });
  });

  describe("validatePriorityForUpdate", () => {
    it("deve aceitar prioridades válidas", () => {
      expect(validatePriorityForUpdate("baixa")).toBe("baixa");
      expect(validatePriorityForUpdate("alta")).toBe("alta");
    });

    it("deve retornar null para prioridades inválidas", () => {
      expect(validatePriorityForUpdate("invalid")).toBeNull();
      expect(validatePriorityForUpdate("")).toBeNull();
    });
  });

  describe("VALID_STUDY_STATUS constant", () => {
    it("deve conter todos os status esperados", () => {
      expect(VALID_STUDY_STATUS).toContain("pendente");
      expect(VALID_STUDY_STATUS).toContain("em_analise");
      expect(VALID_STUDY_STATUS).toContain("concluido");
      expect(VALID_STUDY_STATUS).toContain("cancelado");
    });
  });

  describe("VALID_STUDY_PRIORITY constant", () => {
    it("deve conter todas as prioridades esperadas", () => {
      expect(VALID_STUDY_PRIORITY).toContain("baixa");
      expect(VALID_STUDY_PRIORITY).toContain("media");
      expect(VALID_STUDY_PRIORITY).toContain("alta");
    });
  });

  describe("VALID_REQUEST_STATUS constant", () => {
    it("deve conter todos os status esperados", () => {
      expect(VALID_REQUEST_STATUS).toContain("aberto");
      expect(VALID_REQUEST_STATUS).toContain("em_busca");
      expect(VALID_REQUEST_STATUS).toContain("encontrado");
      expect(VALID_REQUEST_STATUS).toContain("cancelado");
    });
  });
});
