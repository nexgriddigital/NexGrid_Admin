import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Globe,
  Receipt,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  Archive,
  RotateCcw,
  Edit,
  X,
  ExternalLink,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { Customer, Domain, Invoice, Payment, MessageLog } from '../types';
import { apiRequest } from '../lib/api';

interface CustomersViewProps {
  customers: Customer[];
  onRefresh: () => void;
  onSelectCustomer: (id: string) => void;
  onAddDomainForCustomer: (customerId: string) => void;
  onAddInvoiceForCustomer: (customerId: string) => void;
  onAddPaymentForCustomer: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onRefresh,
  onAddDomainForCustomer,
  onAddInvoiceForCustomer,
  onAddPaymentForCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<{
    customer: Customer;
    domains: Domain[];
    invoices: Invoice[];
    quotations: any[];
    payments: Payment[];
    messages: MessageLog[];
    financialSummary: { totalInvoiced: number; totalPaid: number; outstandingBalance: number };
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'invoices' | 'payments' | 'messages'>('overview');

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.businessName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const loadCustomerDetails = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingDetails(true);
    try {
      const res = await apiRequest(`/api/customers/${id}`);
      setCustomerDetails(res);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      businessName: '',
      contactPerson: '',
      phone: '+251',
      email: '',
      address: '',
      notes: '',
    });
    setDuplicateWarning(null);
    setAllowDuplicate(false);
    setModalError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      businessName: c.businessName,
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email,
      address: c.address || '',
      notes: c.notes || '',
    });
    setDuplicateWarning(null);
    setModalError(null);
    setShowAddModal(true);
  };

  const handlePhoneOrEmailBlur = async () => {
    if (editingCustomer) return; // skip for existing
    if (!formData.phone && !formData.email) return;

    try {
      const res = await apiRequest<{ exists: boolean; message?: string }>('/api/customers/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({
          phone: formData.phone,
          email: formData.email,
        }),
      });
      if (res.exists) {
        setDuplicateWarning(res.message || 'Matching customer phone or email detected.');
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingCustomer) {
        await apiRequest(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest('/api/customers', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            allowDuplicate,
          }),
        });
      }
      setShowAddModal(false);
      onRefresh();
      if (selectedCustomerId) {
        loadCustomerDetails(selectedCustomerId);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to save customer record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async (c: Customer) => {
    const action = c.status === 'archived' ? 'unarchive' : 'archive';
    const confirm = window.confirm(
      `Are you sure you want to ${action} "${c.businessName}"?\nNote: All associated invoices, domain records, and payment history will remain intact.`
    );
    if (!confirm) return;

    try {
      await apiRequest(`/api/customers/${c.id}/archive`, { method: 'POST' });
      onRefresh();
      if (selectedCustomerId === c.id) {
        loadCustomerDetails(c.id);
      }
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone, email, or ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'archived' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Archived
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold">Business / Client Name</th>
                <th className="py-3 px-4 font-semibold">Contact Person</th>
                <th className="py-3 px-4 font-semibold">Phone Number</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold text-center">Domains</th>
                <th className="py-3 px-4 font-semibold text-right">Invoiced</th>
                <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No customers found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-400">{c.id}</td>
                    <td className="py-3 px-4 font-bold text-white">
                      <button
                        onClick={() => loadCustomerDetails(c.id)}
                        className="hover:text-blue-400 text-left transition-colors"
                      >
                        {c.businessName}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.contactPerson}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-[160px]">{c.email || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 font-mono text-[11px] text-slate-300">
                        {c.domainsCount || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {(c.totalInvoiced || 0).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-amber-400">
                      {(c.outstandingBalance || 0).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.status === 'active'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => loadCustomerDetails(c.id)}
                          title="View Profile & Records"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          title="Edit Details"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(c)}
                          title={c.status === 'archived' ? 'Unarchive Customer' : 'Archive Customer'}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          {c.status === 'archived' ? (
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
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

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left">
            {loadingDetails || !customerDetails ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Loading customer profile...
              </div>
            ) : (
              <>
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                        {customerDetails.customer.id}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                          customerDetails.customer.status === 'active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {customerDetails.customer.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">
                      {customerDetails.customer.businessName}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Contact: {customerDetails.customer.contactPerson}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(customerDetails.customer)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => setSelectedCustomerId(null)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Financial Summary Strip */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 border-b border-slate-800 text-xs text-center font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total Invoiced</div>
                    <div className="font-bold text-white mt-0.5">
                      {customerDetails.financialSummary.totalInvoiced.toLocaleString()} ETB
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Payments Confirmed</div>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {customerDetails.financialSummary.totalPaid.toLocaleString()} ETB
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Outstanding Due</div>
                    <div className="font-bold text-amber-400 mt-0.5">
                      {customerDetails.financialSummary.outstandingBalance.toLocaleString()} ETB
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center px-4 border-b border-slate-800 text-xs bg-slate-900">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('domains')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'domains'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Domains</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                      {customerDetails.domains.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'invoices'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Invoices</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                      {customerDetails.invoices.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'payments'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Payments</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                      {customerDetails.payments.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`py-3 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'messages'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Messages</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
                      {customerDetails.messages.length}
                    </span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <h4 className="font-bold text-white text-sm">Contact Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>{customerDetails.customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>{customerDetails.customer.email || 'No email registered'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-300 sm:col-span-2">
                            <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <span>{customerDetails.customer.address || 'No billing address provided'}</span>
                          </div>
                        </div>
                      </div>

                      {customerDetails.customer.notes && (
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                          <h4 className="font-bold text-white text-sm mb-1.5">Service Notes & History</h4>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {customerDetails.customer.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          onClick={() => onAddDomainForCustomer(customerDetails.customer.id)}
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Add New Domain</span>
                        </button>
                        <button
                          onClick={() => onAddInvoiceForCustomer(customerDetails.customer.id)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Create Invoice</span>
                        </button>
                        <button
                          onClick={() => onAddPaymentForCustomer(customerDetails.customer.id)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Record Payment</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DOMAINS */}
                  {activeTab === 'domains' && (
                    <div className="space-y-3">
                      {customerDetails.domains.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No domains registered for this customer yet.
                        </div>
                      ) : (
                        customerDetails.domains.map((dom) => (
                          <div
                            key={dom.id}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>{dom.domainName}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    dom.status === 'Active'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : dom.status === 'Expiring Soon'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                >
                                  {dom.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                                <span>Expires: {dom.expirationDate}</span>
                                <span>Registrar: {dom.registrar || 'NexGrid'}</span>
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-sm text-slate-200">
                              {dom.renewalPrice.toLocaleString()} {dom.currency}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: INVOICES */}
                  {activeTab === 'invoices' && (
                    <div className="space-y-3">
                      {customerDetails.invoices.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No invoices generated for this customer yet.
                        </div>
                      ) : (
                        customerDetails.invoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white text-xs font-mono flex items-center gap-2">
                                <span>{inv.documentNumber}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    inv.status === 'Paid'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : inv.status === 'Overdue'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Issued: {inv.issueDate} • Due: {inv.dueDate}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-xs text-white">
                                {inv.totalAmount.toLocaleString()} {inv.currency}
                              </div>
                              {inv.balanceDue > 0 && (
                                <div className="text-[11px] font-mono text-amber-400">
                                  Due: {inv.balanceDue.toLocaleString()} {inv.currency}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: PAYMENTS */}
                  {activeTab === 'payments' && (
                    <div className="space-y-3">
                      {customerDetails.payments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No payment receipts on record.
                        </div>
                      ) : (
                        customerDetails.payments.map((p) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white text-xs font-mono flex items-center gap-2">
                                <span>{p.paymentNumber}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    p.status === 'Confirmed'
                                      ? 'bg-emerald-950 text-emerald-300'
                                      : 'bg-rose-950 text-rose-300 line-through'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                {p.paymentMethod} • Ref: {p.referenceNumber || 'N/A'} • {p.paymentDate.split('T')[0]}
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-sm text-emerald-400">
                              {p.amount.toLocaleString()} {p.currency}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 5: MESSAGES */}
                  {activeTab === 'messages' && (
                    <div className="space-y-3">
                      {customerDetails.messages.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No SMS or email notification history for this customer.
                        </div>
                      ) : (
                        customerDetails.messages.map((m) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-blue-400 uppercase font-mono text-[10px]">
                                {m.channel} • {m.messageType}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  m.status === 'Sent' || m.status === 'Delivered'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : 'bg-rose-950 text-rose-300'
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-2 rounded">
                              {m.content}
                            </p>
                            <div className="text-[10px] text-slate-500 flex items-center justify-between">
                              <span>To: {m.destination}</span>
                              <span>{new Date(m.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer Record'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {duplicateWarning && (
              <div className="mt-4 p-3 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Potential Duplicate Record Detected</span>
                </div>
                <p className="text-[11px] leading-relaxed">{duplicateWarning}</p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                    className="rounded border-amber-700 bg-amber-950 text-amber-500"
                  />
                  <span className="text-[11px]">Proceed and create customer anyway</span>
                </label>
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Customer or Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. Abyssinia Logistics PLC"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. Dawit Hailu"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Phone Number (with code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onBlur={handlePhoneOrEmailBlur}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251911234567"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onBlur={handlePhoneOrEmailBlur}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@client.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Business / Billing Address (optional)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Bole Sub-City, Addis Ababa, Ethiopia"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Service Notes & Special Terms
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Service history, renewal preferences, or custom SLA notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Profile' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
