import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, FileText, HardDrive, 
  Activity, RefreshCw, Server
} from 'lucide-react';

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

      const response = await fetch("http://localhost:8000/dashboard/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        localStorage.removeItem("ddas_token");
        navigate("/login");
        return;
      }
      
      if (!response.ok) throw new Error("Failed to load");
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
            <p className="text-slate-500 mt-1">Real-time analysis of your data integrity.</p>
          </div>
          <button 
            onClick={fetchStats} 
            className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-sm font-semibold text-slate-700"
          >
            <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:rotate-180 transition-all duration-500" /> 
            Sync Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard 
            title="Total Files" 
            value={stats.total_files} 
            icon={FileText} 
            trend="Files indexed"
            color="blue"
          />
          <StatCard 
            title="Duplicates Found" 
            value={stats.duplicates} 
            icon={AlertTriangle} 
            trend="Requires action"
            alert={stats.duplicates > 0}
            color="amber"
          />
          <StatCard 
            title="Storage Saved" 
            value={stats.storage_saved} 
            icon={HardDrive} 
            trend="Optimized"
            color="emerald"
          />
           <StatCard 
            title="Server Status" 
            value="Active" 
            icon={Activity} 
            trend="99.9% Uptime"
            color="violet"
          />
        </div>

        {/* Main Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 relative">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Upload Activity (Last 7 Days)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.recent_activity}>
                  <defs>
                    <linearGradient id="colorFiles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="files" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorFiles)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Server className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              
              <h3 className="text-2xl font-bold mb-2">System Healthy</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                The duplication detection engine is running optimally. 
                Current algorithm efficiency is rated at <span className="text-white font-semibold">High</span>.
              </p>
            </div>
            
            <div className="space-y-4">
               <div>
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Storage Usage</span>
                   <span className="font-mono text-emerald-400 text-sm">{stats.storage_used}</span>
                 </div>
                 <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-emerald-400 h-full rounded-full w-1/3 animate-pulse"></div>
                 </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


function StatCard({ title, value, icon: Icon, trend, alert, color }) {
  const colorStyles = {
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
    violet: "text-violet-600 bg-violet-50",
  };

  const activeColor = colorStyles[color] || colorStyles.blue;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl transition-colors ${activeColor} group-hover:scale-110 duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
        {alert && (
           <span className="flex h-3 w-3 relative">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
           </span>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
        <div className="flex items-center mt-1 gap-2">
           <p className="text-sm font-medium text-slate-500">{title}</p>
           {trend && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{trend}</span>}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;