import { defineConfig } from "vite";
export default defineConfig({
  root: "src",
  build: {
    outDir: "../public",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin:   "src/admin/index.html",
        display: "src/display/index.html",
      },
    },
  },
});
