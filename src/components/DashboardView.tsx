import React from 'react';
import {
  Users,
  Globe,
  AlertTriangle,
  Clock,
  TrendingUp,
  Receipt,
  FileCheck2,
  Send,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { DashboardStats, Payment, AuditLog } from '../types';

interface DashboardViewProps {
  stats: DashboardStats;
  upcomingRenewals: Array<{
    id: string;
    domainName: string;
    customerId: string;
    customerName: string;
    expirationDate: string;
    daysLeft: number;
    renewalPrice: number;
    currency: string;
  }>;
  recentPayments: Payment[];
  recentActivity: AuditLog[];
  onNavigate: (view: string) => void;
  onSendDomainReminder: (domainId: string) => void;
  onRenewDomainModal: (domainId: string) => void;
  onAddCustomerClick: () => void;
  onAddDomainClick: () => void;
  onAddInvoiceClick: () => void;
  onAddPaymentClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  upcomingRenewals,
  recentPayments,
  recentActivity,
  onNavigate,
  onSendDomainReminder,
  onRenewDomainModal,
  onAddCustomerClick,
  onAddDomainClick,
  onAddInvoiceClick,
  onAddPaymentClick,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white">NexGrid Digital Systems Operations</h2>
          <p className="text-xs text-slate-400">
            Real-time domain expirations, payment reconciliations, and automated notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddCustomerClick}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Customer</span>
          </button>
          <button
            onClick={onAddDomainClick}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Domain</span>
          </button>
          <button
            onClick={onAddInvoiceClick}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Invoice</span>
          </button>
          <button
            onClick={onAddPaymentClick}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Customers</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalCustomers}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{stats.activeCustomers} active</span>
            <span>in system</span>
          </div>
        </div>

        {/* Expiring Soon Domains */}
        <div
          onClick={() => onNavigate('domains')}
          className={`p-4 rounded-xl bg-slate-900 border cursor-pointer transition-all ${
            stats.expiringSoonDomains > 0 ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Expiring Soon (≤30d)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats.expiringSoonDomains}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{stats.activeDomains} active domains</span>
          </div>
        </div>

        {/* Expired Domains */}
        <div
          onClick={() => onNavigate('domains')}
          className={`p-4 rounded-xl bg-slate-900 border cursor-pointer transition-all ${
            stats.expiredDomains > 0 ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Expired Domains</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">{stats.expiredDomains}</div>
          <div className="text-[11px] text-slate-400 mt-1">Require immediate renewal follow-up</div>
        </div>

        {/* Confirmed Payments Revenue */}
        <div
          onClick={() => onNavigate('payments')}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Confirmed Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
            {stats.totalPaymentsReceived.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified bank & telebirr receipts</div>
        </div>
      </div>

      {/* Secondary Financial Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => onNavigate('invoices')}
          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700"
        >
          <div>
            <div className="text-xs text-slate-400">Outstanding Receivables</div>
            <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {stats.totalOutstandingBalance.toLocaleString()} ETB
            </div>
          </div>
          <span className="text-[11px] text-slate-400 px-2 py-1 rounded bg-slate-800">
            {stats.unpaidInvoicesCount} unpaid invoices
          </span>
        </div>

        <div
          onClick={() => onNavigate('invoices')}
          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700"
        >
          <div>
            <div className="text-xs text-slate-400">Overdue Invoices</div>
            <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
              {stats.overdueInvoicesCount} Invoices
            </div>
          </div>
          <ShieldAlert className="w-5 h-5 text-rose-400" />
        </div>

        <div
          onClick={() => onNavigate('invoices')}
          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700"
        >
          <div>
            <div className="text-xs text-slate-400">Pending Quotations</div>
            <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
              {stats.pendingQuotationsCount} Proposals
            </div>
          </div>
          <FileCheck2 className="w-5 h-5 text-blue-400" />
        </div>
      </div>

      {/* Main Content: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Domains Approaching Expiration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Upcoming Domain Expirations</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated reminders schedule on intervals (30, 14, 7, 3, 1 day)
                </p>
              </div>

              <button
                onClick={() => onNavigate('domains')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <span>View all domains</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-4 font-semibold">Domain Name</th>
                    <th className="py-2.5 px-4 font-semibold">Client</th>
                    <th className="py-2.5 px-4 font-semibold">Expiration</th>
                    <th className="py-2.5 px-4 font-semibold">Days Left</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Price</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {upcomingRenewals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No domains approaching expiration within 30 days.
                      </td>
                    </tr>
                  ) : (
                    upcomingRenewals.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {item.domainName}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{item.customerName}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {item.expirationDate}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              item.daysLeft <= 3
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/70'
                                : item.daysLeft <= 14
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/70'
                                : 'bg-blue-950/80 text-blue-300 border border-blue-800/70'
                            }`}
                          >
                            {item.daysLeft} {item.daysLeft === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {item.renewalPrice.toLocaleString()} {item.currency}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onSendDomainReminder(item.id)}
                              title="Send instant SMS/Email reminder"
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            >
                              <Send className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button
                              onClick={() => onRenewDomainModal(item.id)}
                              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition-colors"
                            >
                              Renew
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Confirmed Payments */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Recent Payments Received</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only confirmed receipts count as received revenue
                </p>
              </div>

              <button
                onClick={() => onNavigate('payments')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <span>View all payments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-4 font-semibold">Receipt #</th>
                    <th className="py-2.5 px-4 font-semibold">Client</th>
                    <th className="py-2.5 px-4 font-semibold">Method</th>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-300">
                          {p.paymentNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">{p.customerName}</td>
                        <td className="py-3 px-4 text-slate-400">{p.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {p.paymentDate.split('T')[0]}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {p.amount.toLocaleString()} {p.currency}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === 'Confirmed'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                : p.status === 'Pending'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-800/60 line-through'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): System Activity / Audit Feed */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">System Audit Trail</h3>
                <p className="text-xs text-slate-400 mt-0.5">Immutable administrative log</p>
              </div>
              <button
                onClick={() => onNavigate('settings')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <span>Full log</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">No recent activity.</div>
              ) : (
                recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-blue-400 font-mono">{log.action}</span>
                      <span className="text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{log.details}</p>
                    <div className="text-[10px] text-slate-500 pt-0.5 flex items-center justify-between">
                      <span>By: {log.performedBy}</span>
                      <span className="capitalize">{log.entityType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
