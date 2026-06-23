/**
 * @file Auth.jsx
 * @description Unified authentication page handling Login and Registration flows.
 * Supports JWT-based auth with the FastAPI backend and animated form transitions.
 */
import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, Lock, User, Github, UserPlus, Shield, Building, Key } from "lucide-react";
import toast from "react-hot-toast";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 0h10v10H0z" fill="#f25022"/>
    <path d="M11 0h10v10H11z" fill="#7fba00"/>
    <path d="M0 11h10v10H0z" fill="#00a4ef"/>
    <path d="M11 11h10v10H11z" fill="#ffb900"/>
  </svg>
);
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

/**
 * Unified Authentication Component.
 * Handles user login and registration with animated transitions.
 * @returns {JSX.Element} The authentication page layout.
 */
export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
  
  // Login State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register State
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regInviteCode, setRegInviteCode] = useState("");
  const [regRole, setRegRole] = useState("employee");
  const [regAdminSecret, setRegAdminSecret] = useState("");
  
  const [loading, setLoading] = useState(false);

  // Sync state if URL changes directly
  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
  }, [location.pathname]);

  const toggleMode = (e) => {
    e.preventDefault();
    const targetPath = isLogin ? '/register' : '/login';
    setIsLogin(!isLogin);
    setTimeout(() => {
        navigate(targetPath, { replace: true });
    }, 100);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("username", loginUsername);
      params.append("password", loginPassword);

      const res = await API.post("/login", params);

      localStorage.setItem("ddas_token", res.data.access_token);
      localStorage.setItem("ddas_role", res.data.role);
      localStorage.setItem("ddas_user", res.data.username);
      localStorage.setItem("ddas_company", res.data.company);
      
      if (window.electronAPI) {
        window.electronAPI.setAuthToken(res.data.access_token);
      }

      toast.success("Login Successful");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append("username", regUsername);
    formData.append("password", regPassword);
    formData.append("role", regRole);

    if (regRole === 'admin') {
      formData.append("company", regCompany);
      formData.append("admin_secret", regAdminSecret);
    } else {
      formData.append("invite_code", regInviteCode);
    }

    try {
      await API.post("/register", formData);
      toast.success("Registration successful! Please login.");
      setRegUsername("");
      setRegPassword("");
      setIsLogin(true);
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = (provider, e) => {
    e.preventDefault();
    toast.success(`${provider} SSO is coming soon!`);
  };

  const inputClasses = "w-full pl-11 pr-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all duration-200 font-medium text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e] flex items-center justify-center p-6 font-sans overflow-hidden relative">
      
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] bg-blue-500/[0.04] dark:bg-blue-500/[0.03] rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-purple-500/[0.04] dark:bg-purple-500/[0.03] rounded-full blur-[80px]" />
      </div>

      {/* Container to hold both forms and overlap them */}
      <div className="w-full max-w-md grid items-start relative z-10">
        
        {/* ======== LOGIN PANEL ======== */}
        <div 
          className={`col-start-1 row-start-1 w-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isLogin 
              ? 'translate-x-0 opacity-100 pointer-events-auto z-10' 
              : '-translate-x-[120%] opacity-0 pointer-events-none z-0'
          }`}
        >
          <div className="bg-white dark:bg-slate-900/80 p-7 md:p-9 rounded-2xl shadow-premium border border-slate-200/60 dark:border-slate-700/40 backdrop-blur-xl">
            {/* Header */}
            <div className="text-center mb-7">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1.5">Welcome Back</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Please sign in to your account.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    className={inputClasses}
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">Forgot?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className={inputClasses}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Or continue with</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
            </div>

            {/* SSO Buttons */}
            <div className="mt-5 space-y-2.5">
              <button 
                type="button"
                onClick={(e) => handleSSO('Google', e)}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all text-slate-700 dark:text-slate-200 font-medium text-sm"
              >
                <GoogleIcon />
                Google
              </button>
              
              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  type="button"
                  onClick={(e) => handleSSO('Microsoft', e)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all text-slate-700 dark:text-slate-200 font-medium text-sm"
                >
                  <MicrosoftIcon />
                  Microsoft
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleSSO('GitHub', e)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all text-slate-700 dark:text-slate-200 font-medium text-sm"
                >
                  <Github className="w-5 h-5 text-slate-900 dark:text-white" />
                  GitHub
                </button>
              </div>
            </div>

            {!isElectron && (
              <p className="text-center mt-7 text-slate-500 dark:text-slate-400 text-sm">
                Don't have an account?{" "}
                <button onClick={toggleMode} className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors focus:outline-none">
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>

        {!isElectron && (
          <div 
            className={`col-start-1 row-start-1 w-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              !isLogin 
                ? 'translate-x-0 opacity-100 pointer-events-auto z-10' 
                : 'translate-x-[120%] opacity-0 pointer-events-none z-0'
            }`}
          >
            <div className="bg-white dark:bg-slate-900/80 p-7 md:p-9 rounded-2xl shadow-premium border border-slate-200/60 dark:border-slate-700/40 backdrop-blur-xl">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1.5">Create Account</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Join the secure DDAS network.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Choose a username"
                      className={inputClasses}
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className={inputClasses}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Account Type</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <select
                      className="w-full pl-11 pr-10 py-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer transition-all font-medium text-sm text-slate-700 dark:text-slate-200"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                    >
                      <option value="employee">Employee (Join existing)</option>
                      <option value="admin">Admin (Create new)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                  </div>
                </div>

                {/* Conditional Input */}
                <div>
                  {regRole === 'admin' ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Company Name</label>
                      <div className="relative">
                        <Building className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Your organization name"
                          className={inputClasses}
                          value={regCompany}
                          onChange={(e) => setRegCompany(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Invite Code</label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Enter 8-character code"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:outline-none transition-all font-medium text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 uppercase"
                          value={regInviteCode}
                          onChange={(e) => setRegInviteCode(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Secret */}
                {regRole === 'admin' && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5" /> Admin Secret Key
                    </label>
                    <input
                      type="password"
                      placeholder="Enter secret admin code"
                      className="w-full px-4 py-3 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:outline-none transition-all font-medium text-sm text-amber-900 dark:text-amber-200 placeholder:text-amber-300/80 dark:placeholder:text-amber-600/50"
                      value={regAdminSecret}
                      onChange={(e) => setRegAdminSecret(e.target.value)}
                    />
                  </div>
                )}

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Sign Up"
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Or sign up with</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
              </div>

              {/* SSO Buttons */}
              <div className="mt-4 flex gap-2.5">
                <button 
                  type="button"
                  onClick={(e) => handleSSO('Google', e)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all text-slate-700 dark:text-slate-200 font-medium"
                >
                  <GoogleIcon />
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleSSO('Microsoft', e)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all text-slate-700 dark:text-slate-200 font-medium"
                >
                  <MicrosoftIcon />
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleSSO('GitHub', e)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all text-slate-700 dark:text-slate-200 font-medium"
                >
                  <Github className="w-5 h-5 text-slate-900 dark:text-white" />
                </button>
              </div>

              <p className="text-center mt-7 text-slate-500 dark:text-slate-400 text-sm">
                Already have an account?{" "}
                <button onClick={toggleMode} className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors focus:outline-none">
                  Log in
                </button>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
