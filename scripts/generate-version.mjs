#!/usr/bin/env node

/**
 * Script para gerar arquivo de versão automático
 * Extrai o hash do commit e cria o arquivo version.ts
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

try {
  // Obter hash do commit (primeiros 8 caracteres)
  const commitHash = execSync('git rev-parse --short=8 HEAD', {
    cwd: projectRoot,
    encoding: 'utf-8',
  }).trim();

  // Obter timestamp da build
  const buildTime = new Date().toISOString();

  // Criar conteúdo do arquivo
  const versionContent = `/**
 * Sistema de Versionamento Automático
 * Rastreia versões da aplicação para identificar rollbacks e correções
 * Gerado automaticamente pelo script generate-version.mjs
 */

export const VERSION_INFO = {
  // Hash do commit (primeiros 8 caracteres)
  commitHash: '${commitHash}',
  
  // Timestamp da build (ISO 8601)
  buildTime: '${buildTime}',
  
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
  return \`v\${VERSION_INFO.semver} (\${shortHash}) - \${date}\`;
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
`;

  // Escrever arquivo
  const versionFilePath = resolve(projectRoot, 'shared/version.ts');
  writeFileSync(versionFilePath, versionContent, 'utf-8');

  console.log(`✅ Versão gerada com sucesso!`);
  console.log(`   Commit Hash: ${commitHash}`);
  console.log(`   Build Time: ${buildTime}`);
  console.log(`   Arquivo: ${versionFilePath}`);
} catch (error) {
  console.error('❌ Erro ao gerar versão:', error.message);
  process.exit(1);
}
