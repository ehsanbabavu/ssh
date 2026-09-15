import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Server,
  Loader2,
  AlertTriangle,
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
      setError(err.message || 'خطا در برقراری ارتباط با سرور.');
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
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs dir-rtl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">پایش آنلاین سخت‌افزار (Server Health & Metrics)</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5 dir-ltr text-right">
              {config.username}@{config.host}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {lastUpdated && <span className="text-slate-400 text-[11px]">آخرین بروزرسانی: {lastUpdated}</span>}
          <button
            onClick={loadStats}
            disabled={loading}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">در حال دریافت اطلاعات سخت‌افزاری سرور via SSH...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="font-bold">خطا در دریافت وضعیت سرور:</div>
            <div className="font-mono text-[11px] text-rose-700 mt-0.5">{error}</div>
          </div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* System Info Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <Server className="w-4 h-4 text-blue-600" />
              <span>مشخصات سیستم‌عامل</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">نام میزبان (Hostname):</span>
                <span className="font-mono font-bold text-slate-800">{stats.hostname || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">سیستم‌عامل و هسته لینوکس:</span>
                <span className="font-mono text-slate-700 text-[11px] block truncate" title={stats.osInfo}>
                  {stats.osInfo || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">مدت زمان فعالیت (Uptime):</span>
                <span className="font-mono text-emerald-700 font-semibold text-[11px] block">{stats.uptime || '-'}</span>
              </div>
            </div>
          </div>

          {/* Memory (RAM) Usage Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>حافظه اصلی (RAM)</span>
              </div>
              <span className="font-mono text-blue-700 font-bold">{memUsedPercent}%</span>
            </div>

            <div className="space-y-2.5">
              {/* RAM Usage Bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    memUsedPercent > 85 ? 'bg-rose-500' : memUsedPercent > 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${memUsedPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-center pt-1">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 block text-[10px]">کل RAM:</span>
                  <span className="text-slate-800 font-bold">{stats.memTotalMb} MB</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 block text-[10px]">مصرف‌شده:</span>
                  <span className="text-amber-700 font-bold">{stats.memUsedMb} MB</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 block text-[10px]">آزاد:</span>
                  <span className="text-emerald-700 font-bold">{stats.memFreeMb} MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Disk Usage Overview Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 md:col-span-1 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>پارتیشن‌های دیسک</span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {stats.diskUsage && stats.diskUsage.length > 0 ? (
                stats.diskUsage.slice(0, 4).map((disk, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-[11px] font-mono space-y-1">
                    <div className="flex justify-between items-center text-slate-800 font-bold">
                      <span className="truncate max-w-[120px]" title={disk.mount}>
                        {disk.mount}
                      </span>
                      <span className="text-blue-700 font-semibold">{disk.capacity}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
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
