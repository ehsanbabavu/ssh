import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  RefreshCw,
  Server,
  Loader2,
  AlertTriangle,
  Database,
  Layers,
} from 'lucide-react';
import type { SSHConfig, ServerStats } from '../types';

interface ServerStatsDashboardProps {
  config: SSHConfig;
}

export const ServerStatsDashboard: React.FC<ServerStatsDashboardProps> = ({ config }) => {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ssh/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        setLastUpdated(new Date().toLocaleTimeString('fa-IR'));
      } else {
        setError(data.error || 'دریافت اطلاعات سرور ناموفق بود.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      loadStats();
    }, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [config]);

  const memUsedPercent =
    stats?.memTotalMb && stats.memTotalMb > 0
      ? Math.round((stats.memUsedMb! / stats.memTotalMb) * 100)
      : 0;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl dir-rtl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">پایش آنلاین سخت‌افزار (Server Health & Metrics)</h3>
            <p className="text-xs text-slate-400 font-mono">
              اطلاعات زنده سرور {config.username}@{config.host}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {lastUpdated && <span className="text-slate-500 text-[11px]">آخرین بروزرسانی: {lastUpdated}</span>}
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">در حال دریافت اطلاعات سخت‌افزاری سرور via SSH...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <div className="font-bold">خطا در دریافت وضعیت سرور:</div>
            <div className="font-mono text-[11px] text-rose-400 mt-0.5">{error}</div>
          </div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* System Info Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>مشخصات سیستم‌عامل</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">نام میزبان (Hostname):</span>
                <span className="font-mono font-bold text-slate-200">{stats.hostname || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">سیستم‌عامل و هسته لینوکس:</span>
                <span className="font-mono text-slate-300 text-[11px] block truncate" title={stats.osInfo}>
                  {stats.osInfo || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">مدت زمان فعالیت (Uptime):</span>
                <span className="font-mono text-emerald-400 text-[11px] block">{stats.uptime || '-'}</span>
              </div>
            </div>
          </div>

          {/* Memory (RAM) Usage Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>حافظه اصلی (RAM)</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">{memUsedPercent}%</span>
            </div>

            <div className="space-y-2">
              {/* RAM Usage Bar */}
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    memUsedPercent > 85 ? 'bg-rose-500' : memUsedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${memUsedPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center pt-1">
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">کل RAM:</span>
                  <span className="text-slate-200 font-bold">{stats.memTotalMb} MB</span>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">مصرف‌شده:</span>
                  <span className="text-amber-400 font-bold">{stats.memUsedMb} MB</span>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">آزاد:</span>
                  <span className="text-emerald-400 font-bold">{stats.memFreeMb} MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Disk Usage Overview Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>پارتیشن‌های اصلی دیسک</span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {stats.diskUsage && stats.diskUsage.length > 0 ? (
                stats.diskUsage.slice(0, 4).map((disk, idx) => (
                  <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between items-center text-slate-300 font-bold">
                      <span className="truncate max-w-[120px]" title={disk.mount}>
                        {disk.mount}
                      </span>
                      <span className="text-emerald-400">{disk.capacity}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>کل: {disk.size}</span>
                      <span>استفاده شده: {disk.used}</span>
                      <span>باقیمانده: {disk.avail}</span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-500">اطلاعات دیسک موجود نیست</span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
