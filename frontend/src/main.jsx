/**
 * @file main.jsx
 * @description Application entry point. Mounts the React root with providers:
 * - ThemeProvider: Manages light/dark mode toggle and persistence.
 * - HashRouter: Client-side routing compatible with both web and Electron.
 * - Toaster: Global toast notification overlay (react-hot-toast).
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from './App.jsx'
import './index.css'
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <Toaster position="top-right" />
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);
