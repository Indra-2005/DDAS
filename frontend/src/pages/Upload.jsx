/**
 * @file Upload.jsx
 * @description File upload page with drag-and-drop. Handles multipart uploads and
 * displays duplicate/near-duplicate/DLP violation results from the backend.
 */
import React, { useState, useRef } from "react";
import { UploadCloud, File, CheckCircle, AlertTriangle, Loader2, RefreshCw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import API from "../api";

/**
 * File Upload Component.
 * Drag-and-drop interface for uploading files to the backend for analysis and storage.
 * @returns {JSX.Element} The Upload page layout.
 */
export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile.size > 10 * 1024 * 1024 * 1024) {
      toast.error("File too large! Max size is 10GB.");
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setUploadError(null);
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const isNetworkError = !err.response && (err.message === 'Failed to fetch' || err.message.includes('Network'));
      const message = status === 413
        ? "File too large for server limits."
        : detail || err.message || "Upload failed";
      setUploadError({
        message,
        canRetry: isNetworkError
      });
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e] flex items-center justify-center p-6 font-sans page-enter">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Upload Data</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Securely hash and store your documents.</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-premium border border-slate-200/60 dark:border-slate-700/40 overflow-hidden relative p-8 md:p-12 backdrop-blur-xl">
          {!result && (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-300 ${
                dragActive 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/5 shadow-glow-blue" 
                  : "border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20"
              }`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <input
                ref={inputRef} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange} disabled={uploading}
              />

              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold mt-5">Hashing & Uploading...</p>
                  <p className="text-slate-400 text-sm mt-1">Computing SHA-256 fingerprint</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
                    <File className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-bold text-slate-700 dark:text-white">{file.name}</p>
                  <p className="text-sm text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <div className="flex flex-wrap gap-3 mt-7 justify-center">
                    <button onClick={(e) => { e.preventDefault(); removeFile(); }} className="px-6 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all">Cancel</button>
                    <button onClick={(e) => { e.preventDefault(); uploadFile(); }} className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 active:scale-[0.97] transition-all">Upload Now</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center pointer-events-none">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/60 text-slate-400 rounded-2xl flex items-center justify-center mb-5 animate-float-slow">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Click or Drag file here</p>
                  <p className="text-slate-400 text-sm mt-2">Supports PDF, DOCX, JPG & large files (Max 10GB)</p>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-5">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Upload Failed</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">{uploadError.message}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={removeFile} className="btn-secondary text-sm">Cancel</button>
                {uploadError.canRetry && (
                  <button onClick={uploadFile} className="btn-primary text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry Upload
                  </button>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="text-center py-6 page-enter">
              <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                result.is_duplicate
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/20"
                  : result.is_near_duplicate
                  ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/20"
                  : "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/20"
              }`}>
                {result.is_duplicate || result.is_near_duplicate
                  ? <AlertTriangle className="w-10 h-10" />
                  : <CheckCircle className="w-10 h-10" />}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">
                {result.is_duplicate
                  ? "Duplicate Detected!"
                  : result.is_near_duplicate
                  ? "Near Duplicate Detected!"
                  : "Upload Successful!"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-3 text-sm">
                {result.is_duplicate
                  ? "System found an existing copy. Linked to save space."
                  : result.is_near_duplicate
                  ? "File content is highly similar to an existing file (different order or minor changes)."
                  : "File securely hashed and stored."}
              </p>
              {result.is_near_duplicate && result.similarity_score > 0 && (
                <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200/50 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                  <span>Jaccard Similarity: {result.similarity_score}%</span>
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <button onClick={removeFile} className="btn-secondary text-sm">Upload Another</button>
                <button onClick={() => navigate("/files")} className="btn-primary text-sm">View Files</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}