/**
 * @file Dashboard.jsx
 * @description Main analytics dashboard with tenant-scoped KPI cards, upload trend
 * charts via Recharts, and recent activity feeds from the /dashboard endpoint.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  AlertTriangle, CheckCircle, FileText, HardDrive,
  Activity, RefreshCw, Server, ShieldAlert, Sparkles
} from 'lucide-react';
import { DashboardSkeleton } from '../components/Skeleton';

const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981'];

/**
 * Administrator Dashboard Component.
 * Visualizes system metrics, storage allocation, and DLP incident trends over time.
 * @returns {JSX.Element} The Dashboard overview page.
 */
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ddas_token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await API.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("ddas_token");
        navigate("/login");
      }
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (!stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Unable to Load Analytics</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-6">
          Could not retrieve system statistics from the backend server.
        </p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const topHoarders = stats.top_hoarders || [];
  const dlpTrends = stats.dlp_trends || [];
  const reclaimedTimeline = stats.reclaimed_timeline || [];

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-10 font-sans page-enter">
      <div className="max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Overview</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Real-time analysis of corporate data integrity, storage efficiency, and security.</p>
          </div>
          <button
            onClick={fetchStats}
            className="group flex items-center gap-2 px-5 py-2.5 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/40 shadow-sm rounded-xl hover:border-blue-400/50 hover:shadow-md transition-all text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:rotate-180 transition-all duration-700" />
            Sync Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard
            title="Total Files"
            value={stats.total_files}
            icon={FileText}
            trend="Files indexed"
            color="blue"
            delay="0"
          />
          <StatCard
            title="Duplicates Found"
            value={stats.duplicates}
            icon={AlertTriangle}
            trend="Requires action"
            alert={stats.duplicates > 0}
            color="amber"
            delay="100"
          />
          <StatCard
            title="Storage Saved"
            value={stats.storage_saved}
            icon={HardDrive}
            trend="Optimized"
            color="emerald"
            delay="200"
          />
          <StatCard
            title="Near Duplicates"
            value={stats.near_duplicates || 0}
            icon={Activity}
            trend="Semantically similar"
            color="violet"
            delay="300"
          />
        </div>

        {/* Row 1: Cumulative Savings & Security Incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Cumulative Reclaimed Storage Area Chart */}
          <div className="lg:col-span-2 glass-card p-7 relative overflow-hidden">
            {/* Subtle accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <HardDrive className="w-4 h-4 text-emerald-500" />
              </div>
              Cumulative Storage Reclaimed (Last 7 Days)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reclaimedTimeline}>
                  <defs>
                    <linearGradient id="colorReclaimed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="[&>line]:stroke-slate-100 dark:[&>line]:stroke-slate-800/60" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MB" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px -8px rgb(0 0 0 / 0.12)', background: 'white', fontSize: 13 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="saved_mb"
                    name="Saved Space"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorReclaimed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Security Incidents Donut Chart */}
          <div className="glass-card p-7 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-red-400 to-transparent" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10">
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              Compliance Violations
            </h3>

            {dlpTrends.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Corporate Index Secure</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[200px]">No credentials, credit cards, or key leaks identified in active documents.</p>
              </div>
            ) : (
              <div className="h-60 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dlpTrends}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dlpTrends.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px -8px rgb(0 0 0 / 0.12)', fontSize: 13 }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-slate-700/30">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                OCR and Regex scans run continuously on plain text, PDFs, and scanned image logs.
              </div>
            </div>
          </div>

        </div>

        {/* Row 2: Top Space Hoarders & Upload Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Top Space Hoarders Bar Chart */}
          <div className="lg:col-span-2 glass-card p-7 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Top Duplicate Uploaders (Space Wasted)
            </h3>
            
            {topHoarders.length === 0 ? (
              <div className="h-80 flex flex-col items-center justify-center text-center p-4">
                <p className="text-sm font-medium text-slate-400">No duplicate space wasted. Excellent deduplication efficiency!</p>
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topHoarders} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="[&>line]:stroke-slate-100 dark:[&>line]:stroke-slate-800/60" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MB" />
                    <YAxis dataKey="owner" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} width={80} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px -8px rgb(0 0 0 / 0.12)', fontSize: 13 }}
                      formatter={(value) => [`${value} MB`, 'Space Wasted']}
                    />
                    <Bar dataKey="space_wasted_mb" fill="#EF4444" radius={[0, 8, 8, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Upload Transactions Log */}
          <div className="glass-card p-7 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-blue-400 to-transparent" />
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                Upload Transactions
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.recent_activity}>
                    <defs>
                      <linearGradient id="colorFiles" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="[&>line]:stroke-slate-100 dark:[&>line]:stroke-slate-800/60" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px -8px rgb(0 0 0 / 0.12)', fontSize: 13 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="files"
                      name="Files Uploaded"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorFiles)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-slate-800/50 rounded-xl p-4 text-white flex items-center justify-between mt-4 border border-slate-800 dark:border-slate-700/30">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold">Engine Efficiency</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-500/20">
                OPTIMAL
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

function StatCard({ title, value, icon: Icon, trend, alert, color, delay }) {
  const colorStyles = {
    blue: { icon: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", glow: "hover:shadow-glow-blue" },
    amber: { icon: "text-amber-500 bg-amber-50 dark:bg-amber-500/10", glow: "hover:shadow-glow-purple" },
    emerald: { icon: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10", glow: "hover:shadow-glow-emerald" },
    violet: { icon: "text-violet-500 bg-violet-50 dark:bg-violet-500/10", glow: "hover:shadow-glow-purple" },
  };

  const style = {
    animationDelay: `${delay}ms`,
    animationFillMode: 'both'
  };

  const active = colorStyles[color] || colorStyles.blue;

  return (
    <div
      style={style}
      className={`glass-card p-6 card-hover group animate-slide-up-fade ${active.glow}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${active.icon} group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-5 h-5" />
        </div>
        {alert && (
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{value}</h3>
        <div className="flex items-center mt-1.5 gap-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          {trend && <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/50 dark:border-slate-700/30">{trend}</span>}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;