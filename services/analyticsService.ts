
import { db } from '../db';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface AnalyticsData {
    cashflow: { month: string, income: number, expense: number }[];
    healthTrends: { name: string, count: number }[];
    tahfizhProgress: { month: string, count: number }[];
    santriStats: { status: string, count: number }[];
}

export const getDashboardAnalytics = async (): Promise<AnalyticsData> => {
    // 1. Cashflow (Last 6 Months)
    const cashflow: { month: string, income: number, expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).getTime();
        const end = endOfMonth(date).getTime();
        
        const transactions = await db.transaksiKas.where('tanggal').between(start, end).toArray();
        const income = transactions.filter(t => t.jenis === 'Pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
        const expense = transactions.filter(t => t.jenis === 'Pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
        
        cashflow.push({
            month: format(date, 'MMM'),
            income,
            expense
        });
    }

    // 2. Health Trends (Top Diagnoses)
    const healthRecords = await db.kesehatanRecords.limit(500).toArray();
    const diagnosisCounts: { [key: string]: number } = {};
    healthRecords.forEach(r => {
        const diag = r.keluhan || 'Lain-lain';
        diagnosisCounts[diag] = (diagnosisCounts[diag] || 0) + 1;
    });
    const healthTrends = Object.entries(diagnosisCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    // 3. Tahfizh Progress (Last 6 Months)
    const tahfizhProgress: { month: string, count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).getTime();
        const end = endOfMonth(date).getTime();
        const count = await db.tahfizh.where('tanggal').between(start, end).count();
        tahfizhProgress.push({
            month: format(date, 'MMM'),
            count
        });
    }

    // 4. Santri Status Stats
    const santri = await db.santri.toArray();
    const stats: { [key: string]: number } = {};
    santri.forEach(s => {
        stats[s.status] = (stats[s.status] || 0) + 1;
    });
    const santriStats = Object.entries(stats).map(([status, count]) => ({ status, count }));

    return { cashflow, healthTrends, tahfizhProgress, santriStats };
};
