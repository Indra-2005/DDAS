import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail, Heart } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pt-16 pb-8 font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="md:col-span-1 space-y-4">
                        <Link to="/" className="font-black text-2xl text-slate-900 dark:text-white tracking-tighter flex items-center gap-1">
                            DDAS<span className="text-blue-600 text-3xl">.</span>
                        </Link>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Advanced Deduplication Data Analysis System. optimising storage and ensuring data integrity with state-of-the-art hashing algorithms.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <SocialIcon icon={Github} href="#" />
                            <SocialIcon icon={Twitter} href="#" />
                            <SocialIcon icon={Linkedin} href="#" />
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-6">Platform</h4>
                        <ul className="space-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                            <li><Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link></li>
                            <li><Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Analytics</Link></li>
                            <li><Link to="/upload" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Upload & Scan</Link></li>
                            <li><Link to="/profile" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">User Profile</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-6">Resources</h4>
                        <ul className="space-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                            <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Documentation</a></li>
                            <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">API Reference</a></li>
                            <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Security</a></li>
                            <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Status</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-6">Contact</h4>
                        <ul className="space-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                            <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@ddas.dev</li>
                            <li>123 Data Center.<br />Maharashtra, IN</li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-400 text-xs font-medium">
                        &copy; {currentYear} DDAS Inc. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Terms of Service</a>
                        <span className="flex items-center gap-1 text-slate-300">
                            Made with <Heart className="w-3 h-3 text-red-400 fill-current" /> by Team
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialIcon({ icon: Icon, href }) {
    return (
        <a
            href={href}
            className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-white hover:bg-black dark:hover:bg-blue-600 rounded-lg transition-all"
        >
            <Icon className="w-4 h-4" />
        </a>
    );
}
