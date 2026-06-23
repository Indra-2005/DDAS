/**
 * @file NotFound.jsx
 * @description 404 error page for unmatched routes with navigation back to home.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MoveLeft, ShieldOff } from 'lucide-react';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e] flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="max-w-md w-full page-enter">
                {/* Large 404 Text with Gradient */}
                <h1 className="text-9xl md:text-[150px] font-black leading-none gradient-text-animated select-none">
                    404
                </h1>

                <div className="-mt-6 relative z-10">
                    <div className="w-16 h-16 mx-auto bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-5">
                        <ShieldOff className="w-8 h-8 text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-2 tracking-tight">Page Not Found</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto text-sm">
                        The page you are looking for might have been removed, renamed, or is temporarily unavailable.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="btn-secondary flex items-center justify-center gap-2 group"
                        >
                            <MoveLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Go Back
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="btn-primary flex items-center justify-center gap-2"
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
