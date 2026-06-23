/**
 * @file Footer.jsx
 * @description Application footer with copyright info, social links, and project branding.
 * Rendered on the Landing page only.
 */
import React from "react";
import { Github, Linkedin, Globe, Shield } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-[#060a14] border-t border-slate-200/60 dark:border-slate-800/40 font-sans">
      {/* Gradient accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-white text-sm">DDAS</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Data Download Duplication Alert System</p>
          </div>
        </div>

        {/* Center */}
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium text-center">
          &copy; {currentYear} DDAS. <span className="text-slate-300 dark:text-slate-600">Secure · Efficient · Reliable</span>
        </p>

        {/* Social Links */}
        <div className="flex items-center gap-3">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50">
            <Github className="w-4 h-4" />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-200/50 dark:hover:border-blue-500/20">
            <Linkedin className="w-4 h-4" />
          </a>
          <a href="#" className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-200/50 dark:hover:border-emerald-500/20">
            <Globe className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
