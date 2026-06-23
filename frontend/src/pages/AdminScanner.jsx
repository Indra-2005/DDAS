/**
 * @file AdminScanner.jsx
 * @description Admin quarantine management dashboard. Provides tools to review DLP-flagged
 * files, approve/reject/redact quarantined documents, and manage compliance policies.
 */
import React, { useEffect, useState } from "react";
import API from "../api";
import { 
  AlertTriangle, Trash2, Database, ShieldAlert, ArrowRight, User, 
  Settings, Save, Send, Loader2, CheckCircle, Info, Lock, Eye, Check, ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";

// Premium Brand Custom Icons
const SlackIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522zm0 1.261a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H3.78a2.528 2.528 0 0 1-2.522-2.52V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 3.761a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.78a2.528 2.528 0 0 1 2.522-2.522h5.043a2.528 2.528 0 0 1 2.52 2.522v5.043zm-3.778 10.153a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z"/>
  </svg>
);

const DiscordIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
  </svg>
);

const TeamsIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6.5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6.5-6.5C8.46 7 5 10.46 5 14.67c0 3.32 2.12 6.13 5.08 7.16a.75.75 0 0 0 .92-.73v-1.74a4.5 4.5 0 0 1-3-4.28 4.5 4.5 0 0 1 9 0 4.5 4.5 0 0 1-3 4.28v1.74a.75.75 0 0 0 .92.73c2.96-1.03 5.08-3.84 5.08-7.16C20 10.46 16.54 7 12.5 7zm0-6A5.5 5.5 0 0 0 7 6.5C7 9.54 9.46 12 12.5 12S18 9.54 18 6.5 15.54 1 12.5 1z"/>
  </svg>
);

// iOS/Apple-Style Custom Animated sliding toggle
const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 focus:outline-none ${
      checked ? 'bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.35)]' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export default function AdminScanner() {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("scanner"); // "scanner" | "quarantine" | "integrations"

  // Quarantine Vault States
  const [quarantined, setQuarantined] = useState([]);
  const [quarantineLoading, setQuarantineLoading] = useState(false);
  const [reviewFile, setReviewFile] = useState(null);

  // Webhook Integration Configuration States
  const [slackWebhook, setSlackWebhook] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [teamsWebhook, setTeamsWebhook] = useState("");
  const [events, setEvents] = useState({
    upload_original: true,
    duplicate_alert: true,
    dlp_violation: true
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingSettings, setTestingSettings] = useState(false);

  useEffect(() => {
    fetchDuplicates();
    fetchSettings();
    fetchQuarantined();
  }, []);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/global-duplicates");
      setDuplicates(res.data);
    } catch (err) {
      setError("Access Denied: You must be an Admin to view this page.");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuarantined = async () => {
    try {
      setQuarantineLoading(true);
      const res = await API.get("/admin/quarantined-files");
      setQuarantined(res.data);
    } catch (err) {
      console.error("Failed to fetch quarantined files", err);
    } finally {
      setQuarantineLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await API.get("/admin/settings");
      setSlackWebhook(res.data.slack_webhook || "");
      setDiscordWebhook(res.data.discord_webhook || "");
      setTeamsWebhook(res.data.teams_webhook || "");
      setEvents(res.data.webhook_events || {
        upload_original: true,
        duplicate_alert: true,
        dlp_violation: true
      });
    } catch (err) {
      console.error("Failed to load integrations settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingSettings(true);
      const formData = new FormData();
      formData.append("slack_webhook", slackWebhook);
      formData.append("discord_webhook", discordWebhook);
      formData.append("teams_webhook", teamsWebhook);
      formData.append("upload_original", events.upload_original);
      formData.append("duplicate_alert", events.duplicate_alert);
      formData.append("dlp_violation", events.dlp_violation);

      await API.post("/admin/settings", formData);
      toast.success("Webhook configurations saved successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save webhook settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestWebhooks = async () => {
    if (!slackWebhook && !discordWebhook && !teamsWebhook) {
      toast.error("Please configure at least one Webhook URL first.");
      return;
    }
    try {
      setTestingSettings(true);
      const formData = new FormData();
      formData.append("slack_webhook", slackWebhook);
      formData.append("discord_webhook", discordWebhook);
      formData.append("teams_webhook", teamsWebhook);

      await API.post("/admin/settings/test", formData);
      toast.success("Connection test webhooks sent asynchronously!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to execute webhook connection checks");
    } finally {
      setTestingSettings(false);
    }
  };

  const handleRemediate = async (fileId, action) => {
    try {
      const formData = new FormData();
      formData.append("file_id", fileId);
      formData.append("action", action);
      
      const res = await API.post("/admin/quarantine/remediate", formData);
      toast.success(res.data.msg || "Remediation executed successfully");
      
      // Close review panel and reload data
      setReviewFile(null);
      fetchQuarantined();
      fetchDuplicates();
    } catch (err) {
      toast.error(err.response?.data?.detail || `Compliance action failed`);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return "0 B";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isPlainText = (filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'md', 'log', 'yaml', 'yml', 'ini', 'cfg', 'toml'].includes(ext);
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1 font-sans">
        <div>
          <p className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-650" /> Remove redundant copy?
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Other original files in this database cluster will remain secure.</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(id);
            }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const performDelete = async (id) => {
    try {
      await API.delete(`/files/${id}`);
      fetchDuplicates();
      toast.success("Duplicate copy removed successfully");
    } catch (err) {
      toast.error("Failed to delete duplicate copy");
    }
  };

  if (loading && activeTab === "scanner") {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0a0f1e] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="font-semibold text-slate-500 dark:text-slate-400">Scanning global index...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0a0f1e] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-red-500 font-semibold max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0a0f1e] p-6 md:p-10 font-sans relative overflow-hidden page-enter">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/5 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200/60 dark:border-slate-800/60 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 dark:bg-blue-500/15 rounded-xl border border-blue-500/20 text-blue-600 dark:text-blue-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              Security & Controls Console
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
              Global data scanning, quarantine management, PII protection rules, and webhook channel dashboard.
            </p>
          </div>
          
          {/* Animated Badges */}
          <div className="flex gap-2">
            {duplicates.length > 0 && (
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold px-3.5 py-1.5 rounded-full text-xs shadow-sm">
                {duplicates.length} Duplicates
              </span>
            )}
            {quarantined.length > 0 && (
              <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold px-3.5 py-1.5 rounded-full text-xs shadow-sm flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {quarantined.length} Flagged PII
              </span>
            )}
          </div>
        </div>

        {/* Modern Segmented Tab Selector */}
        <div className="flex p-1 bg-slate-100/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800 rounded-2xl max-w-lg shadow-inner">
          <button
            onClick={() => setActiveTab("scanner")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "scanner" 
                ? "bg-white dark:bg-slate-800 text-blue-650 dark:text-white shadow-md border border-slate-200/30 dark:border-slate-700" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Global Duplicates
          </button>
          <button
            onClick={() => { setActiveTab("quarantine"); fetchQuarantined(); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "quarantine" 
                ? "bg-white dark:bg-slate-800 text-blue-650 dark:text-white shadow-md border border-slate-200/30 dark:border-slate-700" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Quarantine Vault
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "integrations" 
                ? "bg-white dark:bg-slate-800 text-blue-650 dark:text-white shadow-md border border-slate-200/30 dark:border-slate-700" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Integrations Settings
          </button>
        </div>

        {/* --- DUPLICATES SCANNER PANEL --- */}
        {activeTab === "scanner" && (
          <div className="space-y-6">
            {duplicates.length === 0 ? (
              <div className="glass-card p-16 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-850 dark:text-white">System Fully Optimized</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto text-sm">
                  No multi-user identical duplicate files detected. Clean audit metrics established.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {duplicates.map((group) => (
                  <div key={group._id} className="glass-card overflow-hidden">
                    
                    {/* Group Header */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 px-6 py-4 border-b border-slate-200/60 dark:border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-850 dark:text-white text-sm">Deduplication Cluster</h3>
                          <p className="text-2xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">SHA256: {group._id.substring(0, 16)}...</p>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <span className="block text-sm font-extrabold text-slate-800 dark:text-slate-200">{group.count} Redundant Copies</span>
                        <span className="block text-xs text-amber-600 dark:text-amber-400 font-bold mt-1">
                          Wasted Volume: {formatSize(group.total_size)}
                        </span>
                      </div>
                    </div>

                    {/* List of files in cluster */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {group.files.map((file, index) => (
                        <div key={file._id} className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors">
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            {index === 0 ? (
                              <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 border border-emerald-500/10 font-sans">Original</span>
                            ) : (
                              <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 border border-rose-500/10 font-sans">Duplicate</span>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate" title={file.filename}>{file.filename}</p>
                              <p className="text-2xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                                <User className="w-3 h-3 text-slate-405" /> Owner: <span className="font-bold text-slate-600 dark:text-slate-350">{file.owner}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-6 pl-14 md:pl-0">
                            <span className="text-2xs text-slate-400 font-semibold font-mono">
                              {new Date(file.upload_date).toLocaleDateString()}
                            </span>

                            {group.files.length > 1 && (
                              <button
                                onClick={() => handleDelete(file._id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all active:scale-95 cursor-pointer"
                                title="Delete duplicate copy"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- QUARANTINE VAULT PANEL --- */}
        {activeTab === "quarantine" && (
          <div className="space-y-6">
            {quarantineLoading ? (
              <div className="glass-card p-16 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-red-505 animate-spin" />
                <p className="font-semibold text-slate-505">Scanning quarantine registry...</p>
              </div>
            ) : quarantined.length === 0 ? (
              <div className="glass-card p-16 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Quarantine Vault Empty</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto text-sm">
                  No company documents are currently isolated or flagged for compliance reviews.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-5 rounded-2xl flex items-start gap-4">
                  <ShieldAlert className="w-6 h-6 shrink-0 text-rose-500 mt-0.5" />
                  <div className="text-xs font-medium leading-relaxed">
                    <span className="font-black block text-sm mb-1">Active Corporate Quarantine Zone</span>
                    The files below contain sensitive keys, API secrets, credit card records, or emails and have been locked. Non-admin users are blocked from downloading these files until they are approved or remediated.
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {quarantined.map((file) => (
                    <div key={file._id} className="glass-card p-5 hover:border-red-500/30 dark:hover:border-red-500/25 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-500/10 text-red-505 rounded-xl border border-red-500/10">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug">{file.filename}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {file.dlp_violations && file.dlp_violations.map((v, i) => (
                              <span key={i} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/15 text-red-650 dark:text-red-400 border border-red-500/10 font-sans">
                                {v}
                              </span>
                            ))}
                          </div>
                          <p className="text-2xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                            Uploaded by <span className="font-bold text-slate-600 dark:text-slate-350">{file.owner}</span> on {new Date(file.upload_date).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                        <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 mr-2 shrink-0">{formatSize(file.size)}</span>
                        <button
                          onClick={() => setReviewFile(file)}
                          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review Compliance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- INTEGRATIONS SETTINGS PANEL --- */}
        {activeTab === "integrations" && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {settingsLoading ? (
              <div className="glass-card p-16 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="font-semibold text-slate-500">Loading configurations...</p>
              </div>
            ) : (
              <>
                {/* Webhooks Section */}
                <div className="glass-card p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Active Channel Webhooks</h3>
                    <p className="text-xs text-slate-450 dark:text-slate-500 mt-1.5">
                      Route duplicate warnings, compliance infractions, and original storage cards directly to administrative workspaces.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* Slack Webhook */}
                    <div className="p-5 border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#4A154B]/10 text-[#4A154B] dark:text-[#E01E5A] rounded-xl border border-[#4A154B]/10">
                          <SlackIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-black text-sm text-slate-800 dark:text-white">Slack Webhook URL</span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">Posts message blocks in configured workspace channel.</span>
                        </div>
                      </div>
                      <input
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white font-mono transition-all shadow-sm"
                      />
                    </div>

                    {/* Discord Webhook */}
                    <div className="p-5 border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#5865F2]/10 text-[#5865F2] rounded-xl border border-[#5865F2]/10">
                          <DiscordIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-black text-sm text-slate-800 dark:text-white">Discord Webhook URL</span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">Fires visual rich-embed cards into Discord chat server channel.</span>
                        </div>
                      </div>
                      <input
                        type="url"
                        placeholder="https://discord.com/api/webhooks/..."
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white font-mono transition-all shadow-sm"
                      />
                    </div>

                    {/* MS Teams Webhook */}
                    <div className="p-5 border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#6264A7]/10 text-[#6264A7] rounded-xl border border-[#6264A7]/10">
                          <TeamsIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-black text-sm text-slate-800 dark:text-white">Microsoft Teams Webhook URL</span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">Trigger message-card connectors inside MS Teams workspaces.</span>
                        </div>
                      </div>
                      <input
                        type="url"
                        placeholder="https://yourcompany.webhook.office.com/..."
                        value={teamsWebhook}
                        onChange={(e) => setTeamsWebhook(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white font-mono transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Event Rule Rules */}
                <div className="glass-card p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Active Routing Rules</h3>
                    <p className="text-xs text-slate-450 dark:text-slate-500 mt-1.5">
                      Select which security and storage system events generate notification cards.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    
                    {/* Event Original Upload */}
                    <div className="py-4 flex items-center justify-between gap-4">
                      <div className="max-w-md">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">Original Document Ingestion</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 block font-medium">Trigger webhook cards on successful first-time document uploads to the repository.</span>
                      </div>
                      <Switch
                        checked={events.upload_original}
                        onChange={(val) => setEvents({ ...events, upload_original: val })}
                      />
                    </div>

                    {/* Event Duplicate Detected */}
                    <div className="py-4 flex items-center justify-between gap-4">
                      <div className="max-w-md">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">Blocked Redundant Submissions</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 block font-medium">Fires alerts when identical files are blocked, saving local bandwidth and user confusion.</span>
                      </div>
                      <Switch
                        checked={events.duplicate_alert}
                        onChange={(val) => setEvents({ ...events, duplicate_alert: val })}
                      />
                    </div>

                    {/* Event DLP violation */}
                    <div className="py-4 flex items-center justify-between gap-4 pt-4">
                      <div className="max-w-md flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Security DLP Infractions</span>
                          <span className="bg-red-500/15 text-red-650 dark:text-red-400 border border-red-500/10 font-bold text-[9px] px-2 py-0.5 rounded tracking-wide uppercase shrink-0">Priority Alert</span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Urgent trigger when OpenAI keys, Google API keys, credit cards, or internal user emails are leaked inside files.</span>
                      </div>
                      <Switch
                        checked={events.dlp_violation}
                        onChange={(val) => setEvents({ ...events, dlp_violation: val })}
                      />
                    </div>

                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 glass-card p-6">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium self-start sm:self-auto">
                    <Info className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Always run verification tests after changing webhook addresses.</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={testingSettings}
                      onClick={handleTestWebhooks}
                      className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all transform active:scale-95 disabled:opacity-50 uppercase tracking-wider cursor-pointer font-sans"
                    >
                      {testingSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> Connecting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-blue-500" /> Send Test Alert
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl transition-all transform active:scale-95 shadow-md shadow-blue-600/10 disabled:opacity-50 uppercase tracking-wider cursor-pointer font-sans"
                    >
                      {savingSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Save Integration
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        )}

        {/* --- COMPLIANCE REVIEW MODAL --- */}
        {reviewFile && (
          <div className="fixed inset-0 z-50 bg-slate-950/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
              
              {/* Warning top ribbon */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
              
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-red-500/10 text-red-505 rounded-2xl shrink-0 border border-red-500/10">
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">Compliance Action Panel</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">Review flagged credentials and enforce corrective data protection measures.</p>
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl space-y-3.5 border border-slate-200/50 dark:border-slate-850 mb-6">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase font-sans">Target Document</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-250 max-w-[200px] truncate font-sans" title={reviewFile.filename}>{reviewFile.filename}</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase font-sans">Uploader Account</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-250 font-sans">{reviewFile.owner}</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase font-sans">File size</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-250 font-sans">{formatSize(reviewFile.size)}</span>
                </div>
                <div className="flex flex-col gap-1.5 pt-2.5 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase font-sans">Detected Violations</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {reviewFile.dlp_violations && reviewFile.dlp_violations.map((v, i) => (
                      <span key={i} className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-red-500/15 text-red-650 dark:text-red-400 border border-red-500/10 font-sans">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* If plain text, offer Redact and Release. If binary, show the warning notice */}
              {isPlainText(reviewFile.filename) ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-450 rounded-2xl text-xs leading-relaxed mb-6 font-medium font-sans">
                  <span className="font-extrabold block mb-1 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" /> Redaction Eligible
                  </span>
                  This document is formatted in plain text. DDAS can search and automatically swap all flagged secret keys with safe `[REDACTED]` tokens directly on storage, restoring document access safely.
                </div>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-850 dark:text-amber-400 rounded-2xl text-xs leading-relaxed mb-6 font-medium font-sans">
                  <span className="font-extrabold block mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-550" /> Binary Safety Guidelines
                  </span>
                  This is a binary format (PDF, Word, Excel, Slide, RTF, or Scanned Image). Native search-and-replace redaction is locked to prevent file corruption. Please whitelist or purge.
                </div>
              )}

              {/* Action Grid */}
              <div className="flex flex-col gap-3">
                {isPlainText(reviewFile.filename) && (
                  <button
                    onClick={() => handleRemediate(reviewFile._id, "redact")}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-sans"
                  >
                    🛡️ Redact and Release Document
                  </button>
                )}
                
                <div className="grid grid-cols-2 gap-3 font-sans">
                  <button
                    onClick={() => handleRemediate(reviewFile._id, "approve")}
                    className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-850 dark:text-slate-250 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-98 border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    Whitelisted / Release
                  </button>
                  <button
                    onClick={() => handleRemediate(reviewFile._id, "purge")}
                    className="py-3 bg-red-655 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm cursor-pointer"
                  >
                    Secure Purge (Delete)
                  </button>
                </div>

                <button
                  onClick={() => setReviewFile(null)}
                  className="w-full py-2.5 mt-2 bg-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer font-sans"
                >
                  Close Actions Panel
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
