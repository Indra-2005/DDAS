import React, { useState, useRef } from "react";
import { UploadCloud, File, CheckCircle, AlertTriangle, Loader2, RefreshCw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import API from "../api";

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
    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error("File too large! Max size is 100MB.");
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

      if (res.status === 413) {
        throw new Error("File too large for server limits.");
      }

      setResult(res.data);
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.message.includes('Network');
      setUploadError({
        message: err.message || "Upload failed",
        canRetry: isNetworkError
      });
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Upload Data</h1>
          <p className="text-slate-500 dark:text-slate-400">Securely hash and store your documents.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative p-8 md:p-12">
          {!result && (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 ${dragActive ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50"
                }`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <input
                ref={inputRef} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange} disabled={uploading}
              />

              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Hashing & Uploading...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center z-10">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                    <File className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-bold text-slate-700 dark:text-white">{file.name}</p>
                  <p className="text-sm text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    <button onClick={(e) => { e.preventDefault(); removeFile(); }} className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                    <button onClick={(e) => { e.preventDefault(); uploadFile(); }} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg">Upload Now</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center pointer-events-none">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Click or Drag file here</p>
                  <p className="text-slate-400 text-sm mt-2">Supports PDF, DOCX, JPG (Max 100MB)</p>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Upload Failed</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{uploadError.message}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={removeFile} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                {uploadError.canRetry && (
                  <button onClick={uploadFile} className="px-5 py-2 bg-slate-900 font-bold text-white rounded-xl hover:bg-slate-800 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry Upload
                  </button>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="text-center py-6">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                result.is_duplicate
                  ? "bg-amber-100 text-amber-600"
                  : result.is_near_duplicate
                  ? "bg-purple-100 text-purple-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}>
                {result.is_duplicate || result.is_near_duplicate
                  ? <AlertTriangle className="w-10 h-10" />
                  : <CheckCircle className="w-10 h-10" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                {result.is_duplicate
                  ? "Duplicate Detected!"
                  : result.is_near_duplicate
                  ? "Near Duplicate Detected!"
                  : "Upload Successful!"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-2">
                {result.is_duplicate
                  ? "System found an existing copy. Linked to save space."
                  : result.is_near_duplicate
                  ? "File content is highly similar to an existing file (different order or minor changes)."
                  : "File securely hashed and stored."}
              </p>
              {result.is_near_duplicate && result.similarity_score > 0 && (
                <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                  <span>Jaccard Similarity: {result.similarity_score}%</span>
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <button onClick={removeFile} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold">Upload Another</button>
                <button onClick={() => navigate("/files")} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold">View Files</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}