#!/usr/bin/env node

/**
 * Database Backup Script
 * Exporta dados do banco de dados para arquivos JSON comprimidos
 * Uso: node scripts/backup-db.mjs
 */

import fs from "fs";
import path from "path";
import { createWriteStream, createReadStream } from "fs";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

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

// Criar diretório de backups
const backupsDir = path.join(projectRoot, "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

async function getAllTables(connection) {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
  );
  return tables.map((t) => t.TABLE_NAME);
}

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupsDir, `backup-${timestamp}.json`);
  const backupGzFile = `${backupFile}.gz`;

  console.log(`📦 Iniciando backup do banco de dados...`);
  console.log(`📅 Timestamp: ${timestamp}`);

  let connection;

  try {
    // Conectar ao banco
    connection = await mysql.createConnection(DATABASE_URL);
    console.log("✅ Conectado ao banco de dados");

    // Obter todas as tabelas
    const tables = await getAllTables(connection);
    console.log(`📊 Encontradas ${tables.length} tabelas`);

    const backup = {
      timestamp: new Date().toISOString(),
      database: DATABASE_URL.split("/").pop(),
      tables: {},
    };

    // Exportar dados de cada tabela
    for (const table of tables) {
      try {
        const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
        backup.tables[table] = {
          rowCount: rows.length,
          data: rows,
        };
        console.log(`  ✓ ${table}: ${rows.length} registros`);
      } catch (error) {
        console.warn(`  ⚠ ${table}: Erro ao exportar (${error.message})`);
        backup.tables[table] = {
          rowCount: 0,
          data: [],
          error: error.message,
        };
      }
    }

    // Salvar JSON
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n💾 Backup JSON salvo: ${backupFile}`);

    // Comprimir com gzip
    await pipeline(
      createReadStream(backupFile),
      createGzip(),
      createWriteStream(backupGzFile)
    );
    console.log(`📦 Backup comprimido: ${backupGzFile}`);

    // Remover JSON descomprimido
    fs.unlinkSync(backupFile);

    // Limpeza: manter apenas os últimos 30 backups
    const backupFiles = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".gz"))
      .sort()
      .reverse();

    if (backupFiles.length > 30) {
      console.log(
        `\n🧹 Limpando backups antigos (mantendo 30 mais recentes)...`
      );
      const filesToDelete = backupFiles.slice(30);
      for (const file of filesToDelete) {
        fs.unlinkSync(path.join(backupsDir, file));
        console.log(`  🗑 Removido: ${file}`);
      }
    }

    console.log(`\n✅ Backup concluído com sucesso!`);
    console.log(`📍 Localização: ${backupGzFile}`);
    console.log(
      `📊 Resumo: ${Object.values(backup.tables).reduce((sum, t) => sum + t.rowCount, 0)} registros totais`
    );

    return backupGzFile;
  } catch (error) {
    console.error("❌ Erro durante o backup:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar backup
backupDatabase();
