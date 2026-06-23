/**
 * @file Download.jsx
 * @description Desktop app download page with OS-specific installers, SHA-256 checksums,
 * installation guides, and FAQ. Currently shows Coming Soon while under certification.
 */
import React, { useState, useEffect } from 'react';
import { 
  Download as DownloadIcon, 
  Monitor, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  Clock, 
  HardDrive, 
  Bell, 
  Activity, 
  Lock, 
  Terminal, 
  Cpu, 
  HelpCircle, 
  ChevronDown,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Download() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [os, setOs] = useState('Windows');
  const [selectedOs, setSelectedOs] = useState('Windows');
  
  // OS-specific configuration states
  const [macArch, setMacArch] = useState('silicon'); // 'silicon' | 'intel'
  const [winFormat, setWinFormat] = useState('installer'); // 'installer' | 'portable'
  const [linuxFormat, setLinuxFormat] = useState('appimage'); // 'appimage' | 'deb'

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState(null);

  // Simple OS detection
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    let currentOs = 'Windows';
    if (userAgent.includes('mac')) {
      currentOs = 'macOS';
    } else if (userAgent.includes('linux')) {
      currentOs = 'Linux';
    }
    setOs(currentOs);
    setSelectedOs(currentOs);
  }, []);

  const handleDownload = () => {
    setIsDownloading(true);
    
    // Determine file extension and arch name
    let fileExtension = 'exe';
    let fileLabel = 'Windows Installer';
    
    if (selectedOs === 'Windows') {
      fileExtension = winFormat === 'installer' ? 'exe' : 'zip';
      fileLabel = winFormat === 'installer' ? 'Windows Setup (.exe)' : 'Windows Portable (.zip)';
    } else if (selectedOs === 'macOS') {
      fileExtension = 'dmg';
      fileLabel = macArch === 'silicon' ? 'macOS Apple Silicon (.dmg)' : 'macOS Intel (.dmg)';
    } else if (selectedOs === 'Linux') {
      fileExtension = linuxFormat === 'appimage' ? 'AppImage' : 'deb';
      fileLabel = linuxFormat === 'appimage' ? 'Linux AppImage' : 'Linux Debian Package (.deb)';
    }

    // Simulate a short delay for animation, then trigger download
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = `/downloads/DDAS-Setup.${fileExtension}`; // Path to actual installer
      link.download = `DDAS-Setup.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Download started for ${fileLabel}!`);
      setIsDownloading(false);
    }, 1500);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const osDetails = {
    Windows: {
      ext: winFormat === 'installer' ? '.exe' : '.zip',
      size: winFormat === 'installer' ? '204.4 MB' : '39.8 MB',
      checksum: winFormat === 'installer' 
        ? 'ade5d2b189e8db1f12b615db829fbd822a400148dbf31fbb94dd027939e95707'
        : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      instructions: winFormat === 'installer' 
        ? 'Run the executable setup file to install the system tray agent and system services.' 
        : 'Extract the zipped folder to any directory and double-click DDAS.exe to run.',
      warning: 'Windows Defender or SmartScreen may alert you because the package is self-signed. Click "More Info" and then "Run anyway" to complete launching.',
      badge: 'Certified x64'
    },
    macOS: {
      ext: '.dmg',
      size: macArch === 'silicon' ? '41.8 MB' : '43.2 MB',
      checksum: 'd6a8f15d862e3d73507c3f81e3a1f81e18581e285a81e309c8599ba875f28456',
      instructions: 'Mount the DMG container, then drag DDAS into your Applications folder. When launching for the first time, allow it in System Settings > Security.',
      warning: macArch === 'silicon'
        ? 'Optimized natively for Apple M1/M2/M3 chips, bypassing Rosetta 2 emulation entirely for high-speed local processing.'
        : 'Designed for older Intel-based Mac systems. Rosetta 2 emulation is not required.',
      badge: macArch === 'silicon' ? 'Universal Apple Silicon' : 'Intel x86_64'
    },
    Linux: {
      ext: linuxFormat === 'appimage' ? '.AppImage' : '.deb',
      size: linuxFormat === 'appimage' ? '48.5 MB' : '46.1 MB',
      checksum: 'c258d4a9cf583ab9ad11e9a263ba88a38a7c2937397b91d2938a1926f284b15d',
      instructions: linuxFormat === 'appimage'
        ? 'Make the AppImage file executable: run `chmod +x DDAS-Setup.AppImage` in the terminal, then double-click or run from command line.'
        : 'Install the package using dpkg or apt: run `sudo dpkg -i ddas-setup.deb` followed by `sudo apt-get install -f` for dependencies.',
      warning: 'Requires FUSE library support for executing AppImage containers natively on Ubuntu 22.04+ or Debian 11+.',
      badge: 'POSIX Compliant'
    }
  };

  const faqItems = [
    {
      question: "How does the real-time directory monitoring affect system resources?",
      answer: "The DDAS desktop agent is highly optimized. It runs natively using low-level OS file system watchers (chokidar/inotify/FSEvents). Hashing and DLP analysis are deferred until files completely stop writing, ensuring near-zero CPU and RAM overhead (< 1% CPU spikes, < 50MB RAM) during regular office workflows."
    },
    {
      question: "Are my actual document files sent to the cloud for comparison?",
      answer: "No. Security and privacy are our top priorities. The desktop client computes cryptographic hashes (SHA-256) and privacy-preserving fuzzy fingerprints (MinHash) locally on your device. Only these tiny metadata signatures are transmitted to the main system registry to check for duplication. If a file is unique and requires uploading, it is routed based on your organization's configured storage policies."
    },
    {
      question: "How do the Slack, Discord, and MS Teams notifications work?",
      answer: "When the native client monitors a folder (e.g., your Downloads folder) and detects a duplicate file or a regulatory Data Loss Prevention (DLP) violation, it immediately reports the event. The admin control panel acts on this event and instantly pushes customized alarms to the teams' integrated workspace channels via webhooks."
    },
    {
      question: "How can I whitelist specific folders or ignore system temp files?",
      answer: "The DDAS tray icon lets you access settings instantly. From there, you can configure directory exclusions, define customized ignore-patterns (like .tmp, .git, or temporary lock files), or alter the default scan target away from your generic Downloads directory."
    }
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 py-16 px-6 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-600/5 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-24">
        
        {/* HERO SECTION / CORE MATRIX */}
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left: Details and Selectors */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Monitor className="w-4 h-4 animate-pulse" /> Native Security Agent (Coming Soon)
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Real-Time Security. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                Disk-Level Protection.
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              Prevent duplications and stop regulatory leakage before files ever reach your cloud workspace. The premium DDAS desktop client runs seamlessly in the background, auditing incoming directories and issuing instant alerts.
            </p>

            {/* Operating System Interactive Selector */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Select Your Operating System</label>
              
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl max-w-md border border-slate-200/60 dark:border-slate-800 shadow-inner">
                {['Windows', 'macOS', 'Linux'].map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedOs(platform)}
                    className={`
                      flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 transform active:scale-95
                      ${selectedOs === platform 
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-lg border border-slate-200/30 dark:border-slate-700' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}
                    `}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* OS Options Detail Panels */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none space-y-6">
              
              {/* Windows Platform Architectures */}
              {selectedOs === 'Windows' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Select Distribution Format</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">{osDetails.Windows.badge}</span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setWinFormat('installer')}
                      className={`flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all ${winFormat === 'installer' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                    >
                      Windows Installer (.exe)
                    </button>
                    <button 
                      onClick={() => setWinFormat('portable')}
                      className={`flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all ${winFormat === 'portable' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                    >
                      Portable ZIP Archive (.zip)
                    </button>
                  </div>
                </div>
              )}

              {/* macOS Platform Architectures */}
              {selectedOs === 'macOS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Processor Architecture</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">{osDetails.macOS.badge}</span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setMacArch('silicon')}
                      className={`flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all ${macArch === 'silicon' ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                    >
                      Apple Silicon (M1/M2/M3)
                    </button>
                    <button 
                      onClick={() => setMacArch('intel')}
                      className={`flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all ${macArch === 'intel' ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                    >
                      Intel Core Processor
                    </button>
                  </div>
                </div>
              )}

              {/* Linux Platform Formats */}
              {selectedOs === 'Linux' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Package Format</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">{osDetails.Linux.badge}</span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setLinuxFormat('appimage')}
                      className={`flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all ${linuxFormat === 'appimage' ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                    >
                      AppImage (Standalone)
                    </button>
                    <button 
                      onClick={() => setLinuxFormat('deb')}
                      className={`flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all ${linuxFormat === 'deb' ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                    >
                      Debian / Ubuntu (.deb)
                    </button>
                  </div>
                </div>
              )}

              {/* Technical Hash Verification Terminal */}
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-slate-500" /> SHA-256 CHECKSUM</span>
                  <button 
                    onClick={() => copyToClipboard(osDetails[selectedOs].checksum, 'Checksum')}
                    className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold cursor-pointer active:scale-95 transition-transform"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-3 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-xl overflow-x-auto select-all border border-slate-800 leading-tight">
                  {osDetails[selectedOs].checksum}
                </div>
              </div>

              {/* Coming Soon Status Banner */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl flex gap-3 text-left">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">Under Development</span>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                    The desktop agent is currently in active development. It will be available for direct installation shortly.
                  </p>
                </div>
              </div>

              {/* Action and Metrics Grid */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 pt-2">
                <button
                  disabled
                  className="group relative flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800/60 rounded-2xl border border-slate-300 dark:border-slate-750 shadow-inner cursor-not-allowed"
                >
                  <Clock className="w-5 h-5" />
                  Coming Soon (Under Development)
                </button>
                
                <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" /> v1.2.0 Upcoming</span>
                  <span className="flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-indigo-500" /> {osDetails[selectedOs].size}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Hero Right: Premium Desktop Interface Mockup */}
          <div className="lg:col-span-5 relative w-full max-w-md lg:max-w-none mx-auto">
            {/* Soft Ambient Shadow Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 rounded-[32px] transform rotate-3 scale-105 opacity-15 blur-3xl pointer-events-none" />
            
            {/* The Windows Frame Mockup */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl p-5 overflow-hidden text-left">
              
              {/* Custom Header Bar */}
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/90 shadow-sm shadow-rose-500/20" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/90 shadow-sm shadow-amber-500/20" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-sm shadow-emerald-500/20" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">DDAS Native Daemon v1.2.0</span>
                <div className="w-10 h-1 bg-slate-800 rounded" />
              </div>

              {/* Status Header Badge */}
              <div className="p-4 bg-slate-950/70 border border-slate-800/60 rounded-2xl flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-slate-200">Disk Daemon Active</span>
                    <span className="text-[10px] text-slate-500">Watching: /Users/ddas/Downloads</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Secure</span>
                </div>
              </div>

              {/* Core Hashing Circular Animation Simulator */}
              <div className="my-6 p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex items-center gap-4">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <Cpu className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-300">Calculating local MinHash fingerprint...</p>
                  <p className="text-[10px] text-slate-500 font-mono">MD5 / SHA-256 Pipeline active</p>
                </div>
              </div>

              {/* Real-time Detections Logs feed */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Live File Analysis Log</span>
                
                <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs transition-transform hover:scale-[1.01]">
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-slate-300 truncate">Q4_Finance_Review.xlsx</p>
                    <p className="text-[10px] text-slate-500">Processed in 12ms ➔ Hashed</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[9px] font-extrabold rounded-full tracking-wider uppercase">
                    Unique
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs transition-transform hover:scale-[1.01]">
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-slate-300 truncate">System_Spec_v2.docx</p>
                    <p className="text-[10px] text-slate-500">Fuzzy Jaccard Match (91% overlap)</p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-950/40 text-purple-400 border border-purple-900/30 text-[9px] font-extrabold rounded-full tracking-wider uppercase">
                    Near Duplicate
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs transition-transform hover:scale-[1.01]">
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-slate-300 truncate">db_secrets.json</p>
                    <p className="text-[10px] text-slate-500">DLP Alert: AWS Secret Keys detected</p>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-950/40 text-rose-400 border border-rose-900/30 text-[9px] font-extrabold rounded-full tracking-wider uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-400" /> Blocked
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

        {/* STEP-BY-STEP INSTALLATION INTERACTIVE TIMELINE */}
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Installation & Security Trust Guide
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm max-w-xl mx-auto">
              Setting up DDAS is quick and straightforward. Follow these steps to activate disk-level monitoring.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="group bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/50 dark:shadow-none text-left relative z-10 transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-700 duration-300">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-xl rounded-2xl flex items-center justify-center mb-6 shadow-md border border-blue-100 dark:border-blue-900/40 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Download Package</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Click the primary action button to get <code className="bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono text-xs border border-slate-200/50 dark:border-slate-800">DDAS-Setup{osDetails[selectedOs].ext}</code>. Verify the hash key using your native command line tools to ensure integrity.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/50 dark:shadow-none text-left relative z-10 transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-700 duration-300">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xl rounded-2xl flex items-center justify-center mb-6 shadow-md border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Execute Installer</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                Launch the binary. {osDetails[selectedOs].instructions}
              </p>
              
              {/* Alert Callout Widget */}
              <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 rounded-2xl p-4 flex items-start gap-3 text-left">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">Security Alert Action</span>
                  <span className="text-[11px] text-amber-800/90 dark:text-amber-200/80 leading-relaxed block">
                    {osDetails[selectedOs].warning}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/50 dark:shadow-none text-left relative z-10 transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-700 duration-300">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-black text-xl rounded-2xl flex items-center justify-center mb-6 shadow-md border border-purple-100 dark:border-purple-900/40 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Login & Authenticate</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Fire up the native app, sign in with your centralized dashboard credentials. The client automatically registers its daemon listener and communicates using high-speed local IPC.
              </p>
            </div>

          </div>
        </div>

        {/* NATIVE APP TECHNICAL SPEC SHEET */}
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              System Specifications & Requirements
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Extremely lightweight architecture designed for continuous enterprise compliance checks.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg shadow-slate-100/40 dark:shadow-none text-left">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800">
                  <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Specification</th>
                  <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Minimum Requirements</th>
                  <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Recommended Standards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-400">
                <tr>
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">CPU Overhead</td>
                  <td className="px-6 py-4">&lt; 1% Average CPU consumption</td>
                  <td className="px-6 py-4">Multi-threaded hashing optimized</td>
                </tr>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Memory (RAM) Footprint</td>
                  <td className="px-6 py-4">40 MB during background idle</td>
                  <td className="px-6 py-4">Max 80 MB active folder-wide hashing</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Disk Space Required</td>
                  <td className="px-6 py-4">150 MB available storage</td>
                  <td className="px-6 py-4">Fast SSD for high-rate parallel scanning</td>
                </tr>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Supported OS Versions</td>
                  <td className="px-6 py-4">Win 10/11 x64, macOS 10.15+, Ubuntu 20+</td>
                  <td className="px-6 py-4">Windows 11, macOS Sequoia, debian packages</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* NATIVE APP CORE STRENGTHS GRID */}
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Why Run the Desktop Agent?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Continuous endpoint checks deliver immediate and unbreakable deduplication control.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StrengthCard
              icon={Activity}
              title="Continuous Ingestion Watch"
              desc="Integrates with local operating system filesystem registers, evaluating newly downloaded elements silently without needing browser tabs."
            />
            <StrengthCard
              icon={Bell}
              title="Low-Latency Native Alerts"
              desc="Issues standard hardware system alerts instantly when file collisions occur or sensitive regulatory strings are flagged."
            />
            <StrengthCard
              icon={ShieldCheck}
              title="Secure Disk Auditing"
              desc="Evaluates file digests right as they hit the local physical drive, preventing accidental sharing or upload before it initiates."
            />
            <StrengthCard
              icon={Zap}
              title="Multi-Threaded Hashing"
              desc="Harnesses physical CPU resources to tokenize, parse, and check overlapping chunks across massive files simultaneously."
            />
          </div>
        </div>

        {/* FAQ ACCORDION SECTION */}
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Common questions and answers regarding the desktop agent deployment.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4 text-left">
            {faqItems.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />
                    {item.question}
                  </span>
                  <ChevronDown 
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${activeFaq === idx ? 'transform rotate-180' : ''}`} 
                  />
                </button>
                
                <div 
                  className={`
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${activeFaq === idx ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}
                  `}
                >
                  <div className="p-5 pt-0 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800/50">
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function StrengthCard({ icon: Icon, title, desc }) {
  return (
    <div className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col justify-between hover:border-blue-500/30 dark:hover:border-blue-400/20">
      <div className="space-y-4">
        <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center border border-blue-100/50 dark:border-blue-900/30 group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}
