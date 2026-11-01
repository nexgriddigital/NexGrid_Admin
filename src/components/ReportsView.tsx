import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Globe,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { apiRequest } from '../lib/api';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs min-w-[180px]">
        <p className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>{label}</span>
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Revenue:</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {Number(data.value).toLocaleString()} ETB
            </span>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">
            Confirmed banking & Telebirr receipts
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const ReportsView: React.FC = () => {
  const [reportData, setReportData] = useState<{
    summary: {
      totalRevenue: number;
      totalInvoiced: number;
      outstandingReceivables: number;
      paymentsCount: number;
      invoicesCount: number;
    };
    methodBreakdown: Record<string, number>;
    monthlyRevenue: Record<string, number>;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'30days' | '90days' | 'year' | 'all'>('year');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/reports/financial');
      setReportData(res);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const handleDownloadCsv = (type: 'customers' | 'domains' | 'payments') => {
    const token = localStorage.getItem('nexgrid_admin_token') || '';
    fetch(`/api/reports/export/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexgrid-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Export failed: ' + err.message));
  };

  // Generate the last 6 calendar months (e.g. Jun 2026 - Nov 2026)
  const last6Months = useMemo(() => {
    const list: { key: string; monthLabel: string; shortMonth: string }[] = [];
    // Anchor to current local time or default system date
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortMonth = d.toLocaleString('en-US', { month: 'short' });
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      list.push({ key, monthLabel, shortMonth });
    }
    return list;
  }, []);

  const chartData = useMemo(() => {
    if (!reportData) return [];
    return last6Months.map((m) => {
      const revenue = reportData.monthlyRevenue[m.key] || 0;
      return {
        key: m.key,
        month: m.shortMonth,
        fullMonth: m.monthLabel,
        revenue,
      };
    });
  }, [last6Months, reportData]);

  if (loading || !reportData) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading financial analytics and reports...
      </div>
    );
  }

  const { summary, methodBreakdown, monthlyRevenue } = reportData;
  const collectionRate =
    summary.totalInvoiced > 0
      ? Math.round((summary.totalRevenue / summary.totalInvoiced) * 100)
      : 0;

  // 6-month metrics for chart header
  const total6MonthRevenue = chartData.reduce((acc, d) => acc + d.revenue, 0);
  const avgMonthlyRevenue = Math.round(total6MonthRevenue / (chartData.length || 1));
  const peakMonth = [...chartData].sort((a, b) => b.revenue - a.revenue)[0];
  const latestMonth = chartData[chartData.length - 1];
  const previousMonth = chartData[chartData.length - 2];
  const growthRate =
    previousMonth && previousMonth.revenue > 0
      ? Math.round(((latestMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Export CSV Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Financial & Operational Reports</span>
          </h2>
          <p className="text-xs text-slate-400">
            Export compliant audit sheets and review verified collections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadCsv('customers')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Customers CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv('domains')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Domains CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv('payments')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Payments CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total Verified Revenue</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {summary.totalRevenue.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">From {summary.paymentsCount} payments</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total Invoiced Amount</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {summary.totalInvoiced.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across {summary.invoicesCount} invoices</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Outstanding Receivables</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {summary.outstandingReceivables.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Pending customer settlement</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Collection Efficiency</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
            {collectionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Paid vs total billed</div>
        </div>
      </div>

      {/* Recharts Line Chart: Monthly Revenue Collection Trends (Last 6 Months) */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Monthly Revenue Collection Trend (Last 6 Months)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified collections recorded per calendar month via CBE, Telebirr, and Awash Bank
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">6-Mo Total</span>
              <span className="font-mono font-bold text-emerald-400">
                {total6MonthRevenue.toLocaleString()} ETB
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">6-Mo Average</span>
              <span className="font-mono font-bold text-blue-400">
                {avgMonthlyRevenue.toLocaleString()} ETB
              </span>
            </div>
            {peakMonth && peakMonth.revenue > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Peak Month</span>
                <span className="font-mono font-bold text-amber-400">
                  {peakMonth.fullMonth}
                </span>
              </div>
            )}
            {growthRate !== null && (
              <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                <div>
                  <span className="text-slate-400 block text-[10px]">MoM Trajectory</span>
                  <span
                    className={`font-mono font-bold flex items-center gap-0.5 ${
                      growthRate >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {growthRate >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {growthRate >= 0 ? `+${growthRate}%` : `${growthRate}%`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full min-w-0 pt-2" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="fullMonth"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                }
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                iconType="circle"
                formatter={() => (
                  <span className="text-xs text-slate-300 font-medium">
                    Verified Revenue Collections (ETB)
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="url(#revenueLineGradient)"
                strokeWidth={3}
                dot={{ r: 5, fill: '#0f172a', stroke: '#3b82f6', strokeWidth: 2.5 }}
                activeDot={{
                  r: 7,
                  fill: '#10b981',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Channels Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Revenue by Payment Method</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of funds collected via CBE, Telebirr, and Awash
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(methodBreakdown).length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No payment data recorded.</div>
            ) : (
              Object.entries(methodBreakdown).map(([method, amount]) => {
                const pct =
                  summary.totalRevenue > 0 ? Math.round((amount / summary.totalRevenue) * 100) : 0;
                return (
                  <div key={method} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">{method}</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {amount.toLocaleString()} ETB ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 6-Month Breakdown Table */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-400" />
              <span>Monthly Settlement Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed audit trail of collections per calendar month
            </p>
          </div>

          <div className="overflow-x-auto pt-1">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-2">Month</th>
                  <th className="pb-2 text-right">Collections</th>
                  <th className="pb-2 text-right">Share of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {chartData.map((d) => {
                  const share =
                    total6MonthRevenue > 0
                      ? Math.round((d.revenue / total6MonthRevenue) * 100)
                      : 0;
                  return (
                    <tr key={d.key} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-2.5 font-sans font-medium text-slate-300">
                        {d.fullMonth}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {d.revenue.toLocaleString()} ETB
                      </td>
                      <td className="py-2.5 text-right text-slate-400">
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
