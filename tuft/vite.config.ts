import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from "vite-plugin-singlefile"

// `vite build --mode single` produces one self-contained HTML file (used for the claude.ai preview).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
  build: mode === "single" ? { outDir: "dist-single", chunkSizeWarningLimit: 4000 } : { chunkSizeWarningLimit: 2000 },
}))
