import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MoveLeft } from 'lucide-react';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="max-w-md w-full">
                {/* Large 404 Text with Gradient */}
                <h1 className="text-9xl md:text-[150px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-slate-200 to-slate-50 dark:from-slate-800 dark:to-slate-950 select-none animate-in fade-in zoom-in duration-700">
                    404
                </h1>

                <div className="-mt-10 relative z-10">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Page Not Found</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                        Oops! The page you are looking for might have been removed or is temporarily unavailable.
                    </p>

                    {/* Search Bar - Visual Only */}
                    <div className="max-w-xs mx-auto mb-8 relative">
                        <input
                            type="text"
                            placeholder="Search files..."
                            className="w-full px-4 py-3 pl-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && navigate('/files')}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-2 group"
                        >
                            <MoveLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Go Back
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-black dark:hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                            <Home className="w-4 h-4" /> Home Page
                        </button>
                    </div>
                </div>
            </div>

            {/* Decorative footer */}
            <div className="absolute bottom-10 text-slate-300 dark:text-slate-700 text-xs font-bold uppercase tracking-widest">
                DDAS System Error
            </div>
        </div>
    );
}
