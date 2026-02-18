import React from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Upload from "./pages/Upload";
import Files from "./pages/Files";
import Dashboard from "./pages/Dashboard";
import AdminScanner from "./pages/AdminScanner";
import Landing from "./pages/Landing";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import ActivityLogs from "./pages/ActivityLogs";
import { useTheme } from "./context/ThemeContext";
import { Sun, Moon, Menu, X } from "lucide-react";
import NotFound from "./pages/NotFound";
import Footer from "./components/Footer";
import { useState } from "react";

const Protected = ({ children }) => {
  const token = localStorage.getItem("ddas_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};


function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("ddas_token");
  const { theme, toggleTheme } = useTheme();


  const role = (localStorage.getItem("ddas_role") || "").toLowerCase();

  const logout = () => {
    localStorage.clear();
    navigate("/login");
    navigate("/login");
  };

  const [isOpen, setIsOpen] = useState(false);

  const NavItem = ({ to, label, mobile }) => {
    const isActive = location.pathname === to;
    const baseClasses = mobile
      ? "block px-4 py-3 text-base font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      : "text-sm font-medium transition-colors";

    return (
      <Link
        to={to}
        onClick={() => setIsOpen(false)}
        className={`${baseClasses} ${isActive ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/10" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 dark:bg-slate-900/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link to="/" className="font-black text-xl text-slate-900 dark:text-white tracking-tighter flex items-center gap-1">
            DDAS<span className="text-blue-600 text-2xl">.</span>
          </Link>

          {/* Center Links (Only visible if logged in) */}
          {token && (
            <nav className="hidden md:flex items-center gap-6">
              <NavItem to="/upload" label="Upload" />
              <NavItem to="/files" label="Shared Files" />
              <NavItem to="/dashboard" label="Analytics" />

              {/* CHECK 3: Conditional Admin Links */}
              {role === 'admin' && (
                <>
                  <NavItem to="/admin/logs" label="Audit Logs" />
                  <NavItem to="/admin/team" label="Manage Team" />
                  <Link
                    to="/admin/scan"
                    className={`text-sm font-bold transition-colors flex items-center gap-1 ${location.pathname === '/admin/scan' ? "text-amber-600" : "text-amber-500 hover:text-amber-700"
                      }`}
                  >
                    Global Scan
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="hidden md:block">
          {token ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                My Profile
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Log out
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                Get Started
              </Link>
            </div>
          )}
        </div>
        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 space-y-2">
            {!token && (
              <>
                <NavItem to="/login" label="Sign In" mobile />
                <NavItem to="/register" label="Get Started" mobile />
              </>
            )}

            {token && (
              <>
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Menu</div>
                <NavItem to="/upload" label="Upload" mobile />
                <NavItem to="/files" label="Shared Files" mobile />
                <NavItem to="/dashboard" label="Analytics" mobile />
                <NavItem to="/profile" label="My Profile" mobile />

                {role === 'admin' && (
                  <>
                    <div className="px-4 py-2 mt-4 text-xs font-bold text-amber-500 uppercase tracking-wider">Admin Controls</div>
                    <NavItem to="/admin/logs" label="Audit Logs" mobile />
                    <NavItem to="/admin/team" label="Manage Team" mobile />
                    <NavItem to="/admin/scan" label="Global Scan" mobile />
                  </>
                )}

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                <button
                  onClick={() => { setIsOpen(false); logout(); }}
                  className="w-full text-left px-4 py-3 text-base font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <TopNav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PROTECTED ROUTES */}
        <Route path="/upload" element={<Protected><Upload /></Protected>} />
        <Route path="/files" element={<Protected><Files /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />

        {/*  CHECK 4: Route definition for User Management */}
        <Route path="/admin/logs" element={<Protected><ActivityLogs /></Protected>} />
        <Route path="/admin/team" element={<Protected><UserManagement /></Protected>} />
        <Route path="/admin/scan" element={<Protected><AdminScanner /></Protected>} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <FooterWrapper />
    </div>
  );
}

function FooterWrapper() {
  const location = useLocation();
  return location.pathname === "/" ? <Footer /> : null;
}