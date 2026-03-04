import React, { useEffect, useState } from "react";
import API from "../api";
import { AlertTriangle, Trash2, Database, ShieldAlert, ArrowRight, User } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminScanner() {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      const res = await API.get("/admin/global-duplicates");
      setDuplicates(res.data);
    } catch (err) {
      setError("Access Denied: You must be an Admin to view this.");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-700">Remove this duplicate copy?</p>
        <p className="text-xs text-slate-500">Other copies will remain safe.</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(id);
            }}
            className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
          >
            Confirm
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 5000, icon: '🛡️' });
  };

  const performDelete = async (id) => {
    try {
      await API.delete(`/files/${id}`);
      fetchDuplicates();
      toast.success("Duplicate removed");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Scanning Database...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
          Global Deduplication Scanner
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          The system found <strong>{duplicates.length}</strong> groups of identical files spread across different users.
        </p>
      </div>

      {duplicates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl text-center shadow-sm border border-slate-200 dark:border-slate-800">
          <Database className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">System Clean</h3>
          <p className="text-slate-500 dark:text-slate-400">No global duplicates detected across user accounts.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {duplicates.map((group) => (
            <div key={group._id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

              { }
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Hash Match Group</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: {group._id.substring(0, 15)}...</p>
                  </div>
                </div>
                <div className="text-left md:text-right w-full md:w-auto pl-12 md:pl-0">
                  <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">{group.count} Copies Found</span>
                  <span className="block text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Wasting {formatSize(group.total_size)}
                  </span>
                </div>
              </div>

              { }
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {group.files.map((file, index) => (
                  <div key={file._id} className="px-6 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      {index === 0 ? (
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-1 rounded font-bold shrink-0">Original</span>
                      ) : (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-1 rounded font-bold shrink-0">Copy</span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">{file.filename}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" /> Uploaded by <span className="font-bold">{file.owner}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3 pl-14 md:pl-0">
                      <span className="text-xs text-slate-400">
                        {new Date(file.upload_date).toLocaleDateString()}
                      </span>

                      { }
                      {group.files.length > 1 && (
                        <button
                          onClick={() => handleDelete(file._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Remove this copy"
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
  );
}