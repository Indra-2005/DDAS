import React, { useEffect, useState } from "react";
import API from "../api"; 
import { FileText, Download, Trash2, Search, Filter, AlertTriangle, CheckCircle, User, Lock } from "lucide-react";

export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  
  
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      await API.delete(`/files/${id}`);
      setFiles(files.filter(f => f._id !== id));
    } catch (err) {
      alert("Error: " + (err?.response?.data?.detail || err.message));
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
      alert("Download failed. File might be missing content.");
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
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-slate-50 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {isAdmin ? "Admin Console: All Files" : "Shared Knowledge Base"}
          </h1>
          <p className="text-slate-500 mt-1">
            {isAdmin ? "You have full control to manage all data." : "View shared files. You can only delete your own."}
          </p>
        </div>
        <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
          {files.length} Total Files
        </span>
      </div>

      {files.length === 0 && !loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
           <p className="text-slate-500">No files found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">File</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Owner</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Size</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {files.map((file) => {
                  
                  const canDelete = isAdmin || file.owner === currentUsername;

                  return (
                    <tr key={file._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{file.filename}</td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-100 w-fit px-2 py-1 rounded text-xs font-medium">
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
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{formatSize(file.size)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(file.upload_date)}</td>
                      
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        {/* Download Button (Available to Everyone) */}
                        <button 
                          onClick={() => handleDownload(file)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Delete Button (Protected) */}
                        {canDelete ? (
                          <button 
                            onClick={() => handleDelete(file._id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="p-2 text-slate-200 cursor-not-allowed" title="Read Only">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}