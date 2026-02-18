import React, { useEffect, useState } from "react";
import API from "../api";
import { User, Key, Save, HardDrive, FileText, Copy, Shield, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { ProfileSkeleton } from "../components/Skeleton";

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

    if (loading) return <ProfileSkeleton />;
    if (!profile) return <div className="p-10 text-center text-red-500">Error loading profile.</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Profile</h1>
                    <p className="text-slate-500 font-medium">Manage your account settings and view usage statistics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left Column: User Card & Stats */}
                    <div className="md:col-span-1 space-y-6">

                        {/* User Card */}
                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-4xl font-black mb-4 shadow-xl shadow-blue-200">
                                {profile.username.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-xl font-black text-slate-800">{profile.username}</h2>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase mt-2">
                                <Shield className="w-3 h-3" /> {profile.role}
                            </span>
                            <div className="mt-6 w-full pt-6 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-400">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined</span>
                                <span>{new Date(profile.joined_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Storage Stat */}
                        <div className="bg-indigo-900 rounded-[32px] p-8 shadow-lg text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><HardDrive className="w-32 h-32" /></div>
                            <p className="text-indigo-200 font-bold text-sm uppercase tracking-wider mb-1">Storage Used</p>
                            <p className="text-4xl font-black">{profile.storage_used}</p>
                            <div className="mt-4 h-2 bg-indigo-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-400 w-1/12"></div> {/* Mock progress */}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Details & Settings */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Activity Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-2 text-emerald-600">
                                    <FileCheck className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase">Originals</span>
                                </div>
                                <p className="text-3xl font-black text-slate-800">{profile.originals}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-2 text-amber-500">
                                    <Copy className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase">Duplicates</span>
                                </div>
                                <p className="text-3xl font-black text-slate-800">{profile.duplicates}</p>
                            </div>
                        </div>

                        {/* Change Password Form */}
                        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                                    <Key className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Security Settings</h3>
                                    <p className="text-slate-400 text-sm">Update your access password.</p>
                                </div>
                            </div>

                            <form onSubmit={submitPasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                                    <input
                                        type="password" name="current"
                                        value={passwords.current} onChange={handlePassChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                                        <input
                                            type="password" name="new"
                                            value={passwords.new} onChange={handlePassChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New</label>
                                        <input
                                            type="password" name="confirm"
                                            value={passwords.confirm} onChange={handlePassChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={changingPass}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {changingPass ? "Updating..." : <><Save className="w-4 h-4" /> Update Password</>}
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

function FileCheck({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
    )
}
