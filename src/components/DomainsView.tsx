import React, { useState } from 'react';
import {
  Globe,
  Search,
  Plus,
  Send,
  RotateCw,
  History,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { Domain, Customer } from '../types';
import { apiRequest } from '../lib/api';

interface DomainsViewProps {
  domains: Domain[];
  customers: Customer[];
  onRefresh: () => void;
  preselectedCustomerId?: string | null;
  onClearPreselectedCustomer?: () => void;
}

export const DomainsView: React.FC<DomainsViewProps> = ({
  domains,
  customers,
  onRefresh,
  preselectedCustomerId,
  onClearPreselectedCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Expiring Soon' | 'Active' | 'Expired'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [renewingDomain, setRenewingDomain] = useState<Domain | null>(null);
  const [historyDomain, setHistoryDomain] = useState<Domain | null>(null);

  // Add domain form
  const [formData, setFormData] = useState({
    domainName: '',
    customerId: preselectedCustomerId || (customers[0]?.id || ''),
    registrationDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    renewalPrice: 3850,
    currency: 'ETB',
    registrationPeriodYears: 1,
    registrar: 'Ethio Telecom (.et Registry)',
    notes: '',
  });

  // Renew form
  const [renewForm, setRenewForm] = useState({
    newExpirationDate: '',
    price: 3850,
    currency: 'ETB',
    notes: 'Annual renewal confirmed by administrator',
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredDomains = domains.filter((d) => {
    if (preselectedCustomerId && d.customerId !== preselectedCustomerId) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.domainName.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      (d.customerName && d.customerName.toLowerCase().includes(q))
    );
  });

  const handleOpenAddModal = () => {
    // Default expiration to 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setFormData({
      domainName: '',
      customerId: preselectedCustomerId || (customers[0]?.id || ''),
      registrationDate: new Date().toISOString().split('T')[0],
      expirationDate: nextYear.toISOString().split('T')[0],
      renewalPrice: 3850,
      currency: 'ETB',
      registrationPeriodYears: 1,
      registrar: 'Ethio Telecom (.et Registry)',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/domains', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save domain.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRenewModal = (d: Domain) => {
    // Calculate new expiration date: 1 year from current expiration date
    const currExp = new Date(d.expirationDate);
    currExp.setFullYear(currExp.getFullYear() + 1);
    const nextExpDateStr = currExp.toISOString().split('T')[0];

    setRenewingDomain(d);
    setRenewForm({
      newExpirationDate: nextExpDateStr,
      price: d.renewalPrice,
      currency: d.currency,
      notes: `Renewed for 1 year until ${nextExpDateStr}. Admin verified.`,
    });
  };

  const handleConfirmRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingDomain) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/domains/${renewingDomain.id}/renew`, {
        method: 'POST',
        body: JSON.stringify(renewForm),
      });
      setRenewingDomain(null);
      setActionMessage(`Domain ${renewingDomain.domainName} renewed successfully.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Renewal failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = async (domainId: string, domainName: string) => {
    const confirm = window.confirm(`Send renewal notification SMS and Email to the customer for ${domainName}?`);
    if (!confirm) return;

    try {
      const res = await apiRequest(`/api/domains/${domainId}/send-reminder`, {
        method: 'POST',
      });
      setActionMessage(`Reminder dispatched for ${domainName}.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
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

      {/* Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search domains by name or customer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('Expiring Soon')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'Expiring Soon' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expiring Soon
            </button>
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'Active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('Expired')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'Expired' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expired
            </button>
          </div>

          {preselectedCustomerId && onClearPreselectedCustomer && (
            <button
              onClick={onClearPreselectedCustomer}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Clear customer filter
            </button>
          )}
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Domain</span>
        </button>
      </div>

      {/* Domains Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold">Domain Name</th>
                <th className="py-3 px-4 font-semibold">Client Business</th>
                <th className="py-3 px-4 font-semibold">Registrar</th>
                <th className="py-3 px-4 font-semibold">Registered</th>
                <th className="py-3 px-4 font-semibold">Expiration Date</th>
                <th className="py-3 px-4 font-semibold">Status / Days Left</th>
                <th className="py-3 px-4 font-semibold text-right">Renewal Price</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No domain records found.
                  </td>
                </tr>
              ) : (
                filteredDomains.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{d.domainName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{d.customerName}</td>
                    <td className="py-3 px-4 text-slate-400">{d.registrar || 'NexGrid'}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{d.registrationDate}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px] font-semibold">
                      {d.expirationDate}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            d.status === 'Active'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                              : d.status === 'Expiring Soon'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          }`}
                        >
                          {d.status}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {d.daysLeft < 0
                            ? `(${Math.abs(d.daysLeft)}d ago)`
                            : `(${d.daysLeft}d left)`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                      {d.renewalPrice.toLocaleString()} {d.currency}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendReminder(d.id, d.domainName)}
                          title="Dispatch renewal reminder SMS / Email"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenRenewModal(d)}
                          title="Confirm & Record Renewal"
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Renew</span>
                        </button>
                        {d.renewalHistory && d.renewalHistory.length > 0 && (
                          <button
                            onClick={() => setHistoryDomain(d)}
                            title="View Renewal History"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
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

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Register / Track Domain Record</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDomain} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Domain Name (FQDN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.domainName}
                  onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
                  placeholder="e.g. entotocoffee.et or mycompany.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Associated Customer *
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Registration Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.registrationDate}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Renewal Price (ETB)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.renewalPrice}
                    onChange={(e) => setFormData({ ...formData, renewalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Domain Registrar
                  </label>
                  <input
                    type="text"
                    value={formData.registrar}
                    onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                    placeholder="Ethio Telecom / OpenSRS"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Notes & Nameservers
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="NS1/NS2, DNS zone details, auto-renew notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold shadow-sm"
                >
                  {submitting ? 'Registering...' : 'Save Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Renewal Modal */}
      {renewingDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-blue-400" />
                  <span>Confirm Domain Renewal</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{renewingDomain.domainName}</p>
              </div>
              <button
                onClick={() => setRenewingDomain(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-blue-950/40 border border-blue-800/60 text-xs text-blue-300">
              Current expiration date:{' '}
              <span className="font-mono font-bold text-white">{renewingDomain.expirationDate}</span>.
              Renewal will be logged into immutable renewal history.
            </div>

            <form onSubmit={handleConfirmRenewal} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  New Expiration Date *
                </label>
                <input
                  type="date"
                  required
                  value={renewForm.newExpirationDate}
                  onChange={(e) => setRenewForm({ ...renewForm, newExpirationDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Renewal Price Confirmed ({renewForm.currency})
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={renewForm.price}
                  onChange={(e) => setRenewForm({ ...renewForm, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Renewal Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={renewForm.notes}
                  onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRenewingDomain(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
                >
                  {submitting ? 'Confirming...' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renewal History Modal */}
      {historyDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <span>Renewal History</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{historyDomain.domainName}</p>
              </div>
              <button
                onClick={() => setHistoryDomain(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {historyDomain.renewalHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-emerald-400 font-semibold">
                      Renewed: {rec.newExpirationDate}
                    </span>
                    <span className="text-slate-300">
                      {rec.price.toLocaleString()} {rec.currency}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Previous expiration: {rec.previousExpirationDate} • Recorded by: {rec.recordedBy}
                  </div>
                  {rec.notes && <p className="text-slate-300 text-[11px] pt-1">{rec.notes}</p>}
                </div>
              ))}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 text-right">
              <button
                onClick={() => setHistoryDomain(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
