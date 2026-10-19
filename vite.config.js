import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Относительные пути для корректной работы на GitHub Pages
  // (проект хостится по пути /Tracker_TEX/, а не в корне)
  base: "./",
  build: {
    target: "es2020",
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
