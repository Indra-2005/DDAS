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

const Protected = ({ children }) => {
  const token = localStorage.getItem("ddas_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};


function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("ddas_token");
  

  const role = (localStorage.getItem("ddas_role") || "").toLowerCase(); 

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const NavItem = ({ to, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`text-sm font-medium transition-colors ${
          isActive 
            ? "text-blue-600" 
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link to="/" className="font-black text-xl text-slate-900 tracking-tighter flex items-center gap-1">
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
                   <NavItem to="/admin/team" label="Manage Team" />
                   <Link 
                     to="/admin/scan" 
                     className={`text-sm font-bold transition-colors flex items-center gap-1 ${
                       location.pathname === '/admin/scan' ? "text-amber-600" : "text-amber-500 hover:text-amber-700"
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
        <div>
          {token ? (
            <button 
              onClick={logout} 
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Log out
            </button>
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
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <TopNav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* PROTECTED ROUTES */}
        <Route path="/upload" element={<Protected><Upload /></Protected>} />
        <Route path="/files" element={<Protected><Files /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        
        {/*  CHECK 4: Route definition for User Management */}
        <Route path="/admin/team" element={<Protected><UserManagement /></Protected>} />
        <Route path="/admin/scan" element={<Protected><AdminScanner /></Protected>} />
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}