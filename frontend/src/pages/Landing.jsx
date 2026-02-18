import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, Database, Zap, ArrowRight,
  FileText, Server, Lock, AlertTriangle, CheckCircle
} from "lucide-react";

export default function Landing() {
  const token = localStorage.getItem("ddas_token");

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">

      { }
      <div className="relative bg-slate-900 text-white">

        {/* Background Effects (Fixed to prevent scrollbars) */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-600 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10 text-center">

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            System Operational
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Data Download Duplication <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Alert System
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The next generation of secure storage. We use advanced cryptographic hashing to ensure that
            <span className="text-white font-semibold"> no duplicate file is ever stored twice</span>,
            saving massive resources for enterprise sectors.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {token ? (
              <Link to="/upload" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                Launch Console <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
                  Get Started
                </Link>
                <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-slate-800 text-white hover:bg-slate-700 rounded-xl font-semibold text-lg transition-all flex items-center justify-center">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      { }
      <div className="bg-slate-50 py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Text Side */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Efficiency Meets Security</h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Redundant data is a critical inefficiency. Copies of the same manuals, reports, and media are uploaded thousands of times, wasting petabytes of storage.
              </p>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                <strong>DDAS</strong> creates a "Single Source of Truth." By detecting duplicates
                at the moment of upload, we reduce storage costs by up to 60% while maintaining strict access controls.
              </p>

              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="p-1.5 bg-green-100 rounded-full"><ShieldCheck className="w-5 h-5 text-green-600" /></div>
                  <span className="font-medium text-slate-700">Prevent Redundant Storage</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-full"><Database className="w-5 h-5 text-blue-600" /></div>
                  <span className="font-medium text-slate-700">Centralized Data Management</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-100 rounded-full"><Lock className="w-5 h-5 text-amber-600" /></div>
                  <span className="font-medium text-slate-700">Role-Based Data Privacy</span>
                </li>
              </ul>
            </div>

            {/* Visual Side (Mock Interface) */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-full">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl transform rotate-3 scale-105 opacity-20 blur-xl"></div>

              {/* Card Container */}
              <div className="relative bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Live System Monitor</h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Item 1 */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 text-sm truncate">Manual_v1.pdf</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> UNIQUE
                    </span>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 text-sm truncate">Manual_Copy.pdf</span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> BLOCKED
                    </span>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 text-sm truncate">Project_Alpha.docx</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> UNIQUE
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      { }
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
          <p className="text-slate-500 mt-2">Intelligent hashing in milliseconds.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Zap}
            title="1. Fingerprinting"
            desc="When a file is uploaded, the system generates a unique cryptographic hash (SHA-256) fingerprint."
          />
          <FeatureCard
            icon={Database}
            title="2. Global Scan"
            desc="The fingerprint is compared against the entire database. This happens instantly, checking millions of records."
          />
          <FeatureCard
            icon={Server}
            title="3. Smart Storage"
            desc="If unique, the file is saved. If duplicate, we link the new upload to the existing file, saving space immediately."
          />
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="bg-slate-900 text-slate-400 py-12 text-center border-t border-slate-800">
        <p className="font-medium">
          Data Download Duplication Alert System (DDAS) &copy; 2025
        </p>
        <p className="text-sm mt-2 opacity-60">Secure. Efficient. Reliable.</p>
      </div>
    </div>
  );
}


function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
        <Icon className="w-7 h-7 text-slate-700 group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}