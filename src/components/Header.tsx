import React from 'react';
import { Menu, Clock, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobile: () => void;
  onRunScheduler: () => void;
  schedulerRunning: boolean;
  schedulerMessage?: string | null;
  sessionRemainingMinutes: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenMobile,
  onRunScheduler,
  schedulerRunning,
  schedulerMessage,
  sessionRemainingMinutes,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Addis Ababa Timezone badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Addis Ababa (EAT)</span>
        </div>

        {/* Inactivity timer badge */}
        <div
          title="Session inactivity timeout policy"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
            sessionRemainingMinutes <= 10
              ? 'bg-rose-950/60 border-rose-800/80 text-rose-300 animate-pulse'
              : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
          }`}
        >
          {sessionRemainingMinutes <= 10 ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
          <span className="font-mono text-[11px]">
            {sessionRemainingMinutes}m session
          </span>
        </div>

        {/* Trigger scheduler button */}
        <button
          onClick={onRunScheduler}
          disabled={schedulerRunning}
          title="Trigger background check for expiring domains, automated SMS/email reminders, and overdue invoices"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${schedulerRunning ? 'animate-spin text-blue-400' : ''}`} />
          <span className="hidden sm:inline">Check Reminders</span>
        </button>

        {schedulerMessage && (
          <div className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{schedulerMessage}</span>
          </div>
        )}
      </div>
    </header>
  );
};
