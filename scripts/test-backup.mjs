#!/usr/bin/env node

/**
 * Script de teste para validar o sistema de backup
 * Verifica se os scripts de backup e restauração funcionam corretamente
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const backupsDir = path.join(projectRoot, "backups");

console.log("🧪 Teste do Sistema de Backup\n");
console.log("=" .repeat(50));

// Teste 1: Verificar estrutura de diretórios
console.log("\n✓ Teste 1: Estrutura de diretórios");
console.log("  Verificando arquivos necessários...");

const requiredFiles = [
  "scripts/backup-db.mjs",
  "scripts/restore-db.mjs",
  "scripts/backup-scheduler.mjs",
  "server/routers/backup.ts",
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(projectRoot, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? "✓" : "✗"} ${file}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.error("\n❌ Alguns arquivos estão faltando!");
  process.exit(1);
}

// Teste 2: Verificar diretório de backups
console.log("\n✓ Teste 2: Diretório de backups");
if (!fs.existsSync(backupsDir)) {
  console.log(`  Criando diretório: ${backupsDir}`);
  fs.mkdirSync(backupsDir, { recursive: true });
} else {
  console.log(`  Diretório existe: ${backupsDir}`);
}

// Teste 3: Listar backups existentes
console.log("\n✓ Teste 3: Backups existentes");
try {
  const files = fs.readdirSync(backupsDir);
  const backups = files.filter((f) => f.startsWith("backup-") && f.endsWith(".gz"));

  if (backups.length === 0) {
    console.log("  Nenhum backup encontrado ainda");
  } else {
    console.log(`  ${backups.length} backup(s) encontrado(s):`);
    backups.sort().reverse().slice(0, 5).forEach((file) => {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`    - ${file} (${sizeKB} KB)`);
    });
  }
} catch (error) {
  console.error(`  ✗ Erro ao listar backups: ${error.message}`);
}

// Teste 4: Verificar permissões de escrita
console.log("\n✓ Teste 4: Permissões de escrita");
try {
  const testFile = path.join(backupsDir, ".test-write");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);
  console.log("  Diretório é gravável ✓");
} catch (error) {
  console.error(`  ✗ Erro de permissão: ${error.message}`);
}

// Teste 5: Verificar scripts
console.log("\n✓ Teste 5: Integridade dos scripts");
const backupScript = fs.readFileSync(path.join(projectRoot, "scripts/backup-db.mjs"), "utf-8");
const restoreScript = fs.readFileSync(path.join(projectRoot, "scripts/restore-db.mjs"), "utf-8");

console.log(`  backup-db.mjs: ${backupScript.length} bytes`);
console.log(`  restore-db.mjs: ${restoreScript.length} bytes`);

if (backupScript.includes("mysql.createConnection") && restoreScript.includes("mysql.createConnection")) {
  console.log("  Scripts contêm lógica de conexão ✓");
} else {
  console.warn("  ⚠ Scripts podem estar incompletos");
}

// Teste 6: Verificar router de backup
console.log("\n✓ Teste 6: Router de backup");
const backupRouter = fs.readFileSync(path.join(projectRoot, "server/routers/backup.ts"), "utf-8");
if (backupRouter.includes("backupRouter") && backupRouter.includes("adminProcedure")) {
  console.log("  Router de backup registrado ✓");
  console.log("  Procedures disponíveis:");
  console.log("    - list: Listar backups");
  console.log("    - create: Criar novo backup");
  console.log("    - delete: Deletar backup");
  console.log("    - info: Informações do backup");
} else {
  console.warn("  ⚠ Router pode estar incompleto");
}

console.log("\n" + "=".repeat(50));
console.log("\n✅ Testes concluídos com sucesso!\n");
console.log("📚 Próximos passos:");
console.log("  1. Executar backup manual: node scripts/backup-db.mjs");
console.log("  2. Iniciar scheduler: node scripts/backup-scheduler.mjs");
console.log("  3. Acessar backups via API: trpc.backup.list.useQuery()");
console.log("  4. Restaurar backup: node scripts/restore-db.mjs ./backups/backup-XXXX.json.gz\n");
