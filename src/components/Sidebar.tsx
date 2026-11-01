import React from 'react';
import {
  LayoutDashboard,
  Users,
  Globe,
  FileText,
  CreditCard,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  Server,
  X,
} from 'lucide-react';
import { AdminUser } from '../types';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentUser: AdminUser | null;
  onLogout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  smsConfigured: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  currentUser,
  onLogout,
  mobileOpen,
  setMobileOpen,
  smsConfigured,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'domains', label: 'Domains & Renewals', icon: Globe },
    { id: 'invoices', label: 'Invoices & Quotes', icon: FileText },
    { id: 'payments', label: 'Payments & Revenue', icon: CreditCard },
    { id: 'messaging', label: 'SMS & Notifications', icon: MessageSquare },
    { id: 'reports', label: 'Reports & Export', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveView(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <Server className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-wide flex items-center gap-1.5">
                NEXGRID
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                  CMS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Digital Systems Portal</div>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* SMS & Gateway Indicator */}
        <div className="px-4 py-3 mx-3 mb-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${smsConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              SMS Gateway:
            </span>
            <span className={`font-medium ${smsConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
              {smsConfigured ? 'Active' : 'Unconfigured'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">SMS Ethiopia (sms.et)</div>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-blue-400 font-semibold text-xs border border-slate-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser?.fullName || currentUser?.username || 'Administrator'}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">{currentUser?.role || 'Admin'}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
