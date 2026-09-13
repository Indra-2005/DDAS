/**
 * @file App.jsx
 * @description Main application controller and routing coordinator.
 * 
 * Manages dual runtime modes:
 * 1. Web App Mode: Utilizes browser-compatible layout, custom top navigation, and HTML5 folder auditing.
 * 2. Electron Desktop Mode: Integrates native IPC controls (window min/max/close), sidebar nav, and direct OS downloads watcher.
 * 
 * Dynamic import resolving alias `@desktop/` dynamically switches between native
 * desktop files and web stubs at compile time depending on local availability.
 */

import React from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Files from "./pages/Files";
import Dashboard from "./pages/Dashboard";
import AdminScanner from "./pages/AdminScanner";
import Landing from "./pages/Landing";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import ActivityLogs from "./pages/ActivityLogs";
import Monitor from "@desktop/Monitor";
import DownloadApp from "./pages/Download";
import { useTheme } from "./context/ThemeContext";
import { Sun, Moon, Menu, X, Download, LogOut, ChevronDown } from "lucide-react";
import NotFound from "./pages/NotFound";
import Footer from "./components/Footer";
import DesktopLayout from "@desktop/DesktopLayout";
import { useState, useRef, useEffect } from "react";

// Runtime Platform Detection: checks if running within the custom Electron sandbox
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

const Protected = ({ children }) => {
  const token = localStorage.getItem("ddas_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};


// ============================================
// WEB TOP NAV (only used in browser mode)
// ============================================
function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("ddas_token");
  const { theme, toggleTheme } = useTheme();

  const role = (localStorage.getItem("ddas_role") || "").toLowerCase();
  const company = localStorage.getItem("ddas_company") || "Initial Corp";
  const username = localStorage.getItem("ddas_user") || "User";

  const logout = () => {
    localStorage.clear();
    if (window.electronAPI) {
      window.electronAPI.setAuthToken(null);
    }
    navigate("/login");
  };

  const handleDownloadApp = () => {
    navigate("/download");
  };

  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const NavItem = ({ to, label, mobile, accent }) => {
    const isActive = location.pathname === to;

    if (mobile) {
      return (
        <Link
          to={to}
          onClick={() => setIsOpen(false)}
          className={`block px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
            isActive
              ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          {label}
        </Link>
      );
    }

    return (
      <Link
        to={to}
        className={`relative text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
          isActive
            ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10"
            : accent
            ? "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-amber-500/5"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 glass-nav">

      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="font-black text-xl text-slate-900 dark:text-white tracking-tighter flex items-center gap-1 group">
            <span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">D</span>DAS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 group-hover:scale-150 transition-transform duration-300" />
          </Link>

          {token && (
            <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              {company}
            </span>
          )}

          {/* Center Nav Links (logged in) */}
          {token && (
            <nav className="hidden md:flex items-center gap-1">
              <NavItem to="/monitor" label="Monitor" />
              <NavItem to="/upload" label="Upload" />
              <NavItem to="/files" label="Shared Files" />
              <NavItem to="/dashboard" label="Analytics" />
              {(role === 'admin' || role === 'super_admin') && (
                <>
                  <NavItem to="/admin/logs" label="Audit Logs" />
                  <NavItem to="/admin/team" label="Team" />
                  <NavItem to="/admin/scan" label="Global Scan" accent />
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="hidden md:flex items-center gap-3">
          {token ? (
            <>
              {!isElectron && (
                <button
                  onClick={handleDownloadApp}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.97]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Desktop App
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
              >
                {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-amber-400" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>

              {/* User Avatar Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-200 group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors hidden lg:block">
                    {username}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-slate-200/40 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-700/50 py-1.5 z-50 animate-slide-up-fade">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                      My Profile
                    </Link>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3 my-1" />
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
              >
                {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-amber-400" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>
              <Link to="/login" className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/register" className="px-5 py-2 text-[13px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.97]">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800/50 shadow-xl">
          <div className="p-4 space-y-1">
            {!token && (
              <>
                <NavItem to="/login" label="Sign In" mobile />
                <NavItem to="/register" label="Get Started" mobile />
              </>
            )}

            {token && (
              <>
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menu</div>
                <NavItem to="/monitor" label="Monitor" mobile />
                <NavItem to="/upload" label="Upload" mobile />
                <NavItem to="/files" label="Shared Files" mobile />
                <NavItem to="/dashboard" label="Analytics" mobile />
                <NavItem to="/profile" label="My Profile" mobile />
                
                {!isElectron && (
                  <button
                    onClick={() => { setIsOpen(false); handleDownloadApp(); }}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl transition-all shadow-md active:scale-[0.97]"
                  >
                    <Download className="w-4 h-4" />
                    Download Desktop App
                  </button>
                )}

                {(role === 'admin' || role === 'super_admin') && (
                  <>
                    <div className="px-4 py-2 mt-4 text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">Admin</div>
                    <NavItem to="/admin/logs" label="Audit Logs" mobile />
                    <NavItem to="/admin/team" label="Manage Team" mobile />
                    <NavItem to="/admin/scan" label="Global Scan" mobile />
                  </>
                )}

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-3" />
                <button
                  onClick={() => { setIsOpen(false); logout(); }}
                  className="w-full text-left px-4 py-3 text-base font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}


// ============================================
// ROUTES (shared between web and desktop)
// ============================================
function AppRoutes() {
  return (
    <Routes>
      {/* Show Landing only in web mode */}
      {!isElectron && <Route path="/" element={<Landing />} />}

      {/* In desktop, redirect "/" to dashboard or login */}
      {isElectron && (
        <Route
          path="/"
          element={
            localStorage.getItem("ddas_token") ? (
              <Navigate to="/monitor" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      )}

      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />

      {/* PROTECTED ROUTES */}
      <Route path="/monitor" element={<Protected><Monitor /></Protected>} />
      <Route path="/upload" element={<Protected><Upload /></Protected>} />
      <Route path="/files" element={<Protected><Files /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/download" element={<Protected><DownloadApp /></Protected>} />

      {/* Admin */}
      <Route path="/admin/logs" element={<Protected><ActivityLogs /></Protected>} />
      <Route path="/admin/team" element={<Protected><UserManagement /></Protected>} />
      <Route path="/admin/scan" element={<Protected><AdminScanner /></Protected>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


// ============================================
// MAIN APP
// ============================================
export default function App() {
  React.useEffect(() => {
    const token = localStorage.getItem("ddas_token");
    if (token && window.electronAPI) {
      window.electronAPI.setAuthToken(token);
    }
  }, []);

  // Desktop App: uses sidebar layout with custom title bar
  if (isElectron) {
    return (
      <DesktopLayout>
        <AppRoutes />
      </DesktopLayout>
    );
  }

  // Web App: uses standard top navigation
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e] font-sans text-slate-900 dark:text-slate-100 bg-mesh-gradient">
      <TopNav />
      <AppRoutes />
      <FooterWrapper />
    </div>
  );
}

function FooterWrapper() {
  const location = useLocation();
  return location.pathname === "/" ? <Footer /> : null;
}