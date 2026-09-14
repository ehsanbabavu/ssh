import React, { useEffect, useState } from 'react';
import {
  Folder,
  FileText,
  File,
  ArrowRight,
  Home,
  RefreshCw,
  Loader2,
  FolderPlus,
  FileCode,
  Save,
  X,
  AlertTriangle,
  Lock,
  Download,
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
        setError(data.error || 'خطا در لیست کردن فایل‌های SFTP');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط SFTP');
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
        body: JSON.stringify({ config, path: selectedFile.path, content: fileContent }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(`خطا در ذخیره فایل: ${data.error}`);
      }
    } catch (err: any) {
      alert(`خطا در ذخیره فایل: ${err.message}`);
    } finally {
      setSavingFile(false);
    }
  };

  const navigateUp = () => {
    if (currentPath === '.' || currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    loadDirectory(parentPath);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl dir-rtl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-emerald-400" />
            <span>مدیریت فایل‌ها با پروتکل امن SFTP</span>
          </h3>
          <p className="text-xs text-slate-400">
            مشاهده، ویرایش مستقیم و مدیریت فایل‌های سرور{' '}
            <span className="font-mono text-emerald-300">
              {config.username}@{config.host}
            </span>
          </p>
        </div>

        <button
          onClick={() => loadDirectory(currentPath)}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>بروزرسانی</span>
        </button>
      </div>

      {/* Path Breadcrumb Navigation */}
      <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs dir-ltr">
        <button
          onClick={() => loadDirectory('/')}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          title="پوشه ریشه /"
        >
          <Home className="w-4 h-4" />
        </button>
        <button
          onClick={navigateUp}
          disabled={currentPath === '.' || currentPath === '/'}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
          title="سطح قبلی"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <span className="text-slate-600">/</span>
        <span className="font-mono font-bold text-emerald-400 truncate">{currentPath}</span>
      </div>

      {/* File List Table */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">در حال دریافت لیست فایل‌ها و پوشه‌ها...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <div className="font-bold">خطا در دریافت لیست پوشه SFTP:</div>
            <div className="font-mono text-[11px] text-rose-400 mt-0.5">{error}</div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">نام فایل / پوشه</th>
                <th className="py-3 px-4">حجم</th>
                <th className="py-3 px-4">آخرین تغییر</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
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
                    className="hover:bg-slate-900/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-200 flex items-center gap-2.5">
                      {item.isDirectory ? (
                        <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                      <span className="group-hover:text-emerald-300 transition-colors truncate">{item.name}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                      {item.isDirectory ? '-' : formatFileSize(item.size)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                      {item.modifyTime ? new Date(item.modifyTime * 1000).toLocaleDateString('fa-IR') : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {!item.isDirectory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFileEditor(item);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <span className="font-bold">{selectedFile.name}</span>
                <span className="text-slate-500 text-[11px]">({selectedFile.path})</span>
              </div>

              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Code Area */}
            <div className="flex-1 p-4 overflow-hidden relative bg-slate-950">
              {loadingFile ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">در حال بارگذاری محتوای فایل از سرور...</p>
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-80 bg-slate-950 text-slate-100 font-mono text-xs p-3 focus:outline-none border border-slate-800 rounded-xl resize-none dir-ltr text-left"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs">
              {saveSuccess && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>تغییرات با موفقیت روی سرور ذخیره شد!</span>
                </span>
              )}
              {!saveSuccess && <span className="text-slate-500">مراقبت کنید؛ تغییرات مستقیم روی سرور اِعمال خواهد شد.</span>}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
                >
                  بستن
                </button>
                <button
                  onClick={saveFileContent}
                  disabled={savingFile || loadingFile}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
                >
                  {savingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>ذخیره روی سرور (Save via SFTP)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
