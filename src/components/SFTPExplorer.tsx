import React, { useEffect, useState } from 'react';
import {
  Folder,
  FileText,
  File,
  ArrowRight,
  ArrowLeft,
  Home,
  RefreshCw,
  Loader2,
  FolderPlus,
  FileCode,
  Save,
  X,
  AlertTriangle,
  Eye,
  Check,
} from 'lucide-react';
import type { SSHConfig, SFTPItem } from '../types';

interface SFTPExplorerProps {
  config: SSHConfig;
}

export const SFTPExplorer: React.FC<SFTPExplorerProps> = ({ config }) => {
  const [currentPath, setCurrentPath] = useState<string>('.');
  const [items, setItems] = useState<SFTPItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // File Viewer / Editor state
  const [selectedFile, setSelectedFile] = useState<SFTPItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [savingFile, setSavingFile] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ssh/sftp/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, path }),
      });
      const data = await res.json();
      if (data.success && data.items) {
        setItems(data.items);
        setCurrentPath(path);
      } else {
        setError(data.error || 'خطا در دریافت لیست فایل‌های SFTP');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط SFTP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory('.');
  }, [config]);

  const openItem = (item: SFTPItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      openFileEditor(item);
    }
  };

  const openFileEditor = async (item: SFTPItem) => {
    setSelectedFile(item);
    setLoadingFile(true);
    setFileContent('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/ssh/sftp/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, path: item.path }),
      });
      const data = await res.json();
      if (data.success) {
        setFileContent(data.content || '');
      } else {
        setFileContent(`/* خطا در خواندن فایل: ${data.error} */`);
      }
    } catch (err: any) {
      setFileContent(`/* خطا: ${err.message} */`);
    } finally {
      setLoadingFile(false);
    }
  };

  const saveFileContent = async () => {
    if (!selectedFile) return;
    setSavingFile(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/ssh/sftp/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          path: selectedFile.path,
          content: fileContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(`خطا در ذخیره فایل: ${data.error}`);
      }
    } catch (err: any) {
      alert(`خطا در ذخیره: ${err.message}`);
    } finally {
      setSavingFile(false);
    }
  };

  const navigateUp = () => {
    if (currentPath === '.' || currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = parts.length === 0 ? '/' : '/' + parts.join('/');
    loadDirectory(parent);
  };

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs dir-rtl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-emerald-600" />
            <span>مدیریت فایل‌ها با پروتکل امن SFTP</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            مشاهده، ویرایش مستقیم و انتقال فایل‌های سرور{' '}
            <span className="font-mono text-emerald-700 font-semibold dir-ltr inline-block">
              {config.username}@{config.host}
            </span>
          </p>
        </div>

        <button
          onClick={() => loadDirectory(currentPath)}
          disabled={loading}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>بروزرسانی</span>
        </button>
      </div>

      {/* Path Breadcrumb Navigation */}
      <div className="flex items-center gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-xs dir-ltr">
        <button
          onClick={() => loadDirectory('/')}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="پوشه ریشه /"
        >
          <Home className="w-4 h-4" />
        </button>
        <button
          onClick={navigateUp}
          disabled={currentPath === '.' || currentPath === '/'}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
          title="سطح قبلی (Parent Directory)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-slate-300">|</span>
        <span className="text-slate-400 font-mono">/</span>
        <span className="font-mono font-semibold text-emerald-700 truncate">{currentPath}</span>
      </div>

      {/* File List Table */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">در حال بارگذاری لیست فایل‌ها و پوشه‌ها...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="font-bold">خطا در دریافت لیست پوشه SFTP:</div>
            <div className="font-mono text-[11px] text-rose-700 mt-0.5">{error}</div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">نام فایل / پوشه</th>
                <th className="py-3 px-4">حجم</th>
                <th className="py-3 px-4">آخرین تغییر</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                    این پوشه خالی است.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.name}
                    onClick={() => openItem(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800 flex items-center gap-2.5">
                      {item.isDirectory ? (
                        <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="group-hover:text-emerald-700 transition-colors truncate">{item.name}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                      {item.isDirectory ? '-' : formatFileSize(item.size)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                      {item.modifyTime ? new Date(item.modifyTime * 1000).toLocaleDateString('fa-IR') : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {!item.isDirectory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFileEditor(item);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>مشاهده/ویرایش</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* File Editor Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-800">
                <FileCode className="w-5 h-5 text-emerald-600" />
                <span className="font-bold">{selectedFile.name}</span>
                <span className="text-slate-500 text-[11px] dir-ltr">({selectedFile.path})</span>
              </div>

              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Code Area */}
            <div className="flex-1 p-4 overflow-hidden relative bg-slate-50/50">
              {loadingFile ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">در حال دریافت محتوای فایل از سرور...</p>
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-80 bg-white text-slate-800 font-mono text-xs p-3 focus:outline-none border border-slate-300 rounded-xl resize-none dir-ltr text-left"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs">
              {saveSuccess && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تغییرات با موفقیت روی سرور ذخیره شد!</span>
                </span>
              )}
              {!saveSuccess && (
                <span className="text-slate-500">تغییرات مستقیماً بر روی سرور راه دور ذخیره خواهد شد.</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  بستن
                </button>
                <button
                  onClick={saveFileContent}
                  disabled={savingFile || loadingFile}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {savingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>ذخیره روی سرور (Save SFTP)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
