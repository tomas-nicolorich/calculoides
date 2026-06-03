/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");

  return {
    envDir: "../",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      env: {
        VITE_SUPABASE_URL:
          env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
        VITE_SUPABASE_ANON_KEY:
          env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key",
      },
    },
    server: {
      proxy:
        env.CALC_ENVIRONMENT === "local" ||
        env.CALC_ENVIRONMENT === "test-local"
          ? {
              "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
              },
            }
          : undefined,
    },
  };
});
