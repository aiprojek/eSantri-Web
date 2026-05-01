
import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { getDashboardAnalytics, AnalyticsData } from '../../services/analyticsService';
import { generateDashboardInsight } from '../../services/aiService';

const COLORS = ['#0d9488', '#0891b2', '#4f46e5', '#7c3aed', '#c026d3', '#db2777'];

export const ExecutiveDashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [insight, setInsight] = useState<string>("Menganalisis data...");

    useEffect(() => {
        const fetch = async () => {
            const result = await getDashboardAnalytics();
            setData(result);
            setIsLoading(false);
            
            // Generate AI Insight
            const aiInsight = await generateDashboardInsight(result);
            setInsight(aiInsight);
        };
        fetch();
    }, []);

    if (isLoading || !data) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-gray-800">Analitik & Wawasan Strategis</h2>
                    <p className="text-sm text-gray-500">Visualisasi data pondok untuk mempermudah pengambilan keputusan.</p>
                </div>
                <div className="inline-flex w-fit items-center text-xs font-mono bg-white border px-3 py-1.5 rounded shadow-sm text-gray-400">
                    Sistem Cerdas (AI Ready)
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Cashflow Analysis */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <i className="bi bi-cash-stack text-green-500"></i> Tren Arus Kas (6 Bulan Terakhir)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.cashflow}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, '']}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                <Bar dataKey="income" name="Pemasukan" fill="#0d9488" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Tahfizh Activity Trends */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <i className="bi bi-graph-up-arrow text-blue-500"></i> Intensitas Setoran Tahfizh
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.tahfizhProgress}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="count" name="Jumlah Setoran" stroke="#0891b2" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Health Trends */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <i className="bi bi-heart-pulse-fill text-red-500"></i> Top Keluhan Kesehatan
                    </h3>
                    <div className="h-64 flex flex-col md:flex-row items-center">
                        <div className="w-full md:w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.healthTrends}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                    >
                                        {data.healthTrends.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 space-y-2">
                            {data.healthTrends.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        <span className="font-medium text-gray-600 truncate max-w-[120px]">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-800">{item.count} Kasus</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Santri Status Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <i className="bi bi-people-fill text-purple-500"></i> Distribusi Status Santri
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.santriStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="count" name="Jumlah" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-4 items-start shadow-sm">
                <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
                    <i className="bi bi-robot text-indigo-600 text-xl"></i>
                </div>
                <div>
                    <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                        Analisis Wawasan Santri (AI)
                        <span className="text-[10px] animate-pulse text-indigo-400 font-normal">Live Analysis</span>
                    </h4>
                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                        {insight}
                    </p>
                </div>
            </div>
        </div>
    );
};
