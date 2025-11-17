#!/usr/bin/env node

/**
 * Database Backup Scheduler
 * Agenda backups automáticos do banco de dados
 * Executa diariamente às 02:00 AM (UTC)
 * Uso: node scripts/backup-scheduler.mjs
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

// Função para executar backup
function runBackup() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🔄 Iniciando backup automático...`);

  return new Promise((resolve) => {
    const backup = spawn("node", [path.join(__dirname, "backup-db.mjs")], {
      cwd: projectRoot,
      stdio: "inherit",
    });

    backup.on("close", (code) => {
      if (code === 0) {
        console.log(
          `[${new Date().toISOString()}] ✅ Backup automático concluído`
        );
      } else {
        console.error(
          `[${new Date().toISOString()}] ❌ Backup falhou com código ${code}`
        );
      }
      resolve(code);
    });
  });
}

// Função para calcular tempo até próximo backup
function getTimeUntilNextBackup() {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(2, 0, 0, 0); // 02:00 AM UTC

  // Se já passou das 02:00 hoje, agendar para amanhã
  if (now > next) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

async function startScheduler() {
  console.log("🕐 Backup Scheduler iniciado");
  console.log("📅 Agendamento: Diariamente às 02:00 AM (UTC)");
  console.log("📁 Localização dos backups: ./backups/");
  console.log("📊 Retenção: Últimos 30 backups\n");

  // Executar backup imediatamente na primeira vez
  console.log("⏰ Executando backup inicial...");
  await runBackup();

  // Agendar backups diários
  setInterval(async () => {
    await runBackup();
  }, 24 * 60 * 60 * 1000); // A cada 24 horas

  // Mostrar próximo backup agendado
  const timeUntilNext = getTimeUntilNextBackup();
  const nextBackup = new Date(Date.now() + timeUntilNext);
  console.log(
    `\n⏳ Próximo backup agendado para: ${nextBackup.toISOString()}`
  );
}

// Tratamento de sinais para encerramento gracioso
process.on("SIGINT", () => {
  console.log("\n\n👋 Scheduler encerrado pelo usuário");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Scheduler encerrado");
  process.exit(0);
});

// Iniciar scheduler
startScheduler().catch((error) => {
  console.error("❌ Erro ao iniciar scheduler:", error);
  process.exit(1);
});
