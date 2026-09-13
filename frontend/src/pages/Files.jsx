/**
 * @file Files.jsx
 * @description Tenant-scoped file management page with searchable, sortable file table,
 * single/bulk delete, file preview modal, and download capabilities.
 */
import React, { useEffect, useState } from "react";
import API from "../api";
import { 
  FileText, Download, Trash2, Search, Filter, 
  AlertTriangle, CheckCircle, User, Lock, Eye, 
  GitCompare, ShieldAlert, X, Loader2 
} from "lucide-react";
import toast from "react-hot-toast";
import FilePreviewModal from "../components/FilePreviewModal";
import { TableSkeleton } from "../components/Skeleton";

/**
 * Files Management Component.
 * Tenant-scoped page for viewing, comparing, downloading, and managing uploaded files.
 * Includes support for bulk deletion and near-duplicate resolution logic.
 * @returns {JSX.Element} The Files management page layout.
 */
export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  // Advanced Interactive Comparison States
  const [comparingFile, setComparingFile] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [file1Text, setFile1Text] = useState(""); // Uploaded near-duplicate copy
  const [file2Text, setFile2Text] = useState(""); // Original base file reference

  const role = localStorage.getItem("ddas_role");
  const currentUsername = localStorage.getItem("ddas_user");
  const isAdmin = role === "admin" || role === "super_admin";

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const deletableFiles = files.filter(f => isAdmin || f.owner === currentUsername);
  const deletableIds = deletableFiles.map(f => f._id);

  const toggleSelectFile = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === deletableIds.length && deletableIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletableIds));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    toast((t) => (
      <div className="flex flex-col gap-2 font-sans">
        <p className="font-bold text-slate-700">Delete {selectedIds.size} selected files permanently?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performBulkDelete();
            }}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-bold shadow"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 5000, icon: '⚠️' });
  };

  const performBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      const idsArray = Array.from(selectedIds);
      const res = await API.post("/files/bulk-delete", { file_ids: idsArray });
      const deletedCount = res.data.deleted_count || idsArray.length;
      
      setFiles(prev => prev.filter(f => !selectedIds.has(f._id)));
      setSelectedIds(new Set());
      toast.success(`Successfully deleted ${deletedCount} files`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "Failed to bulk delete files");
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await API.get("/files");
      setFiles(Array.isArray(res.data) ? res.data : []);
      setSelectedIds(new Set());
    } catch (err) {
      setError("Failed to load files.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (file) => {
    setComparingFile(file);
    setCompareLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        API.get(`/files/text/${file._id}`),
        API.get(`/files/text/${file.compare_file_id}`)
      ]);
      setFile1Text(res1.data.text || "");
      setFile2Text(res2.data.text || "");
    } catch (err) {
      toast.error("Failed to extract texts for similarity comparison");
      setComparingFile(null);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-2 font-sans">
        <p className="font-bold text-slate-700">Delete this file permanently?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(id);
            }}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-bold"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 4000, icon: '⚠️' });
  };

  const performDelete = async (id) => {
    try {
      setDeletingId(id);
      await API.delete(`/files/${id}`);
      setFiles(files.filter(f => f._id !== id));
      toast.success("File deleted successfully");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await API.get(`/files/download/${file._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      toast.error("Download failed. File might be missing content.");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return "Unknown";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-slate-50 dark:bg-[#0a0f1e] font-sans page-enter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isAdmin ? "Admin Console: All Files" : "Shared Knowledge Base"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            {isAdmin ? "You have full control to manage all data." : "View shared files. You can only delete your own."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20">
          <FileText className="w-4 h-4" />
          {files.length} Total Files
        </span>
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : files.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800/40 rounded-2xl flex items-center justify-center mb-5">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-semibold">No files found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-700/30">
                    <th className="pl-6 py-4 w-12 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {deletableIds.length > 0 && (
                        <input
                          type="checkbox"
                          checked={selectedIds.size === deletableIds.length && deletableIds.length > 0}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = selectedIds.size > 0 && selectedIds.size < deletableIds.length;
                            }
                          }}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800 cursor-pointer"
                          title="Select all deletable files"
                        />
                      )}
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">File</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/30">
                  {files.map((file) => {
                    const canDelete = isAdmin || file.owner === currentUsername;
                    return (
                      <tr key={file._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="pl-6 py-4 w-12">
                          {canDelete ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(file._id)}
                              onChange={() => toggleSelectFile(file._id)}
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800 cursor-pointer"
                            />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" title="Read Only" />
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 max-w-[220px] truncate" title={file.filename}>{file.filename}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 w-fit px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-100 dark:border-slate-700/30">
                            <User className="w-3 h-3" /> {file.owner}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div>
                              {file.is_duplicate ? (
                                <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-200/50 dark:border-amber-500/20 uppercase tracking-wider">Duplicate</span>
                              ) : file.is_near_duplicate ? (
                                <span className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold border border-purple-200/50 dark:border-purple-500/20 uppercase tracking-wider">Near Duplicate</span>
                              ) : (
                                <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-500/20 uppercase tracking-wider">Unique</span>
                              )}
                            </div>
                            {file.dlp_violations && file.dlp_violations.length > 0 && (
                              <div 
                                className="flex items-center gap-1 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit"
                                title={`Violated Policies: ${file.dlp_violations.join(', ')}`}
                              >
                                <ShieldAlert className="w-3 h-3" /> DLP ALERT
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{formatSize(file.size)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(file.upload_date)}</td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                          {file.is_near_duplicate && file.compare_file_id && (
                            <button 
                              onClick={() => handleCompare(file)} 
                              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-all" 
                              title="Compare Side-by-Side"
                            >
                              <GitCompare className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => setPreviewFile(file)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" title="Preview"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleDownload(file)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all" title="Download"><Download className="w-4 h-4" /></button>
                          {canDelete ? (
                            <button onClick={() => handleDelete(file._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          ) : (
                            <div className="p-2 text-slate-200 dark:text-slate-700 cursor-not-allowed" title="Read Only"><Lock className="w-4 h-4" /></div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {files.map((file) => {
              const canDelete = isAdmin || file.owner === currentUsername;
              return (
                <div key={file._id} className="glass-card p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      {canDelete ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(file._id)}
                          onChange={() => toggleSelectFile(file._id)}
                          className="w-4 h-4 mt-1 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800 cursor-pointer shrink-0"
                        />
                      ) : (
                        <Lock className="w-3.5 h-3.5 mt-1 text-slate-300 dark:text-slate-600 shrink-0" title="Read Only" />
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 break-all leading-tight">{file.filename}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {file.owner}</span>
                          <span>•</span>
                          <span>{formatSize(file.size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {file.is_duplicate ? (
                        <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full text-[10px] font-bold border border-amber-200/50 dark:border-amber-500/20">Duplicate</span>
                      ) : file.is_near_duplicate ? (
                        <span className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-full text-[10px] font-bold border border-purple-200/50 dark:border-purple-500/20">Near Duplicate</span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-500/20">Unique</span>
                      )}
                      {file.dlp_violations && file.dlp_violations.length > 0 && (
                        <span 
                          className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-full text-[10px] font-bold border border-red-200/50 dark:border-red-500/20 flex items-center gap-1"
                          title={`Violations: ${file.dlp_violations.join(', ')}`}
                        >
                          <ShieldAlert className="w-3 h-3" /> DLP Alert
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100/80 dark:border-slate-700/20">
                    <span className="text-xs text-slate-400">{formatDate(file.upload_date)}</span>
                    <div className="flex gap-1.5">
                      {file.is_near_duplicate && file.compare_file_id && (
                        <button onClick={() => handleCompare(file)} className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg transition-all hover:bg-purple-100 dark:hover:bg-purple-500/20"><GitCompare className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => setPreviewFile(file)} className="p-2 bg-slate-50 dark:bg-slate-800/40 text-slate-500 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-700"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleDownload(file)} className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg transition-all hover:bg-blue-100 dark:hover:bg-blue-500/20"><Download className="w-4 h-4" /></button>
                      {canDelete && (
                        <button onClick={() => handleDelete(file._id)} className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg transition-all hover:bg-red-100 dark:hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700/40 flex items-center justify-between gap-4 animate-slide-up-fade">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">{selectedIds.size} files selected</p>
              <p className="text-[10px] text-slate-400 mt-1">Authorized for secure deletion</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 active:scale-[0.95] text-xs font-bold text-white rounded-lg shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {bulkDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* --- SIDE-BY-SIDE DIFF COMPARISON MODAL --- */}
      {comparingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-slide-up-fade">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200/60 dark:border-slate-700/40">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/30 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base truncate max-w-md">Similarity Diff Analysis</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Comparing uploaded file with its matching original source document.</p>
                </div>
              </div>
              <button
                onClick={() => { setComparingFile(null); setFile1Text(""); setFile2Text(""); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 bg-slate-50 dark:bg-[#080d1a] p-6 overflow-auto flex flex-col relative">
              {compareLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                  <p className="font-medium text-slate-500 dark:text-slate-400">Performing text extraction and diff calculation...</p>
                </div>
              ) : (
                <div className="flex flex-col h-full gap-6">
                  
                  {/* Circle Gauge Metrics Card */}
                  <div className="glass-card p-5 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      {/* Circle Gauge */}
                      <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="32" className="text-slate-100 dark:text-slate-800" strokeWidth="6" stroke="currentColor" fill="transparent" />
                          <circle 
                            cx="40" cy="40" 
                            r="32" 
                            className="text-purple-500 transition-all duration-1000 ease-out" 
                            strokeWidth="6" 
                            strokeDasharray={2 * Math.PI * 32} 
                            strokeDashoffset={2 * Math.PI * 32 - (comparingFile.similarity_score / 100) * 2 * Math.PI * 32} 
                            strokeLinecap="round" 
                            stroke="currentColor" 
                            fill="transparent" 
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-lg font-extrabold text-slate-800 dark:text-white leading-none">{comparingFile.similarity_score}%</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Match</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-extrabold text-slate-800 dark:text-white text-base">Document Jaccard Similarity</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md">
                          This file has been identified as a <strong className="text-purple-600 dark:text-purple-400">Near Duplicate</strong>. Content is structurally and semantically matching the original database entry.
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Original Base File</span>
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-200 mt-1">{comparingFile.compare_filename}</span>
                    </div>
                  </div>

                  {/* Split Pane Diff Panels */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[40vh] h-full overflow-hidden">
                    
                    {/* Left Pane (Base/Original File) */}
                    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/40 rounded-xl flex flex-col overflow-hidden shadow-sm h-full">
                      <div className="bg-slate-50/80 dark:bg-slate-800/30 px-4 py-2.5 border-b border-slate-200/60 dark:border-slate-700/30 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Original Reference</span>
                        <span className="text-[10px] bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-200/50 dark:border-red-500/20">Source Document</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-600 dark:text-slate-300 space-y-1 h-full">
                        {file2Text.split(/\r?\n/).map((line, idx) => {
                          const matchingLine = file1Text.split(/\r?\n/)[idx];
                          const isDifferent = matchingLine !== line;
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-start py-0.5 px-2 rounded ${
                                isDifferent && line !== undefined
                                  ? 'bg-red-50/80 dark:bg-red-500/5 text-red-700 dark:text-red-300 border-l-2 border-red-500 font-medium' 
                                  : ''
                              }`}
                            >
                              <span className="w-8 shrink-0 text-slate-400 select-none text-right pr-3 font-sans font-bold">{idx + 1}</span>
                              <span className="whitespace-pre-wrap break-all">{line}</span>
                            </div>
                          );
                        })}
                        {file2Text.trim().length === 0 && (
                          <div className="text-center py-20 text-slate-400 font-sans">Original document contains no extractable plain text.</div>
                        )}
                      </div>
                    </div>

                    {/* Right Pane (New Uploaded File) */}
                    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/40 rounded-xl flex flex-col overflow-hidden shadow-sm h-full">
                      <div className="bg-slate-50/80 dark:bg-slate-800/30 px-4 py-2.5 border-b border-slate-200/60 dark:border-slate-700/30 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">New Near-Duplicate</span>
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-500/20">Uploaded Copy</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-600 dark:text-slate-300 space-y-1 h-full">
                        {file1Text.split(/\r?\n/).map((line, idx) => {
                          const matchingLine = file2Text.split(/\r?\n/)[idx];
                          const isDifferent = matchingLine !== line;
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-start py-0.5 px-2 rounded ${
                                isDifferent && line !== undefined
                                  ? 'bg-emerald-50/80 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-l-2 border-emerald-500 font-medium' 
                                  : ''
                              }`}
                            >
                              <span className="w-8 shrink-0 text-slate-400 select-none text-right pr-3 font-sans font-bold">{idx + 1}</span>
                              <span className="whitespace-pre-wrap break-all">{line}</span>
                            </div>
                          );
                        })}
                        {file1Text.trim().length === 0 && (
                          <div className="text-center py-20 text-slate-400 font-sans">Uploaded document contains no extractable plain text.</div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}