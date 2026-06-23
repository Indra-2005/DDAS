/**
 * @file Landing.jsx
 * @description Public marketing landing page for unauthenticated web visitors with hero
 * section, feature highlights, and CTA buttons. Hidden in Electron desktop mode.
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, Database, Zap, ArrowRight,
  FileText, Server, Lock, AlertTriangle, CheckCircle,
  GitCompare, ShieldAlert, Send, Sparkles
} from "lucide-react";

/**
 * Landing Page Component.
 * Public-facing marketing and information page describing features and benefits.
 * @returns {JSX.Element} The Landing page layout.
 */
export default function Landing() {
  const token = localStorage.getItem("ddas_token");

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0f1e] font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden">

      {/* HERO SECTION */}
      <div className="relative bg-gradient-to-b from-slate-900 via-[#0c1832] to-slate-900 text-white overflow-hidden">

        {/* Animated Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Gradient Mesh Orbs */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-float" />
          <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] animate-float-slow" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] animate-glow-pulse" />
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-grid opacity-30" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-28 md:py-36 relative z-10 text-center">

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-950/60 border border-blue-700/30 text-blue-300 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Operational
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Data Download Duplication <br className="hidden md:block" />
            <span className="gradient-text-animated">
              Alert & Guard System
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            The next generation of secure enterprise storage. Beyond standard SHA-256 cryptographic deduplication, DDAS leverages 
            <span className="text-white font-semibold"> Jaccard-similarity semantic comparisons</span>, 
            <span className="text-white font-semibold"> real-time Data Loss Prevention (DLP) compliance regulators</span>, and 
            <span className="text-white font-semibold"> multi-channel webhook alert systems</span> to eliminate redundancy and guard sensitive data.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {token ? (
              <Link to="/upload" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg transition-all hover:scale-[1.02] shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 active:scale-[0.98]">
                Launch Console <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-xl shadow-white/10 active:scale-[0.98]">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-semibold text-lg transition-all flex items-center justify-center backdrop-blur-sm">
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex items-center justify-center gap-8 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>SHA-256 Secured</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>End-to-End Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Real-time Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE MONITOR SECTION */}
      <div className="bg-slate-50 dark:bg-[#080d1a] py-24 border-b border-slate-200 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Text Side */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Core Technology
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">Intelligent Storage & Compliance</h2>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                Data redundancy and data leaks are critical corporate risks. Simple files, drafts, and sensitive materials are often re-uploaded, wasting petabytes of cloud storage and increasing exposure.
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
                <strong className="text-slate-800 dark:text-white">DDAS</strong> delivers multi-layered defenses. It maps precise byte duplicates, detects near-duplicate textual documents via MinHash semantic analysis, scans for compliance-violating PII leaks, and alerts channels in real time.
              </p>

              <ul className="space-y-4">
                <li className="flex items-center gap-3.5 group">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/15 transition-colors"><ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Semantic & Cryptographic Filtering</span>
                </li>
                <li className="flex items-center gap-3.5 group">
                  <div className="p-2 bg-rose-100 dark:bg-rose-500/10 rounded-xl group-hover:bg-rose-200 dark:group-hover:bg-rose-500/15 transition-colors"><ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" /></div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Enterprise DLP Compliance Controls</span>
                </li>
                <li className="flex items-center gap-3.5 group">
                  <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-xl group-hover:bg-purple-200 dark:group-hover:bg-purple-500/15 transition-colors"><GitCompare className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Detailed Difference Diff Comparisons</span>
                </li>
              </ul>
            </div>

            {/* Visual Side (Mock Interface) */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-full">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 rounded-2xl transform rotate-1 scale-[1.03] opacity-15 blur-2xl animate-glow-pulse" />

              {/* Card Container */}
              <div className="relative bg-white dark:bg-slate-900/90 p-6 md:p-8 rounded-2xl shadow-premium-lg border border-slate-200/60 dark:border-slate-700/40 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">
                      Live Compliance & Storage Monitor
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Real-time MinHash similarity & DLP checks</p>
                  </div>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Item 1 - Unique */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/40 transition-all hover:border-emerald-200 dark:hover:border-emerald-800/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">Manual_v1.pdf</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                      <CheckCircle className="w-3 h-3" /> UNIQUE
                    </span>
                  </div>

                  {/* Item 2 - Duplicate Blocked */}
                  <div className="flex items-center justify-between p-3.5 bg-amber-50/30 dark:bg-amber-500/[0.03] rounded-xl border border-amber-100 dark:border-amber-500/10 transition-all hover:border-amber-200 dark:hover:border-amber-700/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">Manual_Copy.pdf</span>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3" /> BLOCKED
                    </span>
                  </div>

                  {/* Item 3 - Near Duplicate */}
                  <div className="flex items-center justify-between p-3.5 bg-purple-50/30 dark:bg-purple-500/[0.03] rounded-xl border border-purple-100 dark:border-purple-500/10 transition-all hover:border-purple-200 dark:hover:border-purple-700/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">Report_Draft_v2.docx</span>
                    </div>
                    <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 border border-purple-200/50 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 text-[10px] font-bold rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                      <GitCompare className="w-3 h-3" /> 94% MATCH
                    </span>
                  </div>

                  {/* Item 4 - DLP Security Violation */}
                  <div className="flex items-center justify-between p-3.5 bg-rose-50/30 dark:bg-rose-500/[0.03] rounded-xl border border-rose-100 dark:border-rose-500/10 transition-all animate-border-glow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-rose-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">credentials.txt</span>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-bold rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldAlert className="w-3 h-3" /> DLP VIOLATION
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* PILLARS OF STORAGE SECURITY (FEATURES GRID) */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pillars of Enterprise Storage Guard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto">
            Advanced detection algorithms integrated seamlessly with real-time communications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={ShieldCheck}
            title="1. Precise Deduplication"
            desc="Generates instant, highly reliable SHA-256 cryptographic fingerprints of uploaded files to block redundant byte-identical copies immediately."
            color="blue"
          />
          <FeatureCard
            icon={GitCompare}
            title="2. Fuzzy Semantic Alignment"
            desc="Runs multi-hash MinHash and Jaccard similarity algorithms to compare incoming uploads against existing corpus files and provides split-pane side-by-side difference views."
            color="indigo"
          />
          <FeatureCard
            icon={ShieldAlert}
            title="3. DLP Compliance Regulators"
            desc="Scans document contents at upload using regex rules for credit cards, GCP keys, AWS keys, and PII to prevent accidental leaks of sensitive files."
            color="rose"
          />
          <FeatureCard
            icon={Send}
            title="4. Webhook Notification Hub"
            desc="Routes warnings directly to administrative channels on Slack, Discord, or MS Teams via customized triggers (Original saved, Duplicate blocked, DLP alert)."
            color="purple"
          />
        </div>
      </div>

      {/* WORKFLOW PIPELINE */}
      <div className="bg-slate-50 dark:bg-[#080d1a] border-t border-b border-slate-200 dark:border-slate-800/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">The Analysis Pipeline</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3">How files are ingested, guarded, and stored in milliseconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent -translate-y-4 z-0" />

            <PipelineStage num="01" color="blue" icon={Zap} title="Ingest & Fingerprint" desc="Computes instant SHA-256 check hashes and parses full document body tokens at the millisecond scale." />
            <PipelineStage num="02" color="indigo" icon={Database} title="Scan & Align" desc="Compares text minhashes against the global index, measuring Jaccard coefficients to discover near-duplicates." />
            <PipelineStage num="03" color="rose" icon={ShieldAlert} title="DLP Compliance Check" desc="Applies strict regex matches across the content to detect API keys, credit cards, or passwords before committing data." />
            <PipelineStage num="04" color="purple" icon={Send} title="Remediate & Route" desc="Either blocks duplicates and dispatches webhook alert triggers, or commits unique documents safely to disk." />
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="bg-slate-900 dark:bg-[#060a14] text-slate-400 py-12 text-center border-t border-slate-800/50">
        <p className="font-semibold">
          Data Download Duplication Alert System (DDAS) &copy; 2026
        </p>
        <p className="text-sm mt-2 opacity-60">Secure. Efficient. Reliable.</p>
      </div>
    </div>
  );
}


function FeatureCard({ icon: Icon, title, desc, color }) {
  const colorMap = {
    blue: "bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 group-hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 group-hover:text-white",
    rose: "bg-rose-50 dark:bg-rose-500/10 group-hover:bg-rose-600 text-rose-600 dark:text-rose-400 group-hover:text-white",
    purple: "bg-purple-50 dark:bg-purple-500/10 group-hover:bg-purple-600 text-purple-600 dark:text-purple-400 group-hover:text-white",
  };

  return (
    <div className="p-7 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 shadow-sm card-hover gradient-border group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2.5">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}


function PipelineStage({ num, color, icon: Icon, title, desc }) {
  const colorMap = {
    blue: { badge: "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10", icon: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    indigo: { badge: "text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10", icon: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
    rose: { badge: "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10", icon: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" },
    purple: { badge: "text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10", icon: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  };

  return (
    <div className="p-7 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 shadow-sm relative z-10 card-hover">
      <span className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${colorMap[color].badge}`}>Stage {num}</span>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${colorMap[color].icon}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}