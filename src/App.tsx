import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { DomainsView } from './components/DomainsView';
import { InvoicesView } from './components/InvoicesView';
import { PaymentsView } from './components/PaymentsView';
import { MessagingView } from './components/MessagingView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import {
  AdminUser,
  DashboardStats,
  Customer,
  Domain,
  Invoice,
  Quotation,
  Payment,
  MessageLog,
  AuditLog,
  AppSettings,
} from './types';
import { apiRequest, getStoredToken, getStoredUser, clearStoredAuth } from './lib/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(getStoredToken()));
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(60);
  const [sessionRemainingMinutes, setSessionRemainingMinutes] = useState<number>(60);

  // Layout & Navigation State
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Data Store
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    activeDomains: 0,
    expiringSoonDomains: 0,
    expiredDomains: 0,
    totalPaymentsReceived: 0,
    totalInvoicedAmount: 0,
    totalOutstandingBalance: 0,
    unpaidInvoicesCount: 0,
    overdueInvoicesCount: 0,
    pendingQuotationsCount: 0,
  });
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Preselected context cross-navigation
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null);
  const [preselectedPaymentTarget, setPreselectedPaymentTarget] = useState<{
    invoiceId?: string;
    customerId?: string;
    balance?: number;
  } | null>(null);

  // Background Scheduler Trigger
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(false);
  const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null);

  // Verify auth session on boot
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      try {
        const res = await apiRequest('/api/auth/me');
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        if (res.sessionTimeoutMinutes) {
          setSessionTimeoutMinutes(res.sessionTimeoutMinutes);
          setSessionRemainingMinutes(res.sessionTimeoutMinutes);
        }
      } catch (err) {
        setIsAuthenticated(false);
        clearStoredAuth();
      }
    };

    checkAuth();

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setSessionExpired(true);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  // Fetch all system records
  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // 1. Dashboard summary
      const summary = await apiRequest('/api/dashboard/summary');
      setDashboardStats(summary.stats);
      setUpcomingRenewals(summary.upcomingRenewals || []);
      setRecentPayments(summary.recentPayments || []);
      setRecentActivity(summary.recentActivity || []);

      // 2. Customers
      const custs = await apiRequest('/api/customers');
      setCustomers(custs);

      // 3. Domains
      const doms = await apiRequest('/api/domains');
      setDomains(doms);

      // 4. Invoices & Quotations
      const invs = await apiRequest('/api/invoices');
      setInvoices(invs);
      const quotes = await apiRequest('/api/quotations');
      setQuotations(quotes);

      // 5. Payments
      const pays = await apiRequest('/api/payments');
      setPayments(pays);

      // 6. Messages
      const msgs = await apiRequest('/api/messages/logs');
      setMessageLogs(msgs);

      // 7. Settings
      const sets = await apiRequest('/api/settings');
      setSettings(sets);
    } catch (err) {
      console.error('Error fetching portal data:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  // Inactivity tracking: user interactions refresh the remaining timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      setSessionRemainingMinutes(sessionTimeoutMinutes);
    };

    window.addEventListener('mousemove', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer, { passive: true });
    window.addEventListener('click', resetTimer, { passive: true });

    // Decrement remaining minutes every 60s
    const interval = setInterval(() => {
      setSessionRemainingMinutes((prev) => {
        if (prev <= 1) {
          clearStoredAuth();
          setIsAuthenticated(false);
          setSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      clearInterval(interval);
    };
  }, [isAuthenticated, sessionTimeoutMinutes]);

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      clearStoredAuth();
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const handleRunScheduler = async () => {
    setSchedulerRunning(true);
    setSchedulerMessage(null);
    try {
      const res = await apiRequest<{ message: string; outcome: any }>('/api/scheduler/run-now', {
        method: 'POST',
      });
      const o = res.outcome;
      setSchedulerMessage(
        `Checked ${o.domainsChecked} domains • ${o.remindersSent} reminders dispatched • ${o.invoicesUpdated} invoices updated`
      );
      setTimeout(() => setSchedulerMessage(null), 4500);
      fetchAllData();
    } catch (err: any) {
      alert('Scheduler error: ' + err.message);
    } finally {
      setSchedulerRunning(false);
    }
  };

  // Cross-view shortcuts
  const handleAddDomainForCustomer = (customerId: string) => {
    setPreselectedCustomerId(customerId);
    setActiveView('domains');
  };

  const handleAddInvoiceForCustomer = (customerId: string) => {
    setPreselectedCustomerId(customerId);
    setActiveView('invoices');
  };

  const handleAddPaymentForCustomer = (customerId: string) => {
    setPreselectedPaymentTarget({ customerId });
    setActiveView('payments');
  };

  const handleRecordPaymentShortcut = (invoiceId: string, customerId: string, balance: number) => {
    setPreselectedPaymentTarget({ invoiceId, customerId, balance });
    setActiveView('payments');
  };

  const handleSendDomainReminderFromDashboard = async (domainId: string) => {
    try {
      await apiRequest(`/api/domains/${domainId}/send-reminder`, { method: 'POST' });
      setSchedulerMessage('Domain renewal reminder dispatched via SMS & Email.');
      setTimeout(() => setSchedulerMessage(null), 3500);
      fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch reminder.');
    }
  };

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Administrative Dashboard', subtitle: 'System overview and metrics' };
      case 'customers':
        return { title: 'Customer Management', subtitle: 'Client records, profiles, and service history' };
      case 'domains':
        return { title: 'Domain Management & Renewals', subtitle: 'Domain lifecycle, registration, and reminders' };
      case 'invoices':
        return { title: 'Invoices & Quotations', subtitle: 'Billing, PDF generation, and quotation conversion' };
      case 'payments':
        return { title: 'Payment Tracking & Ledger', subtitle: 'Verified receipts, partial payments, and reversals' };
      case 'messaging':
        return { title: 'SMS Ethiopia & Notifications', subtitle: 'Provider connection status, test SMS, and dispatch logs' };
      case 'reports':
        return { title: 'Financial Reports & Analytics', subtitle: 'Revenue breakdowns, CSV exports, and collection trends' };
      case 'settings':
        return { title: 'System Settings & Audit Log', subtitle: 'Provider credentials, message templates, backups, and audit trail' };
      default:
        return { title: 'NexGrid Admin Portal', subtitle: '' };
    }
  };

  const pageInfo = getPageTitle();

  if (!isAuthenticated) {
    return (
      <AuthModal
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setSessionExpired(false);
        }}
        isSessionExpired={sessionExpired}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-blue-600 selection:text-white">

      {/* Main Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        currentUser={currentUser}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        smsConfigured={Boolean(settings?.sms.hasApiKey)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen min-w-0">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onOpenMobile={() => setMobileOpen(true)}
          onRunScheduler={handleRunScheduler}
          schedulerRunning={schedulerRunning}
          schedulerMessage={schedulerMessage}
          sessionRemainingMinutes={sessionRemainingMinutes}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeView === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              upcomingRenewals={upcomingRenewals}
              recentPayments={recentPayments}
              recentActivity={recentActivity}
              onNavigate={setActiveView}
              onSendDomainReminder={handleSendDomainReminderFromDashboard}
              onRenewDomainModal={(domId) => {
                setActiveView('domains');
              }}
              onAddCustomerClick={() => setActiveView('customers')}
              onAddDomainClick={() => {
                setPreselectedCustomerId(null);
                setActiveView('domains');
              }}
              onAddInvoiceClick={() => {
                setPreselectedCustomerId(null);
                setActiveView('invoices');
              }}
              onAddPaymentClick={() => {
                setPreselectedPaymentTarget(null);
                setActiveView('payments');
              }}
            />
          )}

          {activeView === 'customers' && (
            <CustomersView
              customers={customers}
              onRefresh={fetchAllData}
              onSelectCustomer={() => {}}
              onAddDomainForCustomer={handleAddDomainForCustomer}
              onAddInvoiceForCustomer={handleAddInvoiceForCustomer}
              onAddPaymentForCustomer={handleAddPaymentForCustomer}
            />
          )}

          {activeView === 'domains' && (
            <DomainsView
              domains={domains}
              customers={customers}
              onRefresh={fetchAllData}
              preselectedCustomerId={preselectedCustomerId}
              onClearPreselectedCustomer={() => setPreselectedCustomerId(null)}
            />
          )}

          {activeView === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              quotations={quotations}
              customers={customers}
              onRefresh={fetchAllData}
              onRecordPaymentShortcut={handleRecordPaymentShortcut}
              preselectedCustomerId={preselectedCustomerId}
            />
          )}

          {activeView === 'payments' && (
            <PaymentsView
              payments={payments}
              customers={customers}
              invoices={invoices}
              onRefresh={fetchAllData}
              preselectedPaymentTarget={preselectedPaymentTarget}
              onClearPreselectedPaymentTarget={() => setPreselectedPaymentTarget(null)}
            />
          )}

          {activeView === 'messaging' && (
            <MessagingView
              logs={messageLogs}
              settings={settings}
              customers={customers}
              onRefresh={fetchAllData}
            />
          )}

          {activeView === 'reports' && <ReportsView />}

          {activeView === 'settings' && (
            <SettingsView
              settings={settings}
              onRefreshSettings={fetchAllData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
