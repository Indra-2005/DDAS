import React, { useEffect, useState } from 'react';
import { Users, Trash2, Shield, Star, RefreshCcw, Search, ChevronRight, FileCheck, Copy, Key, X, Calendar } from 'lucide-react';
import toast from "react-hot-toast";
import API from '../api';
import { TableSkeleton } from '../components/Skeleton';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

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

  const handleResetPassword = async () => {
    if (!newPassword) return;
    try {
      const token = localStorage.getItem("ddas_token");
      const formData = new FormData();
      formData.append("username", resettingUser);
      formData.append("new_password", newPassword);
      await API.post("/admin/reset-password", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Password updated successfully.");
      setResettingUser(null);
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  };

  const deleteUser = (username) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-bold text-slate-700">Permanently remove {username}?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(username);
            }}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
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
    ), { duration: 5000 });
  };

  const performDelete = async (username) => {
    try {
      const token = localStorage.getItem("ddas_token");
      await API.delete(`/admin/users/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.username !== username));
      toast.success("User removed successfully");
      setSelectedUser(null);
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="pt-10 pb-20 px-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight tracking-tighter">Team Registry</h1>
            <p className="text-slate-400 font-medium mt-1">Manage user permissions and monitor data activity.</p>
          </div>

          <div className="flex gap-3 mt-4 md:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Find user..."
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-64 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={fetchUsers} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
              <RefreshCcw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <TableSkeleton cols={2} />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Employee Identity</th>
                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`group cursor-pointer transition-all ${selectedUser?._id === user._id ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-blue-50/20 dark:hover:bg-blue-900/10'}`}
                    >
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 block text-sm">{user.username}</span>
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
              {filteredUsers.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-bold">No results found for "{searchTerm}"</div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-all ${selectedUser?._id === user._id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl flex items-center justify-center font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 block text-sm">{user.username}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{user.role}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 w-5 h-5" />
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-10 text-center text-slate-400 font-bold">No results found</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* --- SIDE DRAWER OVERLAY --- */}
      {selectedUser && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedUser(null)}></div>
          <div className="fixed top-0 right-0 w-full max-w-[450px] h-screen bg-white dark:bg-slate-900 shadow-[-30px_0_60px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-right duration-300 ease-out flex flex-col border-l border-slate-100 dark:border-slate-800">

            {/* Drawer Header */}
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Account Intel</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center gap-6 mb-12">
                <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center text-4xl font-black shadow-2xl shadow-blue-200 dark:shadow-blue-900/20">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{selectedUser.username}</h3>
                  <p className="text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mt-1">{selectedUser.role} Profile</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <FileCheck className="text-emerald-500 mb-3 w-6 h-6" />
                  <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{selectedUser.originals || 0}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase mt-2">Original Files</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <Copy className="text-orange-500 mb-3 w-6 h-6" />
                  <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{selectedUser.duplicates || 0}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase mt-2">Duplicate Files</p>
                </div>
              </div>

              {/* Meta Data */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
                <div className="flex items-center justify-between p-4">
                  <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-2"><Calendar className="w-4 h-4" /> Registration Date</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{getJoinDate(selectedUser._id)}</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-2"><Shield className="w-4 h-4" /> Security Group</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-sm capitalize">{selectedUser.role}</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              {resettingUser === selectedUser.username ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl animate-in fade-in zoom-in duration-300">
                  <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">New Temporary Password</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="Enter new password"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleResetPassword} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700">Save</button>
                    <button onClick={() => { setResettingUser(null); setNewPassword(""); }} className="flex-1 bg-blue-200 text-blue-800 py-2 rounded-xl text-xs font-bold hover:bg-blue-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setResettingUser(selectedUser.username)}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:bg-blue-600 dark:hover:bg-slate-200 transition-all shadow-lg active:scale-95"
                >
                  <Key className="w-4 h-4" /> Reset Access Password
                </button>
              )}
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