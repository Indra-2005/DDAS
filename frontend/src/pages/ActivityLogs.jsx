import React, { useEffect, useState } from "react";
import API from "../api";
import { Clock, User, ShieldAlert, Activity, RefreshCw, Filter } from "lucide-react";
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
            case "LOGIN": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
            case "REGISTER": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
            case "UPLOAD": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
            case "DELETE_FILE": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
            case "DELETE_USER": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
            case "RESET_PASSWORD": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
            default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        }
    };

    const filteredLogs = logs.filter(log =>
        log.username.toLowerCase().includes(filter.toLowerCase()) ||
        log.action.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                            <Activity className="w-8 h-8 text-blue-600" />
                            System Audit Log
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Real-time tracking of user activities and security events.</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter by user or action..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                            title="Refresh Logs"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                {loading ? (
                    <TableSkeleton cols={4} />
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-8 py-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Timestamp</th>
                                        <th className="px-8 py-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">User</th>
                                        <th className="px-8 py-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Action</th>
                                        <th className="px-8 py-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {filteredLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-8 py-4 text-sm font-medium text-slate-500 dark:text-slate-400 font-mono">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        {log.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{log.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredLogs.length === 0 && (
                                <div className="p-12 text-center text-slate-400 font-bold">No logs found matching your filter.</div>
                            )}
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {filteredLogs.map((log) => (
                                <div key={log._id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {log.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200 block text-sm">{log.username}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {log.details}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {filteredLogs.length === 0 && (
                                <div className="p-10 text-center text-slate-400 font-bold">No logs found matching your filter.</div>
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
