// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

export default defineConfig(({ mode }) => ({
  base: "/",

  plugins: [
    react(),
    federation({
      name: "iiotassistant",
      filename: "remoteEntry.js",
      
      exposes: {
        "./App": "./src/App.tsx",
      },

      shared: {
        react: {
          singleton: true,
          requiredVersion: "^18.2.0",
        },
        "react-dom": {
          singleton: true,
          requiredVersion: "^18.2.0",
        },
        "react-router-dom": {
          singleton: true,
          requiredVersion: "^6.20.0",
          eager: true,
        },
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true,
    port: 5004,
    strictPort: true,
    cors: true,
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
      },
    },
  },

  build: {
    target: "esnext",
    minify: mode === "production" ? "esbuild" : false,
    sourcemap: mode === "production" ? "hidden" : true,
    modulePreload: false,
    cssCodeSplit: false,
  },

  preview: {
    host: true,
    port: 4003,
    strictPort: true,
    cors: true,
  },
}));
