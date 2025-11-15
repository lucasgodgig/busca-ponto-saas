import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

// Detectar ambiente e configurar HMR apropriadamente
const getHmrConfig = () => {
  // Em produção ou quando NODE_ENV nao eh development, desabilitar HMR
  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }
  
  // Detectar se estamos em ambiente de sandbox/producao baseado no hostname
  const isProduction = typeof window !== "undefined" && 
    (window.location.hostname.includes(".manusvm.computer") ||
     window.location.hostname.includes(".manus.computer") ||
     window.location.hostname.includes(".manus-asia.computer") ||
     window.location.hostname.includes(".manuscomputer.ai"));
  
  if (isProduction) {
    // Em produção, desabilitar HMR completamente
    return undefined;
  }
  
  // Em desenvolvimento local
  return {
    protocol: "ws",
    host: "localhost",
    port: 5173,
  };
};

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: false, // Desabilitar HMR completamente em produção
    middlewareMode: true,
  },
});
