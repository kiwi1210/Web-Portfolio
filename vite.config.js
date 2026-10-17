import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // Keep generated asset URLs portable when the site is hosted below a subpath
  // or opened directly from the generated `docs` directory.
  base: "./",
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
