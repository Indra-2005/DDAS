/**
 * @file ActivityLogs.jsx
 * @description Admin audit log viewer page. Displays a filterable, paginated timeline
 * of all system events scoped to the current tenant company.
 */
import React, { useEffect, useState } from "react";
import API from "../api";
import { Clock, User, ShieldAlert, Activity, RefreshCw, Filter, Shield, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton } from "../components/Skeleton";

export default function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await API.get("/admin/logs");
            setLogs(res.data);
        } catch (err) {
            toast.error("Failed to load logs. Admin access required.");
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case "LOGIN": return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
            case "REGISTER": return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
            case "UPLOAD": return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
            case "DELETE_FILE": return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
            case "DELETE_USER": return "bg-red-500/10 text-red-500 border border-red-500/20";
            case "RESET_PASSWORD": return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
            default: return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
        }
    };

    const filteredLogs = logs.filter(log =>
        (log.username && log.username.toLowerCase().includes(filter.toLowerCase())) ||
        (log.action && log.action.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0a0f1e] p-6 md:p-10 font-sans relative overflow-hidden page-enter">
            {/* Background Accent Gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/5 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-200/60 dark:border-slate-800/60 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/15 rounded-xl border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                <Activity className="w-6 h-6" />
                            </div>
                            System Audit Log
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Real-time tracking of user activities, file transactions, and security events.</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto self-end">
                        <div className="relative flex-1 md:w-72">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by user or action..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white/75 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm shadow-sm"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 text-slate-600 dark:text-slate-400"
                            title="Refresh Logs"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                {loading ? (
                    <div className="glass-card p-6"><TableSkeleton cols={4} /></div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block glass-card overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-850">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Timestamp</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">User</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Action</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                    {filteredLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors">
                                            <td className="px-8 py-4 text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                                        {log.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{log.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-sm text-slate-600 dark:text-slate-350 font-medium">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredLogs.length === 0 && (
                                <div className="p-16 text-center text-slate-400 dark:text-slate-500 font-bold">No audit logs found matching the filters.</div>
                            )}
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {filteredLogs.map((log) => (
                                <div key={log._id} className="glass-card p-5 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                                {log.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">{log.username}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 block">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {log.details}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {filteredLogs.length === 0 && (
                                <div className="glass-card p-12 text-center text-slate-400 dark:text-slate-500 font-bold">No audit logs found matching the filters.</div>
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
