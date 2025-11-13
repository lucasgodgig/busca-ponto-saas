/**
 * Rate Limiter - Middleware para controlar requisições por usuário e tenant
 * Implementa rate limiting em memória com limpeza periódica
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // em milissegundos
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30, // 30 requisições
  windowMs: 60 * 1000, // por minuto
};

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Limpar entradas expiradas a cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Verifica se uma requisição deve ser permitida
   * @param key - Identificador único (userId, tenantId, IP, etc)
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // Se não existe entrada ou expirou, criar nova
    if (!entry || now >= entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(key, newEntry);
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Se ainda está dentro da janela
    if (entry.count < this.config.maxRequests) {
      entry.count++;
      return {
        allowed: true,
        remaining: this.config.maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    }

    // Limite atingido
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Limpa entradas expiradas do store
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reseta o limite para uma chave específica
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Reseta todos os limites
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Retorna estatísticas do rate limiter
   */
  getStats(): { totalKeys: number; config: RateLimitConfig } {
    return {
      totalKeys: this.store.size,
      config: this.config,
    };
  }
}

// Exportar instâncias pré-configuradas para diferentes endpoints
export const spaceApiLimiter = new RateLimiter({
  maxRequests: 20, // 20 requisições por minuto para Space API
  windowMs: 60 * 1000,
});

export const generalLimiter = new RateLimiter({
  maxRequests: 100, // 100 requisições por minuto para endpoints gerais
  windowMs: 60 * 1000,
});

export const authLimiter = new RateLimiter({
  maxRequests: 5, // 5 tentativas por minuto para auth
  windowMs: 60 * 1000,
});

export default RateLimiter;

