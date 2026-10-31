import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // o app inteiro fica num arquivo só (~500 kB); acima de 800 kB vale dividir
  build: { chunkSizeWarningLimit: 800 },
});
