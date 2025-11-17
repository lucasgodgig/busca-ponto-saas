#!/usr/bin/env node

/**
 * Database Restore Script
 * Restaura dados do banco de dados a partir de um arquivo de backup
 * Uso: node scripts/restore-db.mjs <caminho-do-backup>
 */

import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

// Carregar variáveis de ambiente
const envPath = path.join(projectRoot, ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ Arquivo .env.local não encontrado");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const DATABASE_URL = envContent
  .split("\n")
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.split("=")[1];

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrado em .env.local");
  process.exit(1);
}

const backupFile = process.argv[2];

if (!backupFile) {
  console.error("❌ Uso: node scripts/restore-db.mjs <caminho-do-backup>");
  console.error(
    "\nBackups disponíveis em ./backups/:"
  );
  const backupsDir = path.join(projectRoot, "backups");
  if (fs.existsSync(backupsDir)) {
    fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith("backup-"))
      .sort()
      .reverse()
      .slice(0, 10)
      .forEach((f) => console.error(`  - ${f}`));
  }
  process.exit(1);
}

const fullPath = path.isAbsolute(backupFile)
  ? backupFile
  : path.join(projectRoot, backupFile);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Arquivo de backup não encontrado: ${fullPath}`);
  process.exit(1);
}

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "s" || answer.toLowerCase() === "y");
    });
  });
}

async function restoreDatabase() {
  console.log(`📦 Iniciando restauração do backup...`);
  console.log(`📁 Arquivo: ${fullPath}`);

  // Descomprimir
  console.log(`\n📂 Descomprimindo arquivo...`);
  const tempFile = `${fullPath}.tmp.json`;

  try {
    await pipeline(
      createReadStream(fullPath),
      createGunzip(),
      fs.createWriteStream(tempFile)
    );
    console.log(`✅ Arquivo descomprimido`);

    // Ler dados do backup
    const backupData = JSON.parse(fs.readFileSync(tempFile, "utf-8"));
    console.log(`\n📊 Dados do backup:`);
    console.log(`  Timestamp: ${backupData.timestamp}`);
    console.log(`  Banco: ${backupData.database}`);
    console.log(`  Tabelas: ${Object.keys(backupData.tables).length}`);

    let totalRecords = 0;
    for (const [table, info] of Object.entries(backupData.tables)) {
      console.log(`    - ${table}: ${info.rowCount} registros`);
      totalRecords += info.rowCount;
    }
    console.log(`  Total de registros: ${totalRecords}`);

    // Confirmar restauração
    const confirmed = await askConfirmation(
      `\n⚠️  AVISO: Isso vai SOBRESCREVER os dados atuais do banco!\nDeseja continuar? (s/n): `
    );

    if (!confirmed) {
      console.log("❌ Restauração cancelada pelo usuário");
      fs.unlinkSync(tempFile);
      process.exit(0);
    }

    // Conectar ao banco
    const connection = await mysql.createConnection(DATABASE_URL);
    console.log("\n✅ Conectado ao banco de dados");

    // Restaurar dados
    console.log(`\n📝 Restaurando dados...`);

    for (const [table, info] of Object.entries(backupData.tables)) {
      try {
        if (info.data.length === 0) {
          console.log(`  ✓ ${table}: Tabela vazia (pulada)`);
          continue;
        }

        // Limpar tabela
        await connection.query(`TRUNCATE TABLE \`${table}\``);

        // Inserir dados
        const columns = Object.keys(info.data[0]);
        const placeholders = columns.map(() => "?").join(",");
        const sql = `INSERT INTO \`${table}\` (\`${columns.join("`, `")}\`) VALUES (${placeholders})`;

        for (const row of info.data) {
          const values = columns.map((col) => row[col]);
          await connection.query(sql, values);
        }

        console.log(`  ✓ ${table}: ${info.data.length} registros restaurados`);
      } catch (error) {
        console.warn(
          `  ⚠ ${table}: Erro ao restaurar (${error.message})`
        );
      }
    }

    await connection.end();

    console.log(`\n✅ Restauração concluída com sucesso!`);
    console.log(`📊 Total de registros restaurados: ${totalRecords}`);
  } catch (error) {
    console.error("❌ Erro durante a restauração:", error.message);
    process.exit(1);
  } finally {
    // Limpar arquivo temporário
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

// Executar restauração
restoreDatabase();
