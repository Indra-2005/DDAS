import React from 'react';

// Basic Pulse Animation Component
export const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-shimmer bg-slate-200 dark:bg-slate-800 rounded-md ${className}`}
            {...props}
        />
    );
};

// Table Row Skeleton
export const TableRowSkeleton = ({ cols = 4 }) => {
    return (
        <tr className="border-b border-slate-50 dark:border-slate-800 last:border-0">
            {Array(cols).fill(0).map((_, i) => (
                <td key={i} className="px-8 py-4">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

// Table Skeleton Wrapper
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48 rounded-xl" />
                    <div className="flex gap-3">
                        <Skeleton className="h-10 w-64 rounded-xl" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                </div>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                        {Array(cols).fill(0).map((_, i) => (
                            <th key={i} className="px-8 py-4">
                                <Skeleton className="h-3 w-24 bg-slate-300 dark:bg-slate-700" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array(rows).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={cols} />)}
                </tbody>
            </table>
        </div>
    );
};

export const CardSkeleton = () => {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div>
                <Skeleton className="h-10 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
            </div>
        </div>
    )
}

export const DashboardSkeleton = () => {
    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <Skeleton className="h-10 w-64 mb-2" />
                        <Skeleton className="h-5 w-48" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 h-96">
                        <Skeleton className="h-6 w-48 mb-6" />
                        <Skeleton className="h-full w-full rounded-2xl" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 h-96">
                        <Skeleton className="h-6 w-48 mb-6" />
                        <div className="space-y-4">
                            {Array(5).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1">
                                        <Skeleton className="h-4 w-full mb-1" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const ProfileSkeleton = () => {
    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 md:p-10 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 md:p-12 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <Skeleton className="w-32 h-32 rounded-[2rem] shadow-2xl" />
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <Skeleton className="h-10 w-64 mx-auto md:mx-0" />
                            <div className="flex gap-2 justify-center md:justify-start">
                                <Skeleton className="h-6 w-24 rounded-full" />
                                <Skeleton className="h-6 w-32 rounded-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6 max-w-md mx-auto md:mx-0">
                                <Skeleton className="h-24 w-full rounded-2xl" />
                                <Skeleton className="h-24 w-full rounded-2xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
