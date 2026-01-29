import React, { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";

import { LogIn, Lock, User, Sparkles } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);
      
      const res = await API.post("/login", params);
      
 
      localStorage.setItem("ddas_token", res.data.access_token);
      localStorage.setItem("ddas_role", res.data.role); 
      localStorage.setItem("ddas_user", res.data.username);

      navigate("/dashboard"); 
    } catch (err) {
      alert("Login failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
   
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-500">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 font-medium mt-2">Log in to your digital garden. <Sparkles className="inline w-4 h-4 text-amber-400" /></p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Username</label>
            <div className="relative">
               <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Enter your username" 
                 className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:ring-2 focus:ring-sky-400 focus:bg-white focus:outline-none transition-all font-medium"
                 value={username}
                 onChange={e => setUsername(e.target.value)}
                 required
               />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Password</label>
            <div className="relative">
               <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
               <input 
                 type="password" 
                 placeholder="••••••••" 
                 className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:ring-2 focus:ring-sky-400 focus:bg-white focus:outline-none transition-all font-medium"
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 required
               />
            </div>
          </div>

          {/* Login Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-sky-500 text-white font-black py-4 rounded-[20px] transition-all shadow-lg shadow-slate-200 mt-6 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Wait a sec...
              </span>
            ) : "Log In"}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-400 font-bold text-sm">
          Don't have an account? <Link to="/register" className="text-sky-500 hover:underline">Sign up for free</Link>
        </p>

      </div>
    </div>
  );
}