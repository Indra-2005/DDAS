import React, { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Shield, Lock, User } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [adminSecret, setAdminSecret] = useState(""); 
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("role", role);
    
  
    if (role === 'admin') {
        formData.append("admin_secret", adminSecret);
    }

    try {
      await API.post("/register", formData);
      alert("Registration successful! Please login.");
      navigate("/login");
    } catch (err) {
      alert("Error: " + (err.response?.data?.detail || "Registration failed"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Create Account</h2>
          <p className="text-slate-500 mt-2">Join the secure DDAS network.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
            <div className="relative">
               <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Choose a username" 
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 required
               />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <div className="relative">
               <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
               <input 
                 type="password" 
                 placeholder="••••••••" 
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 required
               />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Account Type</label>
            <div className="relative">
               <Shield className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
               <select 
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer transition-all"
                 value={role}
                 onChange={(e) => setRole(e.target.value)}
               >
                 <option value="employee">Employee (Standard Access)</option>
                 <option value="admin">Admin (Global Access)</option>
               </select>
            </div>
          </div>

          { }
          {role === 'admin' && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-bold text-amber-600 mb-2 flex items-center gap-2">
                   <Lock className="w-4 h-4" /> Admin Secret Key
                </label>
                <input 
                  type="password" 
                  placeholder="Enter secret admin code" 
                  className="w-full px-4 py-3 bg-amber-50 border border-amber-200 text-amber-900 placeholder-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                />
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  * Required for administrative privileges.
                </p>
             </div>
          )}

          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-slate-200 mt-4">
            Sign Up
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-sm">
          Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
        </p>

      </div>
    </div>
  );
}