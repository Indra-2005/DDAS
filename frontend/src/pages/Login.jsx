import React, { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";

import { LogIn, Lock, User, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

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

      toast.success("Login Successful");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[700px] h-[700px] bg-sky-200/20 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-3xl mix-blend-multiply filter opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-[420px] bg-white/60 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-white/50 relative z-10 animate-in fade-in zoom-in duration-700">

        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform transition hover:scale-105 duration-300">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Welcome Back</h2>
          <p className="text-slate-500 text-sm font-medium">Please sign in to continue.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
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
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-slate-900/10 mt-8 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-amber-300 transition-colors" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-sm">
          Don't have an account? <Link to="/register" className="text-sky-600 font-bold hover:text-sky-700 transition-colors">Create one now</Link>
        </p>

      </div>
    </div>
  );
}