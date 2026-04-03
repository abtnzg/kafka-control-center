// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true,
//     port: 5173,
//     proxy: {
//       "/auth":      { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
//       "/clusters":  { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
//       "/ai":        { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
//       "/streaming": { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
//     },
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/auth":      { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
      "/clusters":  { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
      "/ai":        { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
      "/streaming": { target: "http://localhost:8080", changeOrigin: true, rewrite: p => "/api" + p },
    },
  },
});
