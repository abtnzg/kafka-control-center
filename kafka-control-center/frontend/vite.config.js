import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/auth":     { target: "http://localhost:8080", changeOrigin: true, rewrite: (path) => "/api" + path },
      "/clusters": { target: "http://localhost:8080", changeOrigin: true, rewrite: (path) => "/api" + path },
      "/api":      { target: "http://localhost:8080", changeOrigin: true },
    },
  },
});