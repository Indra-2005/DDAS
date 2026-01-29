import React, { useEffect, useState } from 'react';
import { Users, Trash2, Shield, Star, RefreshCcw, Search, ChevronRight, FileCheck, Copy, Key, X, Calendar } from 'lucide-react';
import API from '../api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ddas_token");
      const res = await API.get("/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) { 
      console.error("Error fetching users:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchUsers(); }, []);

 
  const filteredUsers = users.filter(user => 
    user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

 
  const getJoinDate = (id) => {
    try {
      const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return "N/A";
    }
  };

  const handleResetPassword = async (username) => {
    const newPass = window.prompt(`Set temporary password for ${username}:`);
    if (!newPass) return;
    try {
      const token = localStorage.getItem("ddas_token");
      const formData = new FormData();
      formData.append("username", username);
      formData.append("new_password", newPass);
      await API.post("/admin/reset-password", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("✅ Password updated successfully.");
    } catch (err) { 
      alert("Error: " + (err.response?.data?.detail || "Update failed")); 
    }
  };

  const deleteUser = async (username) => {
    if (!window.confirm(`Permanently remove ${username}?`)) return;
    try {
      const token = localStorage.getItem("ddas_token");
      await API.delete(`/admin/users/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.username !== username));
      setSelectedUser(null);
    } catch (err) {
      alert("Delete failed.");
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans">
      <div className="pt-10 pb-20 px-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight tracking-tighter">Team Registry</h1>
            <p className="text-slate-400 font-medium mt-1">Manage user permissions and monitor data activity.</p>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Find user..." 
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl w-64 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={fetchUsers} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                <RefreshCcw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee Identity</th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr 
                  key={user._id} 
                  onClick={() => setSelectedUser(user)}
                  className={`group cursor-pointer transition-all ${selectedUser?._id === user._id ? 'bg-blue-50/50' : 'hover:bg-blue-50/20'}`}
                >
                  <td className="px-8 py-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block text-sm">{user.username}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{user.role} Member</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <ChevronRight className={`inline transition-all ${selectedUser?._id === user._id ? 'text-blue-600 translate-x-1' : 'text-slate-300'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && !loading && (
            <div className="p-20 text-center text-slate-400 font-bold">No results found for "{searchTerm}"</div>
          )}
        </div>
      </div>

      {/* --- SIDE DRAWER OVERLAY --- */}
      {selectedUser && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedUser(null)}></div>
          <div className="fixed top-0 right-0 w-full max-w-[450px] h-screen bg-white shadow-[-30px_0_60px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-right duration-300 ease-out flex flex-col">
            
            {/* Drawer Header */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <h2 className="text-xl font-black text-slate-800">Account Intel</h2>
               <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8">
               <div className="flex items-center gap-6 mb-12">
                  <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center text-4xl font-black shadow-2xl shadow-blue-200">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 leading-tight">{selectedUser.username}</h3>
                    <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">{selectedUser.role} Profile</p>
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <FileCheck className="text-emerald-500 mb-3 w-6 h-6" />
                     <p className="text-3xl font-black text-slate-800 leading-none">{selectedUser.originals || 0}</p>
                     <p className="text-[11px] font-bold text-slate-400 uppercase mt-2">Original Files</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <Copy className="text-orange-500 mb-3 w-6 h-6" />
                     <p className="text-3xl font-black text-slate-800 leading-none">{selectedUser.duplicates || 0}</p>
                     <p className="text-[11px] font-bold text-slate-400 uppercase mt-2">Duplicate Files</p>
                  </div>
               </div>

               {/* Meta Data */}
               <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50">
                  <div className="flex items-center justify-between p-4">
                     <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-2"><Calendar className="w-4 h-4"/> Registration Date</span>
                     <span className="font-bold text-slate-700 text-sm">{getJoinDate(selectedUser._id)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                     <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-2"><Shield className="w-4 h-4"/> Security Group</span>
                     <span className="font-bold text-slate-700 text-sm capitalize">{selectedUser.role}</span>
                  </div>
               </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-8 border-t border-slate-50 bg-slate-50/50 space-y-3">
               <button 
                onClick={() => handleResetPassword(selectedUser.username)}
                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg active:scale-95"
               >
                 <Key className="w-4 h-4" /> Reset Access Password
               </button>
               <button 
                onClick={() => deleteUser(selectedUser.username)}
                className="w-full py-4 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition-all"
               >
                 Terminate User Account
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}