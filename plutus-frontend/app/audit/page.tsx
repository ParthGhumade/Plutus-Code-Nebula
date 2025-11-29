'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import Link from 'next/link';

export default function AuditPage() {
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                const log = await api.getAuditLog('user123');
                setAuditLog(log);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAudit();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <img src="/icon1.jpg" alt="Plutus" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-xl font-bold text-gray-800">Plutus</span>
                </div>
                <div className="flex items-center space-x-4">
                    <Link href="/" className="text-gray-600 hover:text-teal-600">Dashboard</Link>
                    <Link href="/scenarios" className="text-gray-600 hover:text-teal-600">Scenarios</Link>
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
                    <button className="text-teal-600 text-sm font-medium hover:underline">Export CSV</button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading audit logs...</div>
                    ) : auditLog.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No activity recorded yet.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {auditLog.map((entry, idx) => (
                                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${entry.action === 'APPROVE' ? 'bg-green-100 text-green-700' :
                                                        entry.action === 'OVERRIDE' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {entry.action}
                                                </span>
                                                <span className="text-sm font-semibold text-gray-900">{entry.actor}</span>
                                                <span className="text-xs text-gray-400">• {new Date(entry.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-gray-700 mb-2">{entry.details}</p>

                                            {/* Hash Chain Visualization */}
                                            <div className="flex items-center text-xs font-mono bg-gray-50 p-2 rounded border border-gray-100">
                                                <span className="text-gray-400 mr-2">Hash:</span>
                                                <span className="text-teal-600 truncate w-32 md:w-auto">{entry.audit_hash}</span>
                                                <span className="mx-2 text-gray-300">←</span>
                                                <span className="text-gray-400 mr-2">Prev:</span>
                                                <span className="text-gray-500 truncate w-32 md:w-auto">{entry.prev_hash}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
