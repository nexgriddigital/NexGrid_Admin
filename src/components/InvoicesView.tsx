import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Download,
  Send,
  CreditCard,
  ArrowRight,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { Invoice, Quotation, Customer, InvoiceItem } from '../types';
import { apiRequest } from '../lib/api';
import { generateInvoicePDF, generateQuotationPDF } from '../lib/pdf';

interface InvoicesViewProps {
  invoices: Invoice[];
  quotations: Quotation[];
  customers: Customer[];
  onRefresh: () => void;
  onRecordPaymentShortcut: (invoiceId: string, customerId: string, balance: number) => void;
  preselectedCustomerId?: string | null;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  quotations,
  customers,
  onRefresh,
  onRecordPaymentShortcut,
  preselectedCustomerId,
}) => {
  const [subTab, setSubTab] = useState<'invoices' | 'quotations'>('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);

  // Line items for form
  const [formData, setFormData] = useState<{
    customerId: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
    discount: number;
    taxRate: number;
    notes: string;
    terms: string;
  }>({
    customerId: preselectedCustomerId || (customers[0]?.id || ''),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'ETB',
    items: [{ description: 'Enterprise Domain & Cloud Hosting Service', quantity: 1, unitPrice: 3850 }],
    discount: 0,
    taxRate: 15,
    notes: '',
    terms: 'Payment due within 15 calendar days from issuance.',
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filtered lists
  const filteredInvoices = invoices.filter((inv) => {
    if (preselectedCustomerId && inv.customerId !== preselectedCustomerId) return false;
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.documentNumber.toLowerCase().includes(q) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q))
    );
  });

  const filteredQuotes = quotations.filter((qt) => {
    if (preselectedCustomerId && qt.customerId !== preselectedCustomerId) return false;
    if (statusFilter !== 'all' && qt.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      qt.documentNumber.toLowerCase().includes(q) ||
      (qt.customerName && qt.customerName.toLowerCase().includes(q))
    );
  });

  // Calculate live totals for the active form
  const formSubtotal = formData.items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
  const formTaxable = Math.max(0, formSubtotal - formData.discount);
  const formTax = (formTaxable * formData.taxRate) / 100;
  const formTotal = formTaxable + formTax;

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, idx) => idx !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, items: updated });
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowCreateInvoiceModal(false);
      setActionMessage('Invoice created successfully.');
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          expiryDate: formData.dueDate,
        }),
      });
      setShowCreateQuoteModal(false);
      setActionMessage('Quotation generated successfully.');
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to generate quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertQuote = async (quoteId: string, quoteNumber: string) => {
    const confirm = window.confirm(`Convert Quotation ${quoteNumber} to an active Tax Invoice?`);
    if (!confirm) return;

    try {
      await apiRequest(`/api/quotations/${quoteId}/convert-to-invoice`, {
        method: 'POST',
      });
      setActionMessage(`Quotation ${quoteNumber} converted to active invoice.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
      setSubTab('invoices');
    } catch (err: any) {
      alert(err.message || 'Failed to convert quotation.');
    }
  };

  const handleSendInvoiceReminder = async (invoiceId: string, docNumber: string) => {
    const confirm = window.confirm(`Send payment reminder SMS to customer for ${docNumber}?`);
    if (!confirm) return;

    try {
      await apiRequest(`/api/invoices/${invoiceId}/send-reminder`, {
        method: 'POST',
      });
      setActionMessage(`Reminder sent for ${docNumber}.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to send reminder.');
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

      {/* Primary Sub-Tab Switcher & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => {
                setSubTab('invoices');
                setStatusFilter('all');
              }}
              className={`px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                subTab === 'invoices' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tax Invoices ({invoices.length})</span>
            </button>
            <button
              onClick={() => {
                setSubTab('quotations');
                setStatusFilter('all');
              }}
              className={`px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                subTab === 'quotations' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Quotations & Proposals ({quotations.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'invoices' ? (
            <button
              onClick={() => {
                setFormData({
                  customerId: preselectedCustomerId || (customers[0]?.id || ''),
                  issueDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  currency: 'ETB',
                  items: [{ description: 'Enterprise Cloud Hosting Service', quantity: 1, unitPrice: 4500 }],
                  discount: 0,
                  taxRate: 15,
                  notes: '',
                  terms: 'Payment due within 15 days of invoice date.',
                });
                setShowCreateInvoiceModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setFormData({
                  customerId: preselectedCustomerId || (customers[0]?.id || ''),
                  issueDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  currency: 'ETB',
                  items: [{ description: 'System Architecture & Custom Domain Infrastructure', quantity: 1, unitPrice: 28000 }],
                  discount: 0,
                  taxRate: 15,
                  notes: '',
                  terms: 'Valid for 20 calendar days from issue date.',
                });
                setShowCreateQuoteModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Quotation</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${subTab === 'invoices' ? 'invoices' : 'quotations'} by document # or customer...`}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {subTab === 'invoices' ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize ${
                  statusFilter === st ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'Draft', 'Sent', 'Accepted', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize ${
                  statusFilter === st ? 'bg-teal-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INVOICES TABLE */}
      {subTab === 'invoices' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Client Name</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="hover:text-blue-400 text-left transition-colors"
                        >
                          {inv.documentNumber}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">{inv.customerName}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{inv.issueDate}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {inv.totalAmount.toLocaleString()} {inv.currency}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                        {inv.totalPaid.toLocaleString()} {inv.currency}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                        {inv.balanceDue.toLocaleString()} {inv.currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                              : inv.status === 'Overdue'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                              : inv.status === 'Partially Paid'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.balanceDue > 0 && (
                            <button
                              onClick={() =>
                                onRecordPaymentShortcut(inv.id, inv.customerId, inv.balanceDue)
                              }
                              title="Record Payment for this invoice"
                              className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => generateInvoicePDF(inv)}
                            title="Download PDF Tax Invoice"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {inv.balanceDue > 0 && (
                            <button
                              onClick={() => handleSendInvoiceReminder(inv.id, inv.documentNumber)}
                              title="Send SMS Payment Reminder"
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* QUOTATIONS TABLE */}
      {subTab === 'quotations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Quotation #</th>
                  <th className="py-3 px-4 font-semibold">Client Name</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Valid Until</th>
                  <th className="py-3 px-4 font-semibold text-right">Proposed Total</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No quotation records found.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((qt) => (
                    <tr key={qt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <button
                          onClick={() => setViewingQuote(qt)}
                          className="hover:text-teal-400 text-left transition-colors"
                        >
                          {qt.documentNumber}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">{qt.customerName}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{qt.issueDate}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{qt.expiryDate}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-teal-300">
                        {qt.totalAmount.toLocaleString()} {qt.currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            qt.status === 'Accepted'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                              : qt.status === 'Sent'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {qt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => generateQuotationPDF(qt)}
                            title="Download PDF Quotation"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!qt.convertedInvoiceId && (
                            <button
                              onClick={() => handleConvertQuote(qt.id, qt.documentNumber)}
                              title="Convert directly to Invoice"
                              className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium text-[11px] transition-colors flex items-center gap-1"
                            >
                              <span>Convert</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {qt.convertedInvoiceId && (
                            <span className="text-[10px] text-emerald-400 font-mono">
                              Converted
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
      )}

      {/* CREATE INVOICE OR QUOTATION MODAL */}
      {(showCreateInvoiceModal || showCreateQuoteModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>
                  {showCreateInvoiceModal ? 'Create New Tax Invoice' : 'Create Official Quotation'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setShowCreateInvoiceModal(false);
                  setShowCreateQuoteModal(false);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={showCreateInvoiceModal ? handleSaveInvoice : handleSaveQuote}
              className="mt-4 space-y-4 text-xs"
            >
              {/* Customer & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-semibold text-slate-300 mb-1">Customer *</label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.businessName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    {showCreateInvoiceModal ? 'Due Date *' : 'Valid Until *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-300">
                    Line Items & Services *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Description of item or domain service..."
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-white"
                      />
                      <input
                        type="number"
                        min={1}
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-white font-mono text-center"
                      />
                      <input
                        type="number"
                        min={0}
                        required
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                        className="w-24 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-white font-mono text-right"
                      />
                      <div className="w-24 text-right font-mono font-semibold text-slate-200">
                        {(item.quantity * item.unitPrice).toLocaleString()}
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Tax Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Discount (ETB)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      VAT Rate % (Default 15% in Ethiopia)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-right text-xs pt-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>{formSubtotal.toLocaleString()} ETB</span>
                  </div>
                  {formData.discount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Discount:</span>
                      <span>-{formData.discount.toLocaleString()} ETB</span>
                    </div>
                  )}
                  {formData.taxRate > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>VAT ({formData.taxRate}%):</span>
                      <span>{formTax.toLocaleString()} ETB</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
                    <span>Final Total:</span>
                    <span>{formTotal.toLocaleString()} ETB</span>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateInvoiceModal(false);
                    setShowCreateQuoteModal(false);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
                >
                  {submitting ? 'Saving...' : showCreateInvoiceModal ? 'Generate Invoice' : 'Generate Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
