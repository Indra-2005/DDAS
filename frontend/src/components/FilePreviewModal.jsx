import React, { useEffect, useState } from 'react';
import API from '../api';
import { X, Loader2, Download, FileText, Image as ImageIcon } from 'lucide-react';

export default function FilePreviewModal({ file, onClose }) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let url = null;
        const fetchContent = async () => {
            try {
                setLoading(true);
                const res = await API.get(`/files/download/${file._id}`, { responseType: 'blob' });
                url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
                setBlobUrl(url);
            } catch (err) {
                setError("Failed to load preview.");
            } finally {
                setLoading(false);
            }
        };

        if (file) fetchContent();

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [file]);

    if (!file) return null;

    const isImage = file.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPDF = file.filename.match(/\.pdf$/i);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', file.filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-lg ${isImage ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}>
                            {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <h3 className="font-bold text-slate-800 truncate max-w-md" title={file.filename}>{file.filename}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {!loading && !error && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-sm transition-colors"
                            >
                                <Download className="w-4 h-4" /> Download
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-50 overflow-auto flex items-center justify-center relative">
                    {loading && (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            <p className="font-medium text-slate-500">Loading preview...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center p-8">
                            <p className="text-red-500 font-bold mb-2">{error}</p>
                            <button onClick={onClose} className="text-slate-500 underline text-sm">Close Preview</button>
                        </div>
                    )}

                    {!loading && !error && blobUrl && (
                        <>
                            {isImage && (
                                <img src={blobUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                            )}
                            {isPDF && (
                                <iframe src={blobUrl} title="PDF Preview" className="w-full h-full" />
                            )}
                            {!isImage && !isPDF && (
                                <div className="text-center">
                                    <p className="text-slate-500 font-medium mb-4">Preview not available for this file type.</p>
                                    <button
                                        onClick={handleDownload}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg"
                                    >
                                        Download to View
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
