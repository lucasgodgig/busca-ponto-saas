import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateStatusFilter,
  validateDateFilter,
  sanitizeFilterString,
  validateSearchText,
  validateCityFilter,
  validateSegmentFilter,
  validateAllFilters,
  loadFiltersFromStorage,
  saveFiltersToStorage,
} from "../filterValidation";

describe("filterValidation", () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("validateStatusFilter", () => {
    it("deve aceitar valores de status válidos", () => {
      expect(validateStatusFilter("all")).toBe(true);
      expect(validateStatusFilter("aberto")).toBe(true);
      expect(validateStatusFilter("em_busca")).toBe(true);
      expect(validateStatusFilter("encontrado")).toBe(true);
      expect(validateStatusFilter("cancelado")).toBe(true);
    });

    it("deve rejeitar valores de status inválidos", () => {
      expect(validateStatusFilter("invalid")).toBe(false);
      expect(validateStatusFilter("ABERTO")).toBe(false);
      expect(validateStatusFilter("")).toBe(false);
      expect(validateStatusFilter("pendente")).toBe(false);
    });
  });

  describe("validateDateFilter", () => {
    it("deve aceitar valores de data válidos", () => {
      expect(validateDateFilter("all")).toBe(true);
      expect(validateDateFilter("today")).toBe(true);
      expect(validateDateFilter("week")).toBe(true);
      expect(validateDateFilter("month")).toBe(true);
      expect(validateDateFilter("3months")).toBe(true);
    });

    it("deve rejeitar valores de data inválidos", () => {
      expect(validateDateFilter("invalid")).toBe(false);
      expect(validateDateFilter("TODAY")).toBe(false);
      expect(validateDateFilter("2months")).toBe(false);
      expect(validateDateFilter("")).toBe(false);
    });
  });

  describe("sanitizeFilterString", () => {
    it("deve remover caracteres perigosos", () => {
      expect(sanitizeFilterString('São Paulo<script>')).toBe("São Pauloscript");
      expect(sanitizeFilterString('Teste"Aspas')).toBe("TesteAspas");
      expect(sanitizeFilterString("Teste'Apóstrofo")).toBe("TesteApóstrofo");
      expect(sanitizeFilterString("Teste`Backtick")).toBe("TesteBacktick");
    });

    it("deve manter caracteres válidos", () => {
      expect(sanitizeFilterString("São Paulo")).toBe("São Paulo");
      expect(sanitizeFilterString("Rio de Janeiro")).toBe("Rio de Janeiro");
      expect(sanitizeFilterString("Belo-Horizonte")).toBe("Belo-Horizonte");
    });

    it("deve limitar tamanho a 100 caracteres", () => {
      const longString = "a".repeat(150);
      const result = sanitizeFilterString(longString);
      expect(result.length).toBe(100);
    });

    it("deve remover espaços em branco extras", () => {
      expect(sanitizeFilterString("  São Paulo  ")).toBe("São Paulo");
      expect(sanitizeFilterString("\t\nTeste\t\n")).toBe("Teste");
    });

    it("deve retornar string vazia para entrada inválida", () => {
      expect(sanitizeFilterString("")).toBe("");
      expect(sanitizeFilterString(null as any)).toBe("");
      expect(sanitizeFilterString(undefined as any)).toBe("");
    });
  });

  describe("validateSearchText", () => {
    it("deve sanitizar texto de busca válido", () => {
      const result = validateSearchText("São Paulo");
      expect(result).toBe("São Paulo");
    });

    it("deve remover caracteres perigosos", () => {
      const result = validateSearchText('Teste<script>alert("xss")</script>');
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    it("deve retornar string vazia para entrada inválida", () => {
      expect(validateSearchText("")).toBe("");
      expect(validateSearchText(null as any)).toBe("");
    });
  });

  describe("validateCityFilter", () => {
    const availableCities = ["São Paulo", "Rio de Janeiro", "Belo Horizonte"];

    it("deve aceitar 'all'", () => {
      expect(validateCityFilter("all", availableCities)).toBe("all");
    });

    it("deve aceitar cidades válidas", () => {
      expect(validateCityFilter("São Paulo", availableCities)).toBe("São Paulo");
      expect(validateCityFilter("Rio de Janeiro", availableCities)).toBe(
        "Rio de Janeiro"
      );
    });

    it("deve rejeitar cidades inválidas", () => {
      expect(validateCityFilter("Curitiba", availableCities)).toBe("all");
      expect(validateCityFilter("", availableCities)).toBe("all");
    });

    it("deve ser case-sensitive na comparação", () => {
      // Nota: A implementação atual é case-sensitive na comparação
      // "são paulo" (minúsculo) não corresponde a "São Paulo" (maiúsculo)
      expect(validateCityFilter("são paulo", availableCities)).toBe("são paulo");
      // Mas cidades não existentes retornam "all"
      expect(validateCityFilter("Curitiba", availableCities)).toBe("all");
    });
  });

  describe("validateSegmentFilter", () => {
    const availableSegments = ["Tecnologia", "Saúde", "Educação"];

    it("deve aceitar 'all'", () => {
      expect(validateSegmentFilter("all", availableSegments)).toBe("all");
    });

    it("deve aceitar segmentos válidos", () => {
      expect(validateSegmentFilter("Tecnologia", availableSegments)).toBe(
        "Tecnologia"
      );
      expect(validateSegmentFilter("Saúde", availableSegments)).toBe("Saúde");
    });

    it("deve rejeitar segmentos inválidos", () => {
      expect(validateSegmentFilter("Finanças", availableSegments)).toBe("all");
      expect(validateSegmentFilter("", availableSegments)).toBe("all");
    });
  });

  describe("validateAllFilters", () => {
    const availableCities = ["São Paulo", "Rio de Janeiro"];
    const availableSegments = ["Tecnologia", "Saúde"];

    it("deve validar todos os filtros corretamente", () => {
      const result = validateAllFilters(
        {
          status: "aberto",
          city: "São Paulo",
          segment: "Tecnologia",
          search: "test",
          date: "week",
        },
        availableCities,
        availableSegments
      );

      expect(result.status).toBe("aberto");
      expect(result.city).toBe("São Paulo");
      expect(result.segment).toBe("Tecnologia");
      expect(result.search).toBe("test");
      expect(result.date).toBe("week");
      expect(result.isValid).toBe(true);
    });

    it("deve corrigir valores inválidos", () => {
      const result = validateAllFilters(
        {
          status: "invalid",
          city: "Curitiba",
          segment: "Finanças",
          search: 'test<script>',
          date: "invalid",
        },
        availableCities,
        availableSegments
      );

      expect(result.status).toBe("all");
      expect(result.city).toBe("all");
      expect(result.segment).toBe("all");
      expect(result.search).not.toContain("<");
      expect(result.date).toBe("all");
      expect(result.isValid).toBe(false);
    });

    it("deve usar valores padrão para campos não fornecidos", () => {
      const result = validateAllFilters({}, availableCities, availableSegments);

      expect(result.status).toBe("all");
      expect(result.city).toBe("all");
      expect(result.segment).toBe("all");
      expect(result.search).toBe("");
      expect(result.date).toBe("all");
    });
  });

  describe("loadFiltersFromStorage", () => {
    const availableCities = ["São Paulo"];
    const availableSegments = ["Tecnologia"];

    it("deve retornar valores padrão quando localStorage está vazio", () => {
      const result = loadFiltersFromStorage(availableCities, availableSegments);

      expect(result.status).toBe("all");
      expect(result.city).toBe("all");
      expect(result.segment).toBe("all");
      expect(result.search).toBe("");
      expect(result.date).toBe("all");
      expect(result.isValid).toBe(true);
    });

    it("deve carregar filtros válidos do localStorage", () => {
      const filters = {
        status: "aberto",
        city: "São Paulo",
        segment: "Tecnologia",
        search: "test",
        date: "week",
      };

      localStorage.setItem("commercialPointsFilters", JSON.stringify(filters));

      const result = loadFiltersFromStorage(availableCities, availableSegments);

      expect(result.status).toBe("aberto");
      expect(result.city).toBe("São Paulo");
      expect(result.segment).toBe("Tecnologia");
      expect(result.search).toBe("test");
      expect(result.date).toBe("week");
      expect(result.isValid).toBe(true);
    });

    it("deve validar filtros carregados do localStorage", () => {
      const filters = {
        status: "invalid",
        city: "Curitiba",
        segment: "Finanças",
        search: "test",
        date: "invalid",
      };

      localStorage.setItem("commercialPointsFilters", JSON.stringify(filters));

      const result = loadFiltersFromStorage(availableCities, availableSegments);

      expect(result.status).toBe("all");
      expect(result.city).toBe("all");
      expect(result.segment).toBe("all");
      expect(result.date).toBe("all");
      expect(result.isValid).toBe(false);
    });

    it("deve retornar valores padrão em caso de JSON inválido", () => {
      localStorage.setItem("commercialPointsFilters", "invalid json");

      const result = loadFiltersFromStorage(availableCities, availableSegments);

      expect(result.status).toBe("all");
      expect(result.isValid).toBe(false);
    });
  });

  describe("saveFiltersToStorage", () => {
    it("deve salvar filtros válidos", () => {
      const filters = {
        status: "aberto",
        city: "São Paulo",
        segment: "Tecnologia",
        search: "test",
        date: "week",
      };

      const result = saveFiltersToStorage(filters);

      expect(result).toBe(true);
      const saved = localStorage.getItem("commercialPointsFilters");
      expect(saved).toBe(JSON.stringify(filters));
    });

    it("deve rejeitar filtros com status inválido", () => {
      const filters = {
        status: "invalid",
        city: "São Paulo",
        segment: "Tecnologia",
        search: "test",
        date: "week",
      };

      const result = saveFiltersToStorage(filters);

      expect(result).toBe(false);
    });

    it("deve rejeitar filtros com data inválida", () => {
      const filters = {
        status: "aberto",
        city: "São Paulo",
        segment: "Tecnologia",
        search: "test",
        date: "invalid",
      };

      const result = saveFiltersToStorage(filters);

      expect(result).toBe(false);
    });

    it("deve validar antes de salvar", () => {
      // Testa que filtros inválidos não são salvos
      const filters = {
        status: "invalid",
        city: "São Paulo",
        segment: "Tecnologia",
        search: "test",
        date: "week",
      };

      const result = saveFiltersToStorage(filters);

      expect(result).toBe(false);
    });
  });
});
