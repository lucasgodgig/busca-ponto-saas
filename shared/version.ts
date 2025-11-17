/**
 * Sistema de Versionamento Automático
 * Rastreia versões da aplicação para identificar rollbacks e correções
 * Gerado automaticamente pelo script generate-version.mjs
 */

export const VERSION_INFO = {
  // Hash do commit (primeiros 8 caracteres)
  commitHash: '4b788ad6',
  
  // Timestamp da build (ISO 8601)
  buildTime: '2025-11-17T03:17:44.587Z',
  
  // Versão semântica (major.minor.patch)
  semver: '1.0.0',
  
  // Ambiente (development, staging, production)
  environment: process.env.NODE_ENV || 'development',
  
  // Descrição da versão
  description: 'Busca Ponto SaaS - Plataforma de Indicação de Pontos Comerciais',
};

/**
 * Formata a versão para exibição
 */
export function getVersionString(): string {
  const shortHash = VERSION_INFO.commitHash.substring(0, 8);
  const date = new Date(VERSION_INFO.buildTime).toLocaleDateString('pt-BR');
  return `v${VERSION_INFO.semver} (${shortHash}) - ${date}`;
}

/**
 * Retorna informações completas de versão
 */
export function getVersionInfo() {
  return {
    version: getVersionString(),
    commitHash: VERSION_INFO.commitHash,
    buildTime: VERSION_INFO.buildTime,
    semver: VERSION_INFO.semver,
    environment: VERSION_INFO.environment,
  };
}
