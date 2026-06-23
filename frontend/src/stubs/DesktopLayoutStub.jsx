/**
 * @file DesktopLayoutStub.jsx
 * @description Web-safe fallback component for DesktopLayout.
 * 
 * In a standard browser environment (e.g. deployed to staging or GitHub Pages),
 * the native Electron shell and title bar are not available. This component acts
 * as a drop-in replacement/stub that simply passes the children through inside
 * a matching container page style.
 * 
 * If running locally in Electron, Vite path resolving maps this import to the
 * real DesktopLayout.jsx located inside the ignored 'desktop_app' folder.
 */

import React from "react";

/**
 * DesktopLayout stub wrapper
 * @param {Object} props
 * @param {React.ReactNode} props.children - Route views to render
 */
export default function DesktopLayout({ children }) {
  // Direct render of nested routes without injecting custom frameless title bars
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e] text-slate-900 dark:text-slate-100">
      {children}
    </div>
  );
}
