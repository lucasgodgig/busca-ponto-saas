import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "../..");
const backupsDir = path.join(projectRoot, "backups");

async function ensureBackupsDir() {
  try {
    await fs.mkdir(backupsDir, { recursive: true });
  } catch (error) {
    console.error("Erro ao criar diretório de backups:", error);
  }
}

function runBackupScript(): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const backup = spawn("node", [path.join(projectRoot, "scripts/backup-db.mjs")], {
      cwd: projectRoot,
    });

    let output = "";
    let errorOutput = "";

    backup.stdout?.on("data", (data) => {
      output += data.toString();
    });

    backup.stderr?.on("data", (data) => {
      errorOutput += data.toString();
    });

    backup.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: output || "Backup realizado com sucesso",
        });
      } else {
        resolve({
          success: false,
          message: errorOutput || `Backup falhou com código ${code}`,
        });
      }
    });
  });
}

export const backupRouter = router({
  /**
   * Lista todos os backups disponíveis
   */
  list: adminProcedure.query(async () => {
    await ensureBackupsDir();

    try {
      const files = await fs.readdir(backupsDir);
      const backups = files
        .filter((f) => f.startsWith("backup-") && f.endsWith(".gz"))
        .sort()
        .reverse()
        .map((filename) => {
          const timestamp = filename
            .replace("backup-", "")
            .replace(".json.gz", "")
            .replace(/(-\d{2}){3}$/, (match) => match.replace(/-/g, ":"));

          return {
            filename,
            timestamp: new Date(timestamp.replace(/-/g, "-")).toISOString(),
            path: path.join(backupsDir, filename),
          };
        });

      return backups;
    } catch (error) {
      console.error("Erro ao listar backups:", error);
      return [];
    }
  }),

  /**
   * Cria um novo backup imediatamente
   */
  create: adminProcedure.mutation(async () => {
    await ensureBackupsDir();

    const result = await runBackupScript();

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.message,
      });
    }

    return {
      success: true,
      message: result.message,
    };
  }),

  /**
   * Deleta um backup específico
   */
  delete: adminProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      // Validar nome do arquivo para evitar path traversal
      if (input.filename.includes("..") || input.filename.includes("/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nome de arquivo inválido",
        });
      }

      const filePath = path.join(backupsDir, input.filename);

      try {
        await fs.unlink(filePath);
        return { success: true, message: "Backup deletado com sucesso" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao deletar backup",
        });
      }
    }),

  /**
   * Obtém informações sobre um backup específico
   */
  info: adminProcedure
    .input(z.object({ filename: z.string() }))
    .query(async ({ input }) => {
      if (input.filename.includes("..") || input.filename.includes("/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nome de arquivo inválido",
        });
      }

      const filePath = path.join(backupsDir, input.filename);

      try {
        const stats = await fs.stat(filePath);
        return {
          filename: input.filename,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Backup não encontrado",
        });
      }
    }),
});
