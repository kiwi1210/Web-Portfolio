import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "docs",
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        story: resolve(import.meta.dirname, "my-story.html"),
        offers: resolve(import.meta.dirname, "what-i-offer.html"),
        contact: resolve(import.meta.dirname, "contact.html"),
        projects: resolve(import.meta.dirname, "projects.html"),
      },
    },
  },
});
