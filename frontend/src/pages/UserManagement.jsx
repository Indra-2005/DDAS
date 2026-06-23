/**
 * @file UserManagement.jsx
 * @description Admin user management panel with role promotion/demotion, account
 * deletion, user search, and per-user file statistics within the tenant company.
 */
import React, { useEffect, useState } from 'react';
import { Users, Trash2, Shield, Star, RefreshCcw, Search, ChevronRight, FileCheck, Copy, Key, X, Calendar, User, AlertTriangle, Activity, ShieldAlert, Lock } from 'lucide-react';
import toast from "react-hot-toast";
import API from '../api';
import { TableSkeleton } from '../components/Skeleton';

/**
 * User Management Component.
 * Admin-only page to view, edit, reset passwords, and delete company users.
 * @returns {JSX.Element} The User Management page.
 */
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ddas_token");
      const res = await API.get("/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
      
      const codeRes = await API.get("/admin/invite-code", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteCode(codeRes.data.invite_code);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load user information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
  }, []);

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
    if (!newPassword) {
      toast.error("Please enter a temporary password");
      return;
    }
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
      <div className="flex flex-col gap-3 p-1 font-sans">
        <div>
          <p className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" /> Terminate user access?
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">This will permanently revoke system access for <strong>{username}</strong>.</p>
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
              performDelete(username);
            }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            Confirm
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
      toast.success("User terminated successfully");
      setSelectedUser(null);
    } catch (err) {
      toast.error("Delete operation failed.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden">
      {/* Subtle brand background highlight */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.02] dark:bg-blue-500/[0.01] blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Team Registry
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage system employee profiles, configure security settings, and reset credentials.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Find team member..."
              className="w-full md:w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm dark:text-white placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchUsers} 
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm active:scale-95"
            title="Reload Registry"
          >
            <RefreshCcw className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Invite Code Dashboard Hub */}
      {inviteCode && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200/60 dark:border-blue-800/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.04),transparent_50%)] pointer-events-none" />
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-200/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Company Onboarding Hub</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Provide this credential token to new team members during system registration.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm self-start md:self-auto relative z-10 group-hover:border-blue-500/35 transition-all">
            <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Token Code</span>
            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 tracking-wider bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200/50 dark:border-slate-800">{inviteCode}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                toast.success("Invite token copied!");
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
              title="Copy Code"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Roster Grid Table view */}
      {loading ? (
        <TableSkeleton cols={2} />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Company Employee Identity</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center hidden md:table-cell">Clearance Group</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const userIsAdmin = user.role?.toLowerCase() === "admin";
                const isSelected = selectedUser?._id === user._id;

                return (
                  <tr
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className={`group cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-50/30 dark:bg-blue-900/10' 
                        : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <td className="px-6 py-4 flex items-center gap-4 relative">
                      {/* Active indicator line */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${isSelected ? 'bg-blue-600' : 'bg-transparent'}`} />
                      
                      {/* Custom styled circle role avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white shadow-sm border border-white/10 ${
                        userIsAdmin 
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-orange-500/10' 
                          : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/10'
                      }`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200 block text-sm tracking-tight">{user.username}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                          Joined {getJoinDate(user._id)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center hidden md:table-cell">
                      {userIsAdmin ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                          <Star className="w-3 h-3 fill-amber-500" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                          <User className="w-3 h-3" /> Member
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <ChevronRight className={`inline transition-all w-5 h-5 ${
                        isSelected ? 'text-blue-600 translate-x-1' : 'text-slate-300 dark:text-slate-700 group-hover:text-blue-600'
                      }`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500">
              <AlertTriangle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="font-bold text-sm uppercase tracking-wider">No Registry Matches</p>
              <p className="text-xs mt-1">Try a different search parameter.</p>
            </div>
          )}
        </div>
      )}

      {/* --- ACCOUNT INTEL SLIDE DRAWER --- */}
      {selectedUser && (
        <>
          {/* Drawer Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/10 dark:bg-black/30 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => { setSelectedUser(null); setResettingUser(null); setNewPassword(""); }}
          />

          {/* Drawer Side Panel */}
          <div className="fixed top-0 right-0 w-full max-w-[440px] h-screen bg-white dark:bg-slate-900 shadow-2xl z-50 animate-in slide-in-from-right duration-300 ease-out flex flex-col border-l border-slate-200 dark:border-slate-800 font-sans">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Account Information</h2>
              </div>
              <button 
                onClick={() => { setSelectedUser(null); setResettingUser(null); setNewPassword(""); }} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold text-white shadow-sm shrink-0 border border-white/10 ${
                  selectedUser.role?.toLowerCase() === "admin" 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                }`}>
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-none">{selectedUser.username}</h3>
                  <div className="mt-2.5 flex">
                    {selectedUser.role?.toLowerCase() === "admin" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold uppercase tracking-wider">
                        <Shield className="w-3 h-3" /> System Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider">
                        <User className="w-3 h-3" /> Team Employee
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/10">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest">Originals</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{selectedUser.originals || 0}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/10">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest">Duplicates</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{selectedUser.duplicates || 0}</p>
                  </div>
                </div>
              </div>

              {/* Advanced Metadata Fields */}
              <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                <div className="flex items-center justify-between p-4 text-xs font-medium">
                  <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-300" /> Joined Date</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-200">{getJoinDate(selectedUser._id)}</span>
                </div>
                <div className="flex items-center justify-between p-4 text-xs font-medium">
                  <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider flex items-center gap-2"><Shield className="w-4 h-4 text-slate-300" /> Clearance Level</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-200 capitalize">{selectedUser.role} Account</span>
                </div>
              </div>

            </div>

            {/* Footer Control Settings */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
              
              {/* Reset Temporary Password Block */}
              {resettingUser === selectedUser.username ? (
                <div className="bg-blue-50/60 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 animate-in fade-in zoom-in duration-200">
                  <label className="block text-2xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 ml-1">Temporary Security Code</label>
                  <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                      placeholder="e.g. TempSecure1!"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => { setResettingUser(null); setNewPassword(""); }} 
                      className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleResetPassword} 
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setResettingUser(selectedUser.username)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold transition-all shadow active:scale-95 text-xs uppercase tracking-wider"
                >
                  <Key className="w-4 h-4" /> Reset Access Password
                </button>
              )}

              {/* Terminate User Button */}
              <button
                onClick={() => deleteUser(selectedUser.username)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 hover:text-white bg-transparent hover:bg-red-600 border border-red-200 dark:border-red-900/40 rounded-xl font-bold transition-colors active:scale-95 text-xs uppercase tracking-wider shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> Terminate User Account
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
}