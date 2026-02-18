import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from './App.jsx'
import './index.css'
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
