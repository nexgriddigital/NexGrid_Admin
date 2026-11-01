import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Radio,
  Clock,
  Mail,
  Smartphone,
  ShieldAlert,
  Server,
  RefreshCw,
  Users,
  CheckSquare,
  Square,
  Search,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { MessageLog, AppSettings, Customer } from '../types';
import { apiRequest } from '../lib/api';

export interface SmsTemplate {
  id: string;
  category: string;
  name: string;
  title: string;
  text: string;
  description: string;
}

export const PREDEFINED_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'scheduled_maintenance',
    category: 'Infrastructure & Operations',
    name: 'Scheduled Infrastructure Maintenance',
    title: 'Scheduled System Maintenance Notice',
    text: 'Dear [Customer Name], NexGrid Digital Systems will conduct scheduled infrastructure maintenance on Saturday at 23:00 EAT. Estimated window: 2 hours. Support: [Business Contact].',
    description: 'Alerts customers of upcoming server, network, or platform maintenance.',
  },
  {
    id: 'emergency_incident',
    category: 'Infrastructure & Operations',
    name: 'Network Incident & Status Alert',
    title: 'Network Incident Status Update',
    text: 'Notice to [Business Name]: NexGrid Network Operations Center is monitoring upstream connectivity resolution. Core services remain unaffected. Updates: [Business Contact].',
    description: 'Advises of an upstream or network incident under active resolution.',
  },
  {
    id: 'invoice_urgent',
    category: 'Billing & Settlement',
    name: 'Urgent Payment Due Reminder',
    title: 'Urgent Payment Reminder - NexGrid Services',
    text: 'Dear [Customer Name], an outstanding invoice for [Business Name] (ID: [Customer ID]) is due today. Please settle via CBE / Telebirr to avoid service disruption. NexGrid: [Business Contact].',
    description: 'Prompts immediate settlement of overdue invoices to avoid service interruption.',
  },
  {
    id: 'domain_expiry',
    category: 'Billing & Settlement',
    name: 'Domain Expiration Warning (72h)',
    title: 'Critical: Domain Expiration Warning',
    text: 'Priority Alert: Domain services for [Business Name] will expire within 72 hours. Please confirm renewal immediately with NexGrid Billing. Support: [Business Contact].',
    description: 'Warns clients of imminent domain expiration and renewal steps.',
  },
  {
    id: 'holiday_hours',
    category: 'Announcements & General',
    name: 'Holiday Support & Operating Hours',
    title: 'Holiday Support & Operations Notice',
    text: 'Dear [Customer Name], NexGrid Digital Systems wishes [Business Name] a productive holiday season! 24/7 technical NOC remains active. Billing inquiries resume next business day. Contact: [Business Contact].',
    description: 'Holiday greeting and on-call escalation details for support.',
  },
  {
    id: 'security_advisory',
    category: 'Security & Compliance',
    name: 'DNS & 2FA Security Advisory',
    title: 'Domain & DNS Security Advisory',
    text: 'Important Security Advisory: NexGrid Digital Systems recommends reviewing your DNS records and enabling 2FA for all registered domains. Questions? Call [Business Contact].',
    description: 'Advises enterprise clients to audit nameservers and enforce two-factor authentication.',
  },
  {
    id: 'welcome_onboarding',
    category: 'Customer Onboarding',
    name: 'Customer Enterprise Portal Welcome',
    title: 'NexGrid Enterprise Portal Access',
    text: 'Welcome [Customer Name]! Your NexGrid enterprise account ([Customer ID]) is verified. Manage your domains and invoices anytime. Support: [Business Contact].',
    description: 'Welcomes newly registered enterprise clients with their account ID reference.',
  },
  {
    id: 'service_checkin',
    category: 'Customer Onboarding',
    name: 'Quarterly Systems Health Check',
    title: 'Quarterly Systems Health Check',
    text: 'Hello [Customer Name], NexGrid engineers have completed [Business Name]\'s quarterly infrastructure audit. Your systems report 99.98% uptime. Contact: [Business Contact].',
    description: 'Periodic customer relationship check-in with uptime status.',
  },
  {
    id: 'custom',
    category: 'Custom Message',
    name: 'Custom / Blank Announcement',
    title: 'General Customer Announcement',
    text: '',
    description: 'Draft a completely bespoke broadcast announcement from scratch.',
  },
];

interface MessagingViewProps {
  logs: MessageLog[];
  settings: AppSettings | null;
  customers: Customer[];
  onRefresh: () => void;
}

export const MessagingView: React.FC<MessagingViewProps> = ({
  logs,
  settings,
  customers = [],
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'broadcast'>('logs');

  // Logs filters
  const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'email'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Sent' | 'Failed' | 'Queued'>('all');
  const [logSearch, setLogSearch] = useState('');

  // Test SMS state
  const [testPhone, setTestPhone] = useState('+2519');
  const [testMessage, setTestMessage] = useState('NexGrid Digital Systems test notification message.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Connection check state
  const [checkingConn, setCheckingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ connected: boolean; message: string; balance?: string } | null>(null);

  // Retrying log
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Bulk Broadcast State
  // -------------------------------------------------------------
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('scheduled_maintenance');
  const [broadcastTitle, setBroadcastTitle] = useState('Scheduled System Maintenance Notice');
  const [broadcastMessage, setBroadcastMessage] = useState(
    'Dear [Customer Name], NexGrid Digital Systems will conduct scheduled infrastructure maintenance on Saturday at 23:00 EAT. Estimated window: 2 hours. Support: [Business Contact].'
  );
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'active' | 'all'>('active');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(
    customers.filter((c) => c.status === 'active' && Boolean(c.phone)).map((c) => c.id)
  );

  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState<{
    summary: { totalRequested: number; totalEligible: number; sentCount: number; failedCount: number };
    results: Array<{
      customerId: string;
      customerName: string;
      phone: string;
      status: 'Sent' | 'Failed' | 'Queued';
      error?: string;
    }>;
  } | null>(null);

  // Filtered customer list for broadcast selection
  const eligibleCustomers = customers.filter((c) => {
    if (customerFilter === 'active' && c.status === 'archived') return false;
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.businessName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const validRecipientsWithPhone = eligibleCustomers.filter((c) => Boolean(c.phone));

  const handleSelectAll = () => {
    setSelectedCustomerIds(validRecipientsWithPhone.map((c) => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedCustomerIds([]);
  };

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Insert placeholder at cursor or append
  const handleInsertPlaceholder = (placeholder: string) => {
    setBroadcastMessage((prev) => `${prev} [${placeholder}] `);
  };

  // Character & Segment counters
  const charCount = broadcastMessage.length;
  const smsSegments = Math.max(1, Math.ceil(charCount / 160));

  // First selected customer for preview
  const firstSelectedCustomer = customers.find((c) => selectedCustomerIds.includes(c.id));
  const previewMessage = broadcastMessage
    .replace(/\[Customer Name\]/gi, firstSelectedCustomer?.contactPerson || firstSelectedCustomer?.businessName || 'Dawit Hailu')
    .replace(/\[Business Name\]/gi, firstSelectedCustomer?.businessName || 'Abyssinia Logistics PLC')
    .replace(/\[Customer ID\]/gi, firstSelectedCustomer?.id || 'CUST-1001')
    .replace(/\[Business Contact\]/gi, settings?.company.phone || '+251 91 123 4567')
    .replace(/\[Company Name\]/gi, settings?.company.name || 'NexGrid Digital Systems');

  // Active template metadata and categories
  const selectedTemplate = PREDEFINED_SMS_TEMPLATES.find((t) => t.id === selectedTemplateId);
  const templateCategories = Array.from(new Set(PREDEFINED_SMS_TEMPLATES.map((t) => t.category)));

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = PREDEFINED_SMS_TEMPLATES.find((t) => t.id === templateId);
    if (found) {
      if (found.id !== 'custom') {
        setBroadcastTitle(found.title);
        setBroadcastMessage(found.text);
      }
    }
  };

  // Send Broadcast
  const handleSendBroadcast = async () => {
    if (selectedCustomerIds.length === 0) {
      alert('Please select at least one customer recipient.');
      return;
    }

    if (!broadcastMessage.trim()) {
      alert('Please enter broadcast message content.');
      return;
    }

    const confirmSend = window.confirm(
      `Broadcast this SMS to ${selectedCustomerIds.length} customer(s)?\n\nEstimated SMS Units: ${
        selectedCustomerIds.length * smsSegments
      } units.\nOnly verified SMS gateways will dispatch real messages.`
    );
    if (!confirmSend) return;

    setBroadcasting(true);
    setBroadcastResults(null);
    try {
      const res = await apiRequest('/api/messages/broadcast-sms', {
        method: 'POST',
        body: JSON.stringify({
          customerIds: selectedCustomerIds,
          message: broadcastMessage,
          title: broadcastTitle,
        }),
      });

      setBroadcastResults(res);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Broadcast failed.');
    } finally {
      setBroadcasting(false);
    }
  };

  // -------------------------------------------------------------
  // Filtered Logs
  // -------------------------------------------------------------
  const filteredLogs = logs.filter((l) => {
    if (channelFilter !== 'all' && l.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (!logSearch) return true;
    const q = logSearch.toLowerCase();
    return (
      l.destination.toLowerCase().includes(q) ||
      (l.customerName && l.customerName.toLowerCase().includes(q)) ||
      l.content.toLowerCase().includes(q) ||
      l.messageType.toLowerCase().includes(q)
    );
  });

  const handleTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await apiRequest<{ message: string; log: MessageLog }>('/api/messages/test-sms', {
        method: 'POST',
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
      });
      setTestResult({
        success: res.log.status === 'Sent',
        message:
          res.log.status === 'Sent'
            ? 'Test SMS dispatched successfully through gateway.'
            : `Dispatch outcome: ${res.log.status}. Detail: ${res.log.errorDetails || 'See log'}`,
      });
      onRefresh();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Failed to dispatch test message.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleCheckConnection = async () => {
    setCheckingConn(true);
    try {
      const res = await apiRequest<{ connected: boolean; message: string; balance?: string }>(
        '/api/messages/check-sms-connection'
      );
      setConnResult(res);
    } catch (err: any) {
      setConnResult({
        connected: false,
        message: `Connection test error: ${err.message}`,
      });
    } finally {
      setCheckingConn(false);
    }
  };

  const handleRetryMessage = async (id: string) => {
    setRetryingId(id);
    try {
      await apiRequest(`/api/messages/retry/${id}`, { method: 'POST' });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Retry failed.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Status & Architecture Info Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gateway Status Box */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>SMS Ethiopia Gateway Integration</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      settings?.sms.hasApiKey
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {settings?.sms.hasApiKey ? 'Credentials Configured' : 'No API Key Configured'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Official Provider: https://sms.et/ • Sender ID: {settings?.sms.senderId || 'NEXGRID'}
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckConnection}
              disabled={checkingConn}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingConn ? 'animate-spin' : ''}`} />
              <span>Ping Gateway</span>
            </button>
          </div>

          {connResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                connResult.connected
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}
            >
              {connResult.connected ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{connResult.message}</div>
                {connResult.balance && (
                  <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                    Account Balance: {connResult.balance}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono text-slate-400">
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Endpoint</span>
              <span className="truncate block text-slate-300">
                {settings?.sms.apiUrl || 'https://smsethiopia.com/api/sms/send'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Alphanumeric Sender</span>
              <span className="text-slate-300 font-bold">{settings?.sms.senderId || 'NEXGRID'}</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Bulk Broadcast</span>
              <span className="text-blue-400">Enabled</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Auto Reminders</span>
              <span className="text-emerald-400">Scheduled 30,14,7,3,1d</span>
            </div>
          </div>
        </div>

        {/* Test SMS Dispatch Box */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Send Single Test SMS</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Validate gateway connection before running live customer broadcasts.
            </p>

            <form onSubmit={handleTestSms} className="space-y-2.5 text-xs">
              <div>
                <input
                  type="text"
                  required
                  placeholder="+251911234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              {testResult && (
                <div
                  className={`p-2 rounded text-[11px] ${
                    testResult.success
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              <button
                type="submit"
                disabled={sendingTest}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'Sending...' : 'Dispatch Test SMS'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs: Bulk Broadcast vs Logs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 px-4 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Dispatch & Communication Logs ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-2 px-4 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'broadcast'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Bulk SMS Broadcast</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
            {selectedCustomerIds.length} selected
          </span>
        </button>
      </div>

      {/* TAB 1: BULK SMS BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Customer Selector (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Select Recipients</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCustomerIds.length} of {validRecipientsWithPhone.length} eligible selected
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500"
                />
              </div>

              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
              >
                <option value="active">Active Only</option>
                <option value="all">All Records</option>
              </select>
            </div>

            {/* Customer Checkbox List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {eligibleCustomers.length === 0 ? (
                <div className="text-slate-500 text-xs py-8 text-center">
                  No customers found matching filter.
                </div>
              ) : (
                eligibleCustomers.map((cust) => {
                  const isSelected = selectedCustomerIds.includes(cust.id);
                  const hasPhone = Boolean(cust.phone);
                  return (
                    <div
                      key={cust.id}
                      onClick={() => hasPhone && handleToggleCustomer(cust.id)}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        !hasPhone
                          ? 'opacity-40 bg-slate-950/40 border-slate-900 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-950/30 border-blue-600/60 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <div className="font-semibold truncate text-white">
                            {cust.businessName}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {cust.contactPerson || 'Contact'} •{' '}
                            <span className="font-mono text-slate-300">
                              {cust.phone || 'No phone'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                        {cust.id}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Composer & Live Preview (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Compose Broadcast Announcement</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sender: <strong className="text-slate-200">{settings?.sms.senderId || 'NEXGRID'}</strong> • Gateway: SMS Ethiopia
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Total Volume</span>
                <span className="font-mono font-bold text-xs text-emerald-400">
                  {selectedCustomerIds.length} Recipient(s)
                </span>
              </div>
            </div>

            {/* Pre-defined SMS Template Dropdown */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label htmlFor="sms-template-dropdown" className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pre-defined SMS Template</span>
                </label>
                {selectedTemplate && selectedTemplate.id !== 'custom' && (
                  <span className="text-[10px] text-blue-400 bg-blue-950/70 border border-blue-900/50 px-2 py-0.5 rounded font-mono flex items-center gap-1 self-start sm:self-auto">
                    <Sparkles className="w-2.5 h-2.5" />
                    {selectedTemplate.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    id="sms-template-dropdown"
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer"
                  >
                    {templateCategories.map((cat) => (
                      <optgroup key={cat} label={`── ${cat} ──`} className="bg-slate-900 text-slate-400 font-semibold">
                        {PREDEFINED_SMS_TEMPLATES.filter((t) => t.category === cat).map((tpl) => (
                          <option key={tpl.id} value={tpl.id} className="bg-slate-900 text-white font-normal py-1">
                            {tpl.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {selectedTemplate && selectedTemplate.id !== 'custom' && (
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTitle(selectedTemplate.title);
                      setBroadcastMessage(selectedTemplate.text);
                    }}
                    title="Reload original template text"
                    className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Reset Text</span>
                  </button>
                )}
              </div>

              {selectedTemplate?.description && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <Info className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
                  <span>{selectedTemplate.description}</span>
                </p>
              )}
            </div>

            {/* Broadcast Subject/Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Campaign / Announcement Subject
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Scheduled Infrastructure Upgrade"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            {/* Message Body & Placeholders */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  SMS Message Body *
                </label>

                {/* Placeholder chips */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 mr-1 hidden sm:inline">Insert:</span>
                  {[
                    'Customer Name',
                    'Business Name',
                    'Customer ID',
                    'Business Contact',
                  ].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => handleInsertPlaceholder(ph)}
                      className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 text-blue-300 hover:text-white text-[10px] font-mono transition-colors"
                    >
                      +{ph}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={4}
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono leading-relaxed"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>
                  {charCount} characters •{' '}
                  <strong className={smsSegments > 1 ? 'text-amber-400' : 'text-slate-300'}>
                    {smsSegments} SMS Segment{smsSegments > 1 ? 's' : ''}
                  </strong>{' '}
                  (160 chars/segment)
                </span>
                <span>
                  Estimated units: {selectedCustomerIds.length * smsSegments}
                </span>
              </div>
            </div>

            {/* Live Personalization Preview */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Personalized Mobile Preview</span>
                </span>
                <span className="font-mono text-slate-500 text-[10px]">
                  Sample: {firstSelectedCustomer?.businessName || 'Sample Recipient'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed">
                {previewMessage}
              </div>
            </div>

            {/* Dispatch Action Button */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {selectedCustomerIds.length === 0 ? (
                  <span className="text-amber-400">No recipients selected.</span>
                ) : (
                  <span>
                    Ready to broadcast to{' '}
                    <strong className="text-white">{selectedCustomerIds.length}</strong> recipients.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={broadcasting || selectedCustomerIds.length === 0}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>
                  {broadcasting
                    ? 'Broadcasting to Gateway...'
                    : `Send Broadcast (${selectedCustomerIds.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Results Modal */}
      {broadcastResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Broadcast Dispatch Results</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {broadcastResults.summary.sentCount} sent successfully •{' '}
                  {broadcastResults.summary.failedCount} failed of{' '}
                  {broadcastResults.summary.totalEligible} recipients
                </p>
              </div>

              <button
                onClick={() => setBroadcastResults(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-4 pr-1 text-xs">
              {broadcastResults.results.map((r, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">{r.customerName}</div>
                    <div className="text-[11px] font-mono text-slate-400">{r.phone}</div>
                    {r.error && (
                      <div className="text-[10px] text-rose-400 mt-0.5">{r.error}</div>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                      r.status === 'Sent'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setBroadcastResults(null);
                  setActiveTab('logs');
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                View in Message Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOGS & HISTORY */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Communication & Dispatch Logs</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit of automated reminders, welcome texts, broadcasts, and receipts
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              {/* Channel Filter */}
              <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                {(['all', 'sms', 'email'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                      channelFilter === ch ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                {(['all', 'Sent', 'Failed', 'Queued'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                      statusFilter === st ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Channel</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Recipient / Phone</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Message Content</th>
                  <th className="py-3 px-4 font-semibold">Gateway Ref / Details</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No message dispatch records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono uppercase font-semibold text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-blue-400 font-medium capitalize">
                        {log.messageType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {log.destination}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {log.customerName || '—'}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-400 truncate" title={log.content}>
                        {log.content}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-[180px] truncate">
                        {log.status === 'Failed' ? (
                          <span className="text-rose-400" title={log.errorDetails}>
                            {log.errorDetails}
                          </span>
                        ) : (
                          log.providerReference || 'Processed'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === 'Sent' || log.status === 'Delivered'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                              : log.status === 'Queued'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.status === 'Failed' && (
                          <button
                            onClick={() => handleRetryMessage(log.id)}
                            disabled={retryingId === log.id}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-[11px] font-medium transition-colors"
                          >
                            {retryingId === log.id ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
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
