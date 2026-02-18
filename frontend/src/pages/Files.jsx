import React, { useEffect, useState } from "react";
import API from "../api";
import { FileText, Download, Trash2, Search, Filter, AlertTriangle, CheckCircle, User, Lock, Eye } from "lucide-react";
import toast from "react-hot-toast";
import FilePreviewModal from "../components/FilePreviewModal";
import { TableSkeleton } from "../components/Skeleton";

export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);


  const role = localStorage.getItem("ddas_role");
  const currentUsername = localStorage.getItem("ddas_user");
  const isAdmin = role === "admin";

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await API.get("/files");
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to load files.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-700">Delete this file permanently?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(id);
            }}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
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
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      toast.error("Download failed. File might be missing content.");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return "Unknown";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {isAdmin ? "Admin Console: All Files" : "Shared Knowledge Base"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin ? "You have full control to manage all data." : "View shared files. You can only delete your own."}
          </p>
        </div>
        <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
          {files.length} Total Files
        </span>
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">No files found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">File</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Owner</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Size</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {files.map((file) => {
                    const canDelete = isAdmin || file.owner === currentUsername;
                    return (
                      <tr key={file._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{file.filename}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-1 rounded text-xs font-medium">
                            <User className="w-3 h-3" /> {file.owner}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {file.is_duplicate ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-bold border border-amber-100">Duplicate</span>
                          ) : (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold border border-emerald-100">Unique</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{formatSize(file.size)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(file.upload_date)}</td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <button onClick={() => setPreviewFile(file)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Preview"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleDownload(file)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                          {canDelete ? (
                            <button onClick={() => handleDelete(file._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          ) : (
                            <div className="p-2 text-slate-200 cursor-not-allowed" title="Read Only"><Lock className="w-4 h-4" /></div>
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
                <div key={file._id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white mb-1 break-all">{file.filename}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {file.owner}</span>
                        <span>•</span>
                        <span>{formatSize(file.size)}</span>
                      </div>
                    </div>
                    {file.is_duplicate ? (
                      <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold border border-amber-100">Duplicate</span>
                    ) : (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold border border-emerald-100">Unique</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                    <span className="text-xs text-slate-400">{formatDate(file.upload_date)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewFile(file)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-lg"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleDownload(file)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Download className="w-4 h-4" /></button>
                      {canDelete && (
                        <button onClick={() => handleDelete(file._id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )
      }
      {
        previewFile && (
          <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        )
      }
    </div >
  );
}