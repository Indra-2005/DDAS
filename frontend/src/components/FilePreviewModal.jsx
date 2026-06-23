/**
 * @file FilePreviewModal.jsx
 * @description Modal overlay for previewing uploaded file metadata, rendering inline
 * previews for supported types (PDF, images, text), and providing download/delete actions.
 */
import React, { useEffect, useState } from 'react';
import API from '../api';
import toast from 'react-hot-toast';
import { 
    X, Loader2, Download, FileText, Image as ImageIcon, 
    ShieldAlert, Search, ChevronLeft, ChevronRight, Sparkles 
} from 'lucide-react';

// Lightweight CSV Splitter supporting quotes
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const splitCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' || char === "'") {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = splitCSVLine(lines[0]);
    const rows = lines.slice(1).map(splitCSVLine);
    return { headers, rows };
}

// Collapsible JSON tree explorer node
function JSONNode({ name, value, depth = 0 }) {
    const [expanded, setExpanded] = useState(depth < 2);

    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);

    const toggle = () => setExpanded(!expanded);

    if (isObject) {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            return (
                <div style={{ paddingLeft: `${depth * 16}px` }} className="font-mono text-xs py-1">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">{name}: </span>
                    <span className="text-slate-500 dark:text-slate-400">{isArray ? '[]' : '{}'}</span>
                </div>
            );
        }
        return (
            <div style={{ paddingLeft: `${depth * 16}px` }} className="font-mono text-xs py-1">
                <div className="flex items-center gap-1 cursor-pointer select-none" onClick={toggle}>
                    <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-150 inline-block text-[10px]" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">{name}: </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-sans">
                        {isArray ? `Array(${keys.length})` : `Object(${keys.length})`}
                    </span>
                </div>
                {expanded && (
                    <div className="border-l border-slate-200 dark:border-slate-800 ml-2.5 pl-3.5 mt-1 space-y-1">
                        {keys.map(key => (
                            <JSONNode key={key} name={key} value={value[key]} depth={0} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Leaf nodes formatting
    let valStr = String(value);
    let valClass = "text-slate-800 dark:text-slate-200";
    if (typeof value === 'string') {
        valStr = `"${value}"`;
        valClass = "text-emerald-600 dark:text-emerald-400 font-medium";
    } else if (typeof value === 'number') {
        valClass = "text-blue-600 dark:text-blue-400 font-medium";
    } else if (typeof value === 'boolean') {
        valClass = "text-amber-600 dark:text-amber-400 font-bold";
    } else if (value === null) {
        valStr = "null";
        valClass = "text-slate-400 font-italic";
    }

    return (
        <div style={{ paddingLeft: `${depth * 16}px` }} className="font-mono text-xs py-1">
            <span className="text-purple-600 dark:text-purple-400 font-bold">{name}: </span>
            <span className={valClass}>{valStr}</span>
        </div>
    );
}

export default function FilePreviewModal({ file, onClose }) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dynamic states for interactive CSV and JSON viewers
    const [rawText, setRawText] = useState("");
    const [parsedCSV, setParsedCSV] = useState(null);
    const [parsedJSON, setParsedJSON] = useState(null);
    const [csvPage, setCsvPage] = useState(1);
    const [csvSearch, setCsvSearch] = useState("");

    // Summarization states
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

    useEffect(() => {
        let url = null;
        let active = true;
        const fetchContent = async () => {
            try {
                setLoading(true);
                const res = await API.get(`/files/download/${file._id}`, { responseType: 'blob' });
                if (!active) return;
                
                url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
                setBlobUrl(url);

                // Fetch raw text to parse for JSON/CSV/Text/Code
                const isCSV = file.filename.match(/\.csv$/i);
                const isJSON = file.filename.match(/\.json$/i);
                const isTextCode = file.filename.match(/\.(txt|py|js|jsx|ts|tsx|html|css|md|xml|yaml|yml|sh|bash|bat|sql|c|cpp|h|hpp|cs|java|go|rs|php|rb|log)$/i);
                if (isCSV || isJSON || isTextCode) {
                    const text = await res.data.text();
                    setRawText(text);
                    if (isCSV) {
                        setParsedCSV(parseCSV(text));
                    } else if (isJSON) {
                        try {
                            setParsedJSON(JSON.parse(text));
                        } catch (e) {
                            setError("Invalid JSON formatting found. Unable to render tree.");
                        }
                    }
                }
            } catch (err) {
                if (active) setError("Failed to load preview content.");
            } finally {
                if (active) setLoading(false);
            }
        };

        const fetchSummary = async () => {
            try {
                setSummaryLoading(true);
                setSummary(null);
                const res = await API.get(`/files/summary/${file._id}`);
                if (active) {
                    setSummary(res.data.summary);
                }
            } catch (err) {
                console.error("Failed to load summary", err);
            } finally {
                if (active) setSummaryLoading(false);
            }
        };

        if (file) {
            fetchContent();
            
            const isCSV = file.filename.match(/\.csv$/i);
            const isJSON = file.filename.match(/\.json$/i);
            const isTextCode = file.filename.match(/\.(txt|py|js|jsx|ts|tsx|html|css|md|xml|yaml|yml|sh|bash|bat|sql|c|cpp|h|hpp|cs|java|go|rs|php|rb|log)$/i);
            const isPDF = file.filename.match(/\.pdf$/i);
            const isImage = file.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            
            if (isCSV || isJSON || isTextCode || isPDF || isImage || file.has_sensitive_content) {
                fetchSummary();
            }
        }

        return () => {
            active = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [file]);

    if (!file) return null;

    const isImage = file.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPDF = file.filename.match(/\.pdf$/i);
    const isCSV = file.filename.match(/\.csv$/i);
    const isJSON = file.filename.match(/\.json$/i);
    const isTextCode = file.filename.match(/\.(txt|py|js|jsx|ts|tsx|html|css|md|xml|yaml|yml|sh|bash|bat|sql|c|cpp|h|hpp|cs|java|go|rs|php|rb|log)$/i);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = blobUrl || "#";
        link.setAttribute('download', file.filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    // Filter CSV lines based on search keyword
    const filteredCsvRows = parsedCSV ? parsedCSV.rows.filter(row => 
        row.some(cell => cell.toLowerCase().includes(csvSearch.toLowerCase()))
    ) : [];

    const pageSize = 10;
    const totalCsvPages = Math.ceil(filteredCsvRows.length / pageSize);
    const paginatedCsvRows = filteredCsvRows.slice((csvPage - 1) * pageSize, csvPage * pageSize);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-lg ${isImage ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                            {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white truncate max-w-md" title={file.filename}>{file.filename}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {!loading && !error && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 font-bold text-sm transition-colors"
                            >
                                <Download className="w-4 h-4" /> Download
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-auto flex flex-col items-center p-6 relative">
                    
                    {/* Security DLP Hazard Alert */}
                    {file.dlp_violations && file.dlp_violations.length > 0 && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3 w-full max-w-4xl animate-pulse">
                            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-extrabold text-rose-800 dark:text-rose-400 text-sm">Security Policy Violation</h4>
                                <p className="text-xs text-rose-600 dark:text-rose-400/80 mt-1">
                                    DLP scanning detected sensitive credentials or personal identifiable information (PII) inside this document.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {file.dlp_violations.map((violation, i) => (
                                        <span key={i} className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded text-[10px] font-black uppercase tracking-wider">
                                            {violation}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Smart Summary Card */}
                    {(summary || summaryLoading) && (
                        <div className="w-full max-w-4xl mb-6 bg-gradient-to-br from-indigo-500/[0.04] via-purple-500/[0.04] to-pink-500/[0.04] dark:from-indigo-500/[0.08] dark:via-purple-500/[0.08] dark:to-pink-500/[0.08] backdrop-blur-md border border-indigo-200/40 dark:border-indigo-800/30 rounded-2xl p-5 shadow-lg shadow-indigo-500/[0.02] dark:shadow-none transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                        <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                                    </div>
                                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 font-sans tracking-tight">AI Document Summary</span>
                                    <span className="text-[9px] font-sans font-black uppercase tracking-wider bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                                        Secure Offline NLP
                                    </span>
                                </div>
                                {summary && (
                                    <button 
                                        onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 select-none"
                                    >
                                        {isSummaryExpanded ? "Hide Summary" : "Show Summary"}
                                    </button>
                                )}
                            </div>
                            
                            {summaryLoading && (
                                <div className="flex items-center gap-2.5 mt-4 text-slate-500 dark:text-slate-400 text-xs">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                    <span className="animate-pulse">Analyzing document contents and generating local summary...</span>
                                </div>
                            )}
                            
                            {!summaryLoading && summary && isSummaryExpanded && (
                                <div className="mt-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed border-l-2 border-indigo-500/40 pl-4 font-sans italic bg-white/30 dark:bg-slate-900/30 p-3.5 rounded-xl border border-indigo-100/10">
                                    {summary}
                                </div>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            <p className="font-medium text-slate-500 dark:text-slate-400">Loading preview...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <p className="text-red-500 font-bold mb-2">{error}</p>
                            <button onClick={onClose} className="text-slate-500 dark:text-slate-400 underline text-sm">Close Preview</button>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center">
                            {isImage && blobUrl && (
                                <img src={blobUrl} alt="Preview" className="max-w-full max-h-[60vh] object-contain shadow-lg rounded-lg" />
                            )}
                            
                            {isPDF && blobUrl && (
                                <iframe src={blobUrl} title="PDF Preview" className="w-full h-[60vh] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" />
                            )}

                            {/* Spreadsheet CSV Grid View */}
                            {isCSV && parsedCSV && (
                                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-full min-h-[50vh]">
                                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
                                        <div className="relative w-full sm:w-72">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input 
                                                type="text" 
                                                value={csvSearch}
                                                onChange={(e) => { setCsvSearch(e.target.value); setCsvPage(1); }}
                                                placeholder="Filter rows..." 
                                                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
                                            Showing {filteredCsvRows.length} of {parsedCSV.rows.length} rows
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-auto border border-slate-100 dark:border-slate-800 rounded-lg max-h-[45vh]">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                                                    {parsedCSV.headers.map((h, i) => (
                                                        <th key={i} className="px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{h || `Col ${i+1}`}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {paginatedCsvRows.map((row, ri) => (
                                                    <tr key={ri} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        {row.map((cell, ci) => (
                                                            <td key={ci} className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-mono max-w-[200px] truncate" title={cell}>{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {paginatedCsvRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={parsedCSV.headers.length} className="text-center py-8 text-slate-400">No matching entries found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalCsvPages > 1 && (
                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-xs text-slate-400">Page {csvPage} of {totalCsvPages}</span>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    disabled={csvPage === 1}
                                                    onClick={() => setCsvPage(p => Math.max(1, p - 1))}
                                                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded disabled:opacity-50 text-slate-500 dark:text-slate-400"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    disabled={csvPage === totalCsvPages}
                                                    onClick={() => setCsvPage(p => Math.min(totalCsvPages, p + 1))}
                                                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded disabled:opacity-50 text-slate-500 dark:text-slate-400"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Interactive JSON Collapsible Tree View */}
                            {isJSON && parsedJSON && (
                                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-h-[60vh] overflow-y-auto flex flex-col h-full text-left">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Interactive JSON Explorer</h4>
                                    <div className="flex-1 overflow-x-auto">
                                        <JSONNode name="root" value={parsedJSON} depth={0} />
                                    </div>
                                </div>
                            )}

                             {/* Text & Code File Viewer */}
                            {isTextCode && rawText !== undefined && (
                                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[50vh] text-left">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Code / Text Document</h4>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(rawText);
                                                toast.success("Content copied to clipboard!");
                                            }}
                                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold shadow-sm"
                                        >
                                            Copy to Clipboard
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800 max-h-[55vh] flex font-mono text-xs leading-relaxed">
                                        <div className="select-none text-right pr-4 border-r border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 min-w-[2.5rem]">
                                            {rawText.split(/\r?\n/).map((_, i) => (
                                                <div key={i}>{i + 1}</div>
                                            ))}
                                        </div>
                                        <pre className="pl-4 flex-1 whitespace-pre-wrap break-all text-slate-800 dark:text-slate-200 overflow-x-auto">
                                            <code>{rawText}</code>
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {!isImage && !isPDF && !isCSV && !isJSON && !isTextCode && (
                                <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 w-full">
                                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">Preview not available for this file type.</p>
                                    <button
                                        onClick={handleDownload}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all transform active:scale-95"
                                    >
                                        Download to View
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
