/**
 * @file MonitorStub.jsx
 * @description Browser-based HTML5 File System Access API Folder Monitor.
 * 
 * Provides dynamic directory scanning and file auditing within compatible web
 * browsers (e.g. Chrome, Edge, Brave) using the window.showDirectoryPicker API.
 * This runs as the primary folder monitor interface when the application is
 * running in standard web mode on GitHub or deployed environments.
 * 
 * Cryptographic hashing and compliance scans are performed on the files and 
 * routed directly to the FastAPI tenant backend.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  FolderSearch, 
  FolderOpen, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  FileWarning, 
  Loader2, 
  RefreshCw, 
  ShieldAlert,
  Info,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";

/**
 * Local Folder Monitor page component
 */
export default function Monitor() {
  // Check if browser supports the HTML5 File System Access API
  const [isSupported] = useState(() => typeof window.showDirectoryPicker === "function");
  const [dirHandle, setDirHandle] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [events, setEvents] = useState([]);
  const [scanning, setScanning] = useState(false);

  // Use a ref to track known files across rendering cycles to avoid state-lag in the polling interval
  // Key format: "filename-size-lastmodified"
  const knownFilesRef = useRef(new Set());
  const intervalRef = useRef(null);

  // Scan the directory and return info about all files
  const scanDirectory = async (handle) => {
    const files = [];
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === "file") {
          try {
            const file = await entry.getFile();
            files.push({
              name: entry.name,
              size: file.size,
              lastModified: file.lastModified,
              handle: entry
            });
          } catch (e) {
            console.warn(`Could not read file details for ${entry.name}:`, e);
          }
        }
      }
    } catch (err) {
      console.error("Error reading directory handles:", err);
    }
    return files;
  };

  // Perform upload of a detected file to the central multi-tenant backend
  const uploadDetectedFile = async (fileName, fileHandle) => {
    const tempEventId = `${fileName}-${Date.now()}`;
    
    // Add pending log event
    setEvents((prev) => [
      {
        id: tempEventId,
        fileName,
        type: "uploading",
        message: "Hashing and scanning for DLP violations...",
        timestamp: new Date().toISOString()
      },
      ...prev
    ].slice(0, 50));

    try {
      const file = await fileHandle.getFile();
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const { is_duplicate, is_near_duplicate, similarity_score, has_sensitive_content, dlp_violations } = response.data;

      // Update log event status based on API response
      setEvents((prev) =>
        prev.map((evt) => {
          if (evt.id === tempEventId) {
            let type = "complete";
            let message = "Original file stored and cryptographically hashed.";

            if (is_duplicate) {
              type = "duplicate";
              message = "Exact duplicate file blocked (duplicate reference created).";
            } else if (has_sensitive_content) {
              type = "dlp_violation";
              message = `DLP Security Alert: Sensitive data quarantined (${dlp_violations.join(", ")}).`;
            } else if (is_near_duplicate) {
              type = "near_duplicate";
              message = `Near-duplicate detected (${similarity_score}% content overlap with existing knowledge base).`;
            }

            return {
              ...evt,
              type,
              message,
              similarity_score: is_near_duplicate ? similarity_score : 0,
              timestamp: new Date().toISOString()
            };
          }
          return evt;
        })
      );

      if (has_sensitive_content) {
        toast((t) => (
          <span className="flex items-center gap-2 text-rose-500 font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            DLP Threat Blocked: {fileName}
          </span>
        ));
      } else if (is_duplicate) {
        toast.error(`Duplicate file blocked: ${fileName}`);
      } else {
        toast.success(`File registered successfully: ${fileName}`);
      }

    } catch (err) {
      console.error(`Upload failed for ${fileName}:`, err);
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === tempEventId
            ? { ...evt, type: "error", message: `System Error: ${err.response?.data?.detail || err.message}`, timestamp: new Date().toISOString() }
            : evt
        )
      );
      toast.error(`Analysis failed for ${fileName}`);
    }
  };

  // Initialize directory monitoring or change folder
  const handleChooseDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: "read"
      });
      
      setScanning(true);
      setDirHandle(handle);
      setFolderName(handle.name);
      setIsMonitoring(false);
      
      // Stop current watcher loop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Populate snapshot of current files so they are not flagged as new downloads
      const currentFiles = await scanDirectory(handle);
      knownFilesRef.current = new Set(
        currentFiles.map((f) => `${f.name}-${f.size}-${f.lastModified}`)
      );

      toast.success(`Connected to directory: ${handle.name}`);
      setScanning(false);
    } catch (err) {
      setScanning(false);
      if (err.name !== "AbortError") {
        console.error("Directory picker error:", err);
        toast.error("Failed to access local folder.");
      }
    }
  };

  // Directory checking loop
  const checkForNewFiles = useCallback(async () => {
    if (!dirHandle) return;
    
    const currentFiles = await scanDirectory(dirHandle);
    
    for (const f of currentFiles) {
      const fileKey = `${f.name}-${f.size}-${f.lastModified}`;
      
      // Check if file is new or modified
      if (!knownFilesRef.current.has(fileKey)) {
        // Record it to prevent duplicate processing
        knownFilesRef.current.add(fileKey);
        
        // Trigger multi-tenant API uploads
        uploadDetectedFile(f.name, f.handle);
      }
    }
  }, [dirHandle]);

  // Handle monitoring switch
  useEffect(() => {
    if (isMonitoring && dirHandle) {
      // Start polling directory modifications every 3 seconds
      intervalRef.current = setInterval(checkForNewFiles, 3000);
      toast.success("Folder watcher started.");
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        toast.error("Folder watcher paused.");
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMonitoring, dirHandle, checkForNewFiles]);

  const toggleMonitoring = () => {
    if (!dirHandle) {
      toast.error("Please choose a folder to monitor first!");
      return;
    }
    setIsMonitoring((prev) => !prev);
  };

  const getEventIcon = (event) => {
    switch (event.type) {
      case "duplicate":
        return <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />;
      case "dlp_violation":
        return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      case "complete":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "error":
        return <FileWarning className="w-5 h-5 text-red-500" />;
      case "uploading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <FolderSearch className="w-5 h-5 text-slate-400" />;
    }
  };

  const getEventBadge = (event) => {
    switch (event.type) {
      case "duplicate":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-500/20">
            DUPLICATE
          </span>
        );
      case "dlp_violation":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-500/20">
            DLP VIOLATION
          </span>
        );
      case "complete":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/20">
            ORIGINAL
          </span>
        );
      case "error":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-500/20">
            ERROR
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-500/20 animate-pulse">
            COMPLIANCE SCAN
          </span>
        );
    }
  };

  // Render compatibility warning if using non-compatible browser
  if (!isSupported) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0a0f1e] flex items-center justify-center p-6 transition-colors">
        <div className="max-w-lg text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-6">
          <div className="w-20 h-20 mx-auto bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
            <ShieldAlert className="w-10 h-10 text-amber-600 dark:text-amber-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Browser Incompatibility
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Your web browser does not support the **HTML5 File System Access API** required to perform directory monitoring. 
          </p>
          <div className="bg-slate-100/70 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-4 text-xs text-left text-slate-500 dark:text-slate-400">
            <strong>Supported Browsers:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Google Chrome (Desktop)</li>
              <li>Microsoft Edge (Desktop)</li>
              <li>Opera (Desktop)</li>
              <li>Brave Browser</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0a0f1e] p-6 font-sans transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Local Folder Monitor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Automatically watch, audit, and analyze files in your selected local directory for tenant deduplication and DLP leakage.
          </p>
        </div>

        {/* Directory details & operations card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-100/50 dark:shadow-none relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-600 to-indigo-600" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 min-w-0 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Selected Directory Target
              </label>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 truncate font-mono">
                  {folderName ? `📁 ${folderName}` : "No directory connected"}
                </div>
                
                <button
                  onClick={handleChooseDirectory}
                  disabled={scanning}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shrink-0 border border-slate-200/50 dark:border-slate-700/40 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <FolderOpen className="w-4.5 h-4.5" />
                  Browse
                </button>
              </div>
            </div>

            {/* Watch control button */}
            <div className="flex items-center gap-3 shrink-0 mt-4 md:mt-6">
              <button
                onClick={toggleMonitoring}
                disabled={!dirHandle}
                className={`px-6 py-3.5 rounded-2xl font-extrabold text-sm flex items-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMonitoring
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/25"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20"
                }`}
              >
                {isMonitoring ? (
                  <>
                    <Eye className="w-4.5 h-4.5" />
                    Monitoring Active
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4.5 h-4.5" />
                    Start Monitoring
                  </>
                )}
              </button>
              
              {dirHandle && (
                <button
                  onClick={checkForNewFiles}
                  className="p-3.5 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-slate-500 border border-slate-200/50 dark:border-slate-700/40 active:scale-95 transition-transform"
                  title="Force re-scan folder"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Watch Status info */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isMonitoring
                      ? "bg-emerald-500"
                      : dirHandle
                      ? "bg-amber-500"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
                {isMonitoring && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
                )}
              </div>
              
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {isMonitoring
                  ? "Actively scanning folder for new files..."
                  : dirHandle
                  ? "Folder connected. Click Start to begin compliance checks."
                  : "Please connect a local folder to start auditing."}
              </span>
            </div>

            {/* Sandbox Security Notice Callout */}
            <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400">
              <Info className="w-4 h-4 shrink-0" />
              <span>Browser security limits file access to the connected session only.</span>
            </div>
          </div>
        </div>

        {/* Live feeds dashboard */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-100/50 dark:shadow-none">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Live Audit Logs
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Real-time compliance checks inside the selected directory
              </p>
            </div>
            {isMonitoring && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-500/10 text-[10px] font-bold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Watching
              </div>
            )}
          </div>

          {events.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 mx-auto bg-slate-50 dark:bg-slate-950/50 rounded-3xl flex items-center justify-center mb-5 border border-slate-100/40 dark:border-slate-800/50">
                <FolderSearch className="w-9 h-9 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-base">
                No new files detected
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {isMonitoring
                  ? "We'll scan for downloads and analyze duplicate signatures once they appear in the folder."
                  : "Connect a directory and click 'Start Monitoring' to initiate real-time security auditing."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/30">
              {events.map((event, i) => (
                <div
                  key={event.id || i}
                  className={`px-6 py-4.5 flex items-center gap-4.5 transition-all duration-200 hover:bg-slate-50/55 dark:hover:bg-slate-950/20 ${
                    event.type === "duplicate"
                      ? "bg-amber-500/[0.01] dark:bg-amber-500/[0.02]"
                      : event.type === "dlp_violation"
                      ? "bg-rose-500/[0.01] dark:bg-rose-500/[0.02]"
                      : ""
                  }`}
                >
                  <div className="shrink-0 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100/80 dark:border-slate-800/40">
                    {getEventIcon(event)}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">
                      {event.fileName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {event.message}
                    </p>
                    {event.similarity_score > 0 && (
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-100/50 dark:border-purple-800/30 text-purple-600 dark:text-purple-400 font-bold rounded">
                        Overlap: {event.similarity_score}%
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-4">
                    {getEventBadge(event)}
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
