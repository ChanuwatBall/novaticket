import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    global: 'window',
  },
  optimizeDeps: {
    exclude: [
      "@capacitor-community/camera-preview",
      "@capacitor-community/image-to-text",
    ],
  },
  server: {
    allowedHosts: true,
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'https://nova-api.rubyclaw.tech',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [
    basicSsl(),react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
