/**
 * @file Profile.jsx
 * @description User profile page showing account details, password change form,
 * personal storage statistics, and API encryption key fingerprint.
 */
import React, { useEffect, useState } from "react";
import API from "../api";
import { User, Key, Save, HardDrive, Calendar, Lock, CheckCircle, Cloud, Shield, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { ProfileSkeleton } from "../components/Skeleton";

/**
 * User Profile Component.
 * Allows users to view their account details, usage limits, and update their password.
 * @returns {JSX.Element} The Profile page layout.
 */
export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Password Change State
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });
    const [changingPass, setChangingPass] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await API.get("/users/me");
            setProfile(res.data);
        } catch (err) {
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handlePassChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const submitPasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error("New passwords do not match");
            return;
        }
        if (passwords.new.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setChangingPass(true);
        try {
            const formData = new FormData();
            formData.append("current_password", passwords.current);
            formData.append("new_password", passwords.new);

            await API.post("/users/change-password", formData);
            toast.success("Password updated successfully");
            setPasswords({ current: "", new: "", confirm: "" });
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to update password");
        } finally {
            setChangingPass(false);
        }
    };

    const getStoragePercent = () => {
        if (!profile || !profile.storage_used) return 1;
        const num = parseFloat(profile.storage_used);
        if (isNaN(num)) return 2;
        const valLower = profile.storage_used.toLowerCase();
        if (valLower.includes("gb")) {
            return Math.min(100, (num / 10) * 100);
        }
        if (valLower.includes("mb")) {
            return Math.min(100, (num / 1024) * 100);
        }
        if (valLower.includes("kb")) {
            return 1;
        }
        return 1;
    };

    if (loading) return <ProfileSkeleton />;
    if (!profile) return <div className="p-10 text-center text-red-500 font-bold">Error loading profile.</div>;

    const storagePercent = getStoragePercent();
    const isAdmin = profile.role?.toLowerCase() === "admin";

    const inputClasses = "w-full pl-10 pr-4 py-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-medium text-sm text-slate-700 dark:text-white placeholder-slate-400";

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto min-h-screen bg-slate-50 dark:bg-[#0a0f1e] font-sans relative overflow-hidden page-enter">
            {/* Subtle background brand glow */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.02] dark:bg-blue-500/[0.01] blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 dark:border-slate-700/30 pb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <User className="w-7 h-7 text-blue-500" />
                        My Profile Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                        View active system storage allocation, manage account credentials, and review user statistics.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">

                {/* Left Panel */}
                <div className="md:col-span-1 space-y-7">

                    {/* Profile avatar card */}
                    <div className="glass-card p-8 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />
                        
                        {/* Gradient-Ringed Avatar */}
                        <div className="relative mb-6 p-[3px] bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/15 transition-transform duration-300 hover:scale-[1.03]">
                            <div className="w-24 h-24 bg-white dark:bg-[#0a0f1e] rounded-full p-1">
                                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-full flex items-center justify-center text-4xl font-extrabold">
                                    {profile.username.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                            {profile.username}
                        </h2>

                        <div className="mt-4">
                            {isAdmin ? (
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    <Shield className="w-3.5 h-3.5" /> Workspace Admin
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    <User className="w-3.5 h-3.5" /> Team Employee
                                </span>
                            )}
                        </div>

                        <div className="w-full mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/30 flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined On</span>
                            <span className="text-slate-700 dark:text-slate-300 font-extrabold">{new Date(profile.joined_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Storage progress card */}
                    <div className="glass-card p-7">
                        <div className="flex items-center gap-3.5 mb-5 border-b border-slate-100 dark:border-slate-700/30 pb-4">
                            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl">
                                <Cloud className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Disk Quota</h3>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Storage Used</p>
                            <p className="text-3xl font-extrabold mt-1 tracking-tight text-slate-800 dark:text-white">{profile.storage_used || "0 Bytes"}</p>
                            
                            <div className="mt-8">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                                    <span>Disk Consumption</span>
                                    <span>{Math.round(storagePercent)}%</span>
                                </div>
                                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-full border border-slate-200/30 dark:border-slate-700/20 overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${storagePercent}%` }}
                                    />
                                </div>
                                <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <span>0 MB</span>
                                    <span>Limit: 10 GB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Panel */}
                <div className="md:col-span-2 space-y-7">

                    {/* Stats Box Grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="glass-card p-6 flex items-center gap-4 card-hover group">
                            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 group-hover:scale-110 transition-transform duration-500">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Validated Originals</p>
                                <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-0.5 tracking-tight">{profile.originals || 0}</p>
                            </div>
                        </div>

                        <div className="glass-card p-6 flex items-center gap-4 card-hover group">
                            <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-100/50 dark:border-amber-500/10 group-hover:scale-110 transition-transform duration-500">
                                <Copy className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Identified Duplicates</p>
                                <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-0.5 tracking-tight">{profile.duplicates || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Security Update Form */}
                    <div className="glass-card p-7 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-transparent" />
                        <div className="flex items-center gap-3.5 mb-8 border-b border-slate-100 dark:border-slate-700/30 pb-5">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Access Credentials</h3>
                                <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Modify your account authorization credentials securely.</p>
                            </div>
                        </div>

                        <form onSubmit={submitPasswordChange} className="space-y-5">
                            
                            {/* Current Password */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Current Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password" name="current"
                                        value={passwords.current} onChange={handlePassChange}
                                        required
                                        className={inputClasses}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 ml-1">New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Key className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password" name="new"
                                        value={passwords.new} onChange={handlePassChange}
                                        required
                                        className={inputClasses}
                                        placeholder="Enter new password (at least 6 characters)"
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Confirm New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Key className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password" name="confirm"
                                        value={passwords.confirm} onChange={handlePassChange}
                                        required
                                        className={inputClasses}
                                        placeholder="Repeat new password to confirm"
                                    />
                                </div>
                            </div>

                            <div className="pt-5 flex justify-end border-t border-slate-100 dark:border-slate-700/30">
                                <button
                                    type="submit"
                                    disabled={changingPass}
                                    className="btn-primary text-xs uppercase tracking-wider flex items-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {changingPass ? (
                                        <>
                                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <span>Saving settings...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Save Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
