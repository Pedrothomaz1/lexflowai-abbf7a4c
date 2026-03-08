import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Remove console.* statements in production to prevent information leakage
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    // Warn when a chunk exceeds 800kB (default 500kB is too low for this stack)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendors into named chunks for better CDN long-term caching
        manualChunks: {
          // React core — changes rarely, highest cache benefit
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Supabase — auth + realtime, large standalone module
          "vendor-supabase": ["@supabase/supabase-js"],
          // Data fetching + forms
          "vendor-query": ["@tanstack/react-query", "react-hook-form", "@hookform/resolvers", "zod"],
          // Charts — heavy, only loaded on Dashboard/Relatorios
          "vendor-charts": ["recharts"],
          // DnD kit — only loaded on Kanban
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          // PDF/Excel export utilities — large, rarely needed
          "vendor-export": ["jspdf", "jspdf-autotable", "exceljs"],
          // Radix UI primitives — most shadcn/ui components depend on these
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
          // Animation — framer-motion is large
          "vendor-animation": ["framer-motion"],
          // Date utilities
          "vendor-dates": ["date-fns", "react-day-picker"],
        },
      },
    },
  },
}));
