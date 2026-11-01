import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Receipt,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Payment, Customer, Invoice } from '../types';
import { apiRequest } from '../lib/api';

interface PaymentsViewProps {
  payments: Payment[];
  customers: Customer[];
  invoices: Invoice[];
  onRefresh: () => void;
  preselectedPaymentTarget?: {
    invoiceId?: string;
    customerId?: string;
    balance?: number;
  } | null;
  onClearPreselectedPaymentTarget?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  customers,
  invoices,
  onRefresh,
  preselectedPaymentTarget,
  onClearPreselectedPaymentTarget,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Confirmed' | 'Pending' | 'Reversed'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(Boolean(preselectedPaymentTarget));
  const [reversingPayment, setReversingPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    customerId: preselectedPaymentTarget?.customerId || (customers[0]?.id || ''),
    invoiceId: preselectedPaymentTarget?.invoiceId || '',
    amount: preselectedPaymentTarget?.balance || 3000,
    currency: 'ETB',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer' as Payment['paymentMethod'],
    referenceNumber: '',
    notes: '',
    status: 'Confirmed' as 'Confirmed' | 'Pending',
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Financial totals
  const confirmedTotal = payments
    .filter((p) => p.status === 'Confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingTotal = payments
    .filter((p) => p.status === 'Pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const reversedTotal = payments
    .filter((p) => p.status === 'Reversed')
    .reduce((sum, p) => sum + p.amount, 0);

  // Filtered payments list
  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.paymentNumber.toLowerCase().includes(q) ||
      (p.customerName && p.customerName.toLowerCase().includes(q)) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q))
    );
  });

  // When customer changes in form, find matching unpaid invoices
  const customerInvoices = invoices.filter(
    (i) => i.customerId === formData.customerId && i.status !== 'Cancelled'
  );

  const handleOpenAddModal = () => {
    const custId = customers[0]?.id || '';
    setFormData({
      customerId: custId,
      invoiceId: '',
      amount: 3000,
      currency: 'ETB',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      referenceNumber: '',
      notes: '',
      status: 'Confirmed',
    });
    setShowAddModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      if (onClearPreselectedPaymentTarget) onClearPreselectedPaymentTarget();
      setActionMessage('Payment recorded successfully.');
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPending = async (paymentId: string, payNum: string) => {
    const confirm = window.confirm(`Confirm verified receipt of payment ${payNum}?`);
    if (!confirm) return;

    try {
      await apiRequest(`/api/payments/${paymentId}/confirm`, {
        method: 'POST',
      });
      setActionMessage(`Payment ${payNum} confirmed.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm payment.');
    }
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPayment) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/payments/${reversingPayment.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: reversalReason }),
      });
      setReversingPayment(null);
      setReversalReason('');
      setActionMessage(`Payment ${reversingPayment.paymentNumber} reversed. Invoices updated.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reverse payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Confirmed Revenue (Received)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {confirmedTotal.toLocaleString()} ETB
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified and credited to accounts</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pending Verification</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {pendingTotal.toLocaleString()} ETB
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Awaiting bank slip verification (not counted in revenue)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Reversed / Corrected</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 line-through">
            {reversedTotal.toLocaleString()} ETB
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Full audit reason recorded</div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payments by receipt #, customer, reference..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            {['all', 'Confirmed', 'Pending', 'Reversed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                  statusFilter === st ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold">Receipt #</th>
                <th className="py-3 px-4 font-semibold">Client Name</th>
                <th className="py-3 px-4 font-semibold">Covering Invoice</th>
                <th className="py-3 px-4 font-semibold">Payment Method</th>
                <th className="py-3 px-4 font-semibold">Reference #</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold text-right">Amount Paid</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No payment records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">{p.paymentNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-300">{p.customerName}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-blue-400">
                      {p.invoiceNumber || 'Account Balance'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {p.referenceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {p.paymentDate.split('T')[0]}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        p.status === 'Confirmed'
                          ? 'text-emerald-400'
                          : p.status === 'Pending'
                          ? 'text-amber-400'
                          : 'text-rose-400 line-through'
                      }`}
                    >
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'Pending' && (
                          <button
                            onClick={() => handleConfirmPending(p.id, p.paymentNumber)}
                            title="Confirm Payment and update accounts"
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {p.status === 'Confirmed' && (
                          <button
                            onClick={() => {
                              setReversingPayment(p);
                              setReversalReason('');
                            }}
                            title="Reverse Payment with reason"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {p.status === 'Reversed' && p.reversalReason && (
                          <span
                            title={`Reversed: ${p.reversalReason}`}
                            className="text-[10px] text-slate-500 italic cursor-help"
                          >
                            Reason logged
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Record Customer Payment Receipt</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  if (onClearPreselectedPaymentTarget) onClearPreselectedPaymentTarget();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Customer *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => {
                    setFormData({ ...formData, customerId: e.target.value, invoiceId: '' });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Associated Invoice (Optional)
                </label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => {
                    const invId = e.target.value;
                    const selected = invoices.find((i) => i.id === invId);
                    setFormData({
                      ...formData,
                      invoiceId: invId,
                      amount: selected ? selected.balanceDue : formData.amount,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">General Account Payment / No Specific Invoice</option>
                  {customerInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.documentNumber} (Total: {inv.totalAmount.toLocaleString()} ETB, Due:{' '}
                      {inv.balanceDue.toLocaleString()} ETB)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Amount Paid (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Payment Channel / Method *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentMethod: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Bank Transfer">CBE / Bank Transfer</option>
                    <option value="Telebirr">Telebirr</option>
                    <option value="CBE Birr">CBE Birr</option>
                    <option value="Awash Bank">Awash Bank</option>
                    <option value="Cash">Cash at Office</option>
                    <option value="Other">Other Electronic Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Transaction / Slip Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBE-TX-984210"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Payment Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'Confirmed' })}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors ${
                      formData.status === 'Confirmed'
                        ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Confirmed (Received)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'Pending' })}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors ${
                      formData.status === 'Pending'
                        ? 'bg-amber-950 border-amber-600 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Pending Verification
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Accounting Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Slip uploaded, payer details, or special discounts applied..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Reversal Audit Modal */}
      {reversingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Reverse Payment ({reversingPayment.paymentNumber})</span>
              </h3>
              <button
                onClick={() => setReversingPayment(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              Reversing this payment will restore the outstanding balance on the affected invoice.
              Financial records are never deleted; an auditable reversal reason is mandatory.
            </div>

            <form onSubmit={handleExecuteReversal} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Reason for Reversal *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Bank bounced cheque / Duplicate entry error / Customer refunded..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReversingPayment(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reversalReason.trim()}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold"
                >
                  {submitting ? 'Processing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
