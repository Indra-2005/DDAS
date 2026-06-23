/**
 * @file vite.config.js
 * @description Vite build configuration for the DDAS frontend.
 *
 * Key responsibilities:
 * 1. Conditional Desktop Aliasing: Resolves `@desktop/*` imports to either the real
 *    desktop_app/ components (when developing locally with Electron) or lightweight
 *    stub components (for web-only builds / CI / GitHub deployment).
 * 2. Dependency Pinning: Forces all React-related dependencies to resolve from the
 *    local `node_modules/` to prevent duplicate React instances when importing from
 *    the out-of-root `desktop_app/` directory.
 * 3. Dev Server FS Access: Allows Vite's dev server to serve files from both the
 *    frontend root and the `desktop_app/` directory above it.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

/**
 * Resolves a module path conditionally: returns the real desktop component path
 * if it exists on disk (local dev with Electron), otherwise falls back to a
 * lightweight stub that renders a no-op or "feature unavailable" UI.
 * @param {string} targetPath - Absolute path to the real desktop component.
 * @param {string} stubPath   - Absolute path to the fallback stub component.
 * @returns {string} The resolved absolute path for the Vite alias.
 */
const resolveOrStub = (targetPath, stubPath) => {
  return fs.existsSync(targetPath) ? targetPath : stubPath;
};

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative base so built assets work under any host path (e.g. file:// in Electron)
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      // --- Desktop Component Aliases ---
      // These map virtual @desktop/* imports to real or stub implementations.
      "@desktop/DesktopLayout": resolveOrStub(
        path.resolve(__dirname, "../desktop_app/DesktopLayout.jsx"),
        path.resolve(__dirname, "src/stubs/DesktopLayoutStub.jsx")
      ),
      "@desktop/Monitor": resolveOrStub(
        path.resolve(__dirname, "../desktop_app/Monitor.jsx"),
        path.resolve(__dirname, "src/stubs/MonitorStub.jsx")
      ),

      // --- Dependency Pinning ---
      // Force React ecosystem packages to resolve from frontend/node_modules/ to prevent
      // duplicate instances when Rollup follows imports from the out-of-root desktop_app/.
      "react": path.resolve(__dirname, "node_modules/react"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-router-dom": path.resolve(__dirname, "node_modules/react-router-dom"),
      "lucide-react": path.resolve(__dirname, "node_modules/lucide-react"),
      "react-hot-toast": path.resolve(__dirname, "node_modules/react-hot-toast"),
    },
  },
  server: {
    // Bind to 0.0.0.0 to allow LAN access for mobile testing
    host: true,
    fs: {
      // Grant Vite's dev server read access to the desktop_app/ directory above the project root
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "../desktop_app")
      ]
    }
  },
});

