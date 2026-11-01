import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Smartphone,
  Mail,
  Building2,
  FileText,
  Database,
  History,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Search,
} from 'lucide-react';
import { AppSettings, AuditLog } from '../types';
import { apiRequest } from '../lib/api';

interface SettingsViewProps {
  settings: AppSettings | null;
  onRefreshSettings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefreshSettings }) => {
  const [activeTab, setActiveTab] = useState<
    'sms' | 'company' | 'system' | 'templates' | 'backups' | 'audit'
  >('sms');

  // Form states
  const [formData, setFormData] = useState<AppSettings | null>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Backups state
  const [backups, setBackups] = useState<
    Array<{ filename: string; sizeBytes: number; createdAt: string }>
  >([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupLabel, setBackupLabel] = useState('');

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'backups') {
      loadBackups();
    }
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const loadBackups = async () => {
    try {
      const res = await apiRequest('/api/backups');
      setBackups(res);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await apiRequest('/api/audit');
      setAuditLogs(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setMessage({ type: 'success', text: 'System settings saved successfully.' });
      setTimeout(() => setMessage(null), 3500);
      onRefreshSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await apiRequest<{ filename: string }>('/api/backups/create', {
        method: 'POST',
        body: JSON.stringify({ label: backupLabel || undefined }),
      });
      setMessage({
        type: 'success',
        text: `Database snapshot ${res.filename} created successfully.`,
      });
      setBackupLabel('');
      loadBackups();
    } catch (err: any) {
      alert(err.message || 'Backup failed.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    const confirm = window.confirm(
      `Restore database snapshot "${filename}"?\nCurrent records will be safely archived before restoration.`
    );
    if (!confirm) return;

    try {
      await apiRequest('/api/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });
      alert('Database restored successfully! Refreshing portal...');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Restoration failed.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = event.target?.result as string;
        await apiRequest('/api/backups/upload-restore', {
          method: 'POST',
          body: JSON.stringify({ rawJson }),
        });
        alert('Database restored successfully from uploaded file! Reloading...');
        window.location.reload();
      } catch (err: any) {
        alert('Upload restore failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  if (!formData) {
    return <div className="p-8 text-xs text-slate-400">Loading settings...</div>;
  }

  const filteredAudit = auditLogs.filter((log) => {
    if (auditFilter !== 'all' && log.entityType !== auditFilter) return false;
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.performedBy.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('sms')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'sms' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>SMS Ethiopia Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'company' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Company Profile & Banks</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'system' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Reminders & Timezone</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'templates' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Message Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'backups' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Database Backups</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* TAB 1: SMS ETHIOPIA GATEWAY */}
      {activeTab === 'sms' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>SMS Ethiopia (sms.et) API Configuration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure credentials supplied by your official provider account (https://sms.et/).
              Secrets are stored securely on the server and never exposed in browser bundles.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
            <input
              type="checkbox"
              id="smsEnabled"
              checked={formData.sms.enabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sms: { ...formData.sms, enabled: e.target.checked },
                })
              }
              className="rounded border-slate-700 bg-slate-900 text-blue-500 w-4 h-4"
            />
            <label htmlFor="smsEnabled" className="font-semibold text-slate-200 cursor-pointer">
              Enable Automated SMS Notifications (Welcome texts, domain reminders, payment receipts)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                API Base Endpoint URL
              </label>
              <input
                type="url"
                required
                value={formData.sms.apiUrl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sms: { ...formData.sms, apiUrl: e.target.value },
                  })
                }
                placeholder="https://smsethiopia.com/api/sms/send"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default: https://smsethiopia.com/api/sms/send or https://api.sms.et/v1/sms/send
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Registered Alphanumeric Sender ID
              </label>
              <input
                type="text"
                required
                value={formData.sms.senderId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sms: { ...formData.sms, senderId: e.target.value.toUpperCase() },
                  })
                }
                placeholder="NEXGRID"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Pre-approved sender name registered with Ethio Telecom
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              SMS Ethiopia API Token / Key *
            </label>
            <input
              type="text"
              value={formData.sms.apiKey}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sms: { ...formData.sms, apiKey: e.target.value },
                })
              }
              placeholder="Paste secret token from sms.et account dashboard..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              If left blank or invalid, the system will log failed dispatch attempts honestly without faking.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save SMS Gateway Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: COMPANY PROFILE & BANKS */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>NexGrid Digital Systems Business Profile</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Appears on generated PDF invoices, official quotations, and payment instructions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Legal Business Name</label>
              <input
                type="text"
                required
                value={formData.company.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, name: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Tax Identification Number (TIN)</label>
              <input
                type="text"
                value={formData.company.taxNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, taxNumber: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Billing Phone Number</label>
              <input
                type="text"
                value={formData.company.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, phone: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Official Billing Email</label>
              <input
                type="email"
                value={formData.company.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, email: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">Physical / Head Office Address</label>
              <input
                type="text"
                value={formData.company.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, address: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">
                Bank Accounts & Payment Instructions (CBE, Awash, Telebirr)
              </label>
              <textarea
                rows={3}
                value={formData.company.bankDetails}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: { ...formData.company, bankDetails: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Company Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: REMINDERS & SYSTEM */}
      {activeTab === 'system' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" />
              <span>Scheduler Intervals & Security Policies</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure background reminder intervals, timezone, and inactivity timeout.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Default System Currency
              </label>
              <input
                type="text"
                required
                value={formData.system.defaultCurrency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    system: { ...formData.system, defaultCurrency: e.target.value.toUpperCase() },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">System Time Zone</label>
              <input
                type="text"
                readOnly
                value={formData.system.timeZone}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Domain Expiration Reminder Intervals (days before expiry)
              </label>
              <input
                type="text"
                value={formData.system.reminderIntervals.join(', ')}
                onChange={(e) => {
                  const arr = e.target.value
                    .split(',')
                    .map((n) => parseInt(n.trim(), 10))
                    .filter((n) => !isNaN(n) && n > 0);
                  setFormData({
                    ...formData,
                    system: { ...formData.system, reminderIntervals: arr },
                  });
                }}
                placeholder="30, 14, 7, 3, 1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Comma-separated days before expiration. Duplicates strictly prevented.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Administrator Inactivity Timeout (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={formData.system.sessionTimeoutMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    system: { ...formData.system, sessionTimeoutMinutes: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default: 60 minutes. Requires reauthentication after inactivity.
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.system.autoSendWelcomeSMS}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    system: { ...formData.system, autoSendWelcomeSMS: e.target.checked },
                  })
                }
                className="rounded border-slate-700 bg-slate-950 text-blue-500"
              />
              <span className="text-slate-300 font-medium">
                Automatically dispatch Welcome SMS when a new customer record is created
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.system.autoSendPaymentConfirmSMS}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    system: { ...formData.system, autoSendPaymentConfirmSMS: e.target.checked },
                  })
                }
                className="rounded border-slate-700 bg-slate-950 text-blue-500"
              />
              <span className="text-slate-300 font-medium">
                Automatically dispatch Payment Confirmation SMS upon verified receipt
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Parameters'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: TEMPLATES */}
      {activeTab === 'templates' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Notification Message Templates</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Placeholders: [Customer Name], [Domain Name], [Expiration Date], [Amount], [Currency], [Balance], [Invoice Number], [Due Date]
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                A. Welcome SMS Template
              </label>
              <textarea
                rows={2}
                value={formData.templates.welcomeSMS}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    templates: { ...formData.templates, welcomeSMS: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                B. Domain Expiration Reminder SMS Template
              </label>
              <textarea
                rows={2}
                value={formData.templates.domainReminderSMS}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    templates: { ...formData.templates, domainReminderSMS: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                C. Payment Confirmation SMS Template
              </label>
              <textarea
                rows={2}
                value={formData.templates.paymentConfirmationSMS}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    templates: { ...formData.templates, paymentConfirmationSMS: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                D. Invoice Due Reminder SMS Template
              </label>
              <textarea
                rows={2}
                value={formData.templates.invoiceReminderSMS}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    templates: { ...formData.templates, invoiceReminderSMS: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Templates'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: DATABASE BACKUPS */}
      {activeTab === 'backups' && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6 text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Database Persistence & Disaster Recovery</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Complete snapshots of all customers, domains, transactions, and audit records.
            </p>
          </div>

          {/* Create Backup / Upload */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Optional backup label (e.g. pre-october-audit)"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white flex-1 max-w-sm"
              />
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{creatingBackup ? 'Creating...' : 'Snapshot Now'}</span>
              </button>
            </div>

            <div>
              <label className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload & Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* List of Backups */}
          <div>
            <h4 className="font-bold text-white mb-2">Available Database Snapshots</h4>
            <div className="space-y-2">
              {backups.length === 0 ? (
                <div className="text-slate-500 py-6 text-center">No backups found in storage.</div>
              ) : (
                backups.map((b) => (
                  <div
                    key={b.filename}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono font-bold text-white text-xs">{b.filename}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(b.createdAt).toLocaleString()} • {Math.round(b.sizeBytes / 1024)} KB
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/backups/download/${b.filename}`}
                        download
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleRestoreBackup(b.filename)}
                        className="px-3 py-1.5 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-medium"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>Administrative Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Immutable record of customer edits, domain renewals, payment reversals, and settings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium"
              >
                <option value="all">All Entities</option>
                <option value="customer">Customer</option>
                <option value="domain">Domain</option>
                <option value="payment">Payment</option>
                <option value="invoice">Invoice</option>
                <option value="quotation">Quotation</option>
                <option value="auth">Auth</option>
                <option value="settings">Settings</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Audit Details</th>
                  <th className="py-2.5 px-3">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredAudit.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  filteredAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-400 text-[11px]">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-slate-400 font-medium">
                        {log.entityType}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{log.details}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {log.performedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
