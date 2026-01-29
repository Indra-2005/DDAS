import React, { useEffect, useState } from "react";
import API from "../api"; 
import { AlertTriangle, Trash2, Database, ShieldAlert, ArrowRight, User } from "lucide-react";

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

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this duplicate copy? The other copies will remain safe.")) return;
    try {
      await API.delete(`/files/${id}`);
      fetchDuplicates(); 
    } catch (err) {
      alert("Failed to delete");
    }
  };

  if (loading) return <div className="p-10 text-center">Scanning Database...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen bg-slate-50 font-sans">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
          Global Deduplication Scanner
        </h1>
        <p className="text-slate-500 mt-2">
          The system found <strong>{duplicates.length}</strong> groups of identical files spread across different users.
        </p>
      </div>

      {duplicates.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center shadow-sm border border-slate-200">
          <Database className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">System Clean</h3>
          <p className="text-slate-500">No global duplicates detected across user accounts.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {duplicates.map((group) => (
            <div key={group._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              
              { }
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Hash Match Group</h3>
                    <p className="text-xs text-slate-500 font-mono">ID: {group._id.substring(0, 15)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-slate-700">{group.count} Copies Found</span>
                  <span className="block text-xs text-amber-600 font-medium">
                    Wasting {formatSize(group.total_size)}
                  </span>
                </div>
              </div>

              {}
              <div className="divide-y divide-slate-50">
                {group.files.map((file, index) => (
                  <div key={file._id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      {index === 0 ? (
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">Original</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">Copy</span>
                      )}
                      
                      <div>
                         <p className="font-medium text-slate-700 text-sm">{file.filename}</p>
                         <p className="text-xs text-slate-500 flex items-center gap-1">
                           <User className="w-3 h-3" /> Uploaded by <span className="font-bold">{file.owner}</span>
                         </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                       <span className="text-xs text-slate-400">
                         {new Date(file.upload_date).toLocaleDateString()}
                       </span>
                       
                       { }
                       {group.files.length > 1 && (
                         <button 
                           onClick={() => handleDelete(file._id)}
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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