import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Database, Upload, AlertTriangle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminScreen = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();

    const [selectedTable, setSelectedTable] = useState<'shops' | 'content'>('shops');
    const [importMode, setImportMode] = useState<'overwrite' | 'append'>('overwrite');
    const [file, setFile] = useState<File | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<{ success: boolean; count?: number; message?: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (!selectedFile.name.endsWith('.tsv')) {
                alert("Only .tsv files are allowed.");
                return;
            }
            setFile(selectedFile);
            setResult(null);
            setProgress(0);
            setStatusMessage('');
        }
    };

    const handleUpdate = async () => {
        if (!file) return;

        setIsUpdating(true);
        setResult(null);
        setProgress(5);
        setStatusMessage('Preparing file upload...');

        const formData = new FormData();
        formData.append('file', file);
        if (user) formData.append('userId', user.id.toString());
        formData.append('table', selectedTable);
        formData.append('mode', importMode);

        // Simulate progress purely for UI feedback since it's a single POST
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev < 90) return prev + Math.random() * 10;
                return prev;
            });
        }, 800);

        try {
            setStatusMessage('Uploading and processing data...');
            const response = await fetch(`${API_BASE_URL}/api/admin/update-db`, {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            const data = await response.json();

            if (response.ok) {
                setProgress(100);
                setStatusMessage('Update completed successfully!');
                setResult({ success: true, count: data.registeredCount });
                setFile(null);
            } else {
                setProgress(0);
                setStatusMessage('Update failed.');
                setResult({ success: false, message: data.error || data.details });
            }
        } catch (error: any) {
            clearInterval(progressInterval);
            setProgress(0);
            setStatusMessage('An error occurred.');
            setResult({ success: false, message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 bg-white border-b flex items-center px-4 shrink-0 z-10">
                <button onClick={() => navigate('/main')} className="p-2 -ml-2 text-gray-400">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-bold text-lg mr-8">
                    {t('admin.title')}
                </h1>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-6" data-scroll-container="true">
                {/* Quick Links */}
                <section className="space-y-3">
                    <h2 className="text-[15px] font-bold text-gray-900 ml-1">
                        Admin Tools
                    </h2>
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={() => navigate('/admin/shop-content')}
                            className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-primary hover:bg-primary/5 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Database size={20} className="text-orange-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-gray-900">Shop Content</h3>
                                    <p className="text-xs text-gray-500">랭킹 & 리뷰 일괄 변경</p>
                                </div>
                            </div>
                            <ChevronLeft size={20} className="text-gray-400 rotate-180" />
                        </button>
                    </div>
                </section>

                {/* Info Card */}
                {!isUpdating && !result?.success && (
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3">
                        <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                        <p className="text-sm text-orange-800 leading-relaxed font-medium">
                            {t('admin.warning')}
                        </p>
                    </div>
                )}

                {/* Table Selection */}
                <section className={cn("space-y-3", isUpdating && "opacity-50 pointer-events-none")}>
                    <h2 className="text-[15px] font-bold text-gray-900 ml-1">
                        {t('admin.select_table')}
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setSelectedTable('shops')}
                            className={cn(
                                "h-14 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all",
                                selectedTable === 'shops'
                                    ? "bg-white border-primary text-primary"
                                    : "bg-white border-gray-100 text-gray-400"
                            )}
                        >
                            <Database size={18} />
                            {t('admin.shops')}
                        </button>
                        <button
                            onClick={() => setSelectedTable('content')}
                            className={cn(
                                "h-14 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all",
                                selectedTable === 'content'
                                    ? "bg-white border-primary text-primary"
                                    : "bg-white border-gray-100 text-gray-400"
                            )}
                        >
                            <Database size={18} />
                            {t('admin.content')}
                        </button>
                    </div>
                </section>

                {/* Import Mode Selection */}
                <section className={cn("space-y-3", isUpdating && "opacity-50 pointer-events-none")}>
                    <h2 className="text-[15px] font-bold text-gray-900 ml-1">
                        Import Mode
                    </h2>
                    <div className="bg-white rounded-2xl p-2 border border-gray-100 flex flex-col gap-1">
                        <label className={cn(
                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                            importMode === 'overwrite' ? "bg-primary/5 border border-primary/20" : "hover:bg-gray-50 border border-transparent"
                        )}>
                            <input
                                type="radio"
                                name="importMode"
                                value="overwrite"
                                checked={importMode === 'overwrite'}
                                onChange={() => setImportMode('overwrite')}
                                className="w-5 h-5 text-primary border-gray-300 focus:ring-primary"
                            />
                            <div className="flex flex-col">
                                <span className={cn("font-bold text-sm", importMode === 'overwrite' ? "text-primary" : "text-gray-900")}>
                                    처음부터 만들기 (Reset)
                                </span>
                                <span className="text-xs text-gray-500">
                                    전체 지우고 추가
                                </span>
                            </div>
                        </label>

                        <label className={cn(
                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                            importMode === 'append' ? "bg-primary/5 border border-primary/20" : "hover:bg-gray-50 border border-transparent"
                        )}>
                            <input
                                type="radio"
                                name="importMode"
                                value="append"
                                checked={importMode === 'append'}
                                onChange={() => setImportMode('append')}
                                className="w-5 h-5 text-primary border-gray-300 focus:ring-primary"
                            />
                            <div className="flex flex-col">
                                <span className={cn("font-bold text-sm", importMode === 'append' ? "text-primary" : "text-gray-900")}>
                                    뒤에 추가하기 (Append)
                                </span>
                                <span className="text-xs text-gray-500">
                                    현재 마지막 행을 확인하고 다음부터 추가
                                </span>
                            </div>
                        </label>
                    </div>
                </section>

                {/* Upload Section */}
                <section className={cn("space-y-3", isUpdating && "opacity-50 pointer-events-none")}>
                    <h2 className="text-[15px] font-bold text-gray-900 ml-1">
                        {t('admin.upload_tsv')}
                    </h2>
                    <label className={cn(
                        "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-colors",
                        file ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:bg-gray-50"
                    )}>
                        <input type="file" accept=".tsv" className="hidden" onChange={handleFileChange} />
                        <Upload className={cn("mb-3", file ? "text-primary" : "text-gray-300")} size={32} />
                        <p className={cn("text-sm font-bold", file ? "text-primary" : "text-gray-500")}>
                            {file ? file.name : "TSV 파일을 선택해주세요"}
                        </p>
                    </label>
                </section>

                {/* Process Status Section */}
                {(isUpdating || progress > 0) && (
                    <section className="space-y-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-900">Process Status</h3>
                            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <p className="text-sm text-gray-500 font-medium">
                            {statusMessage}
                        </p>
                    </section>
                )}

                {/* Result Area */}
                {result && (
                    <div className={cn(
                        "rounded-2xl p-6 flex flex-col items-center text-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500",
                        result.success ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
                    )}>
                        {result.success ? (
                            <>
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-1">
                                    <CheckCircle2 className="text-green-600" size={28} />
                                </div>
                                <h3 className="text-lg font-bold text-green-900">Update Completed</h3>
                                <p className="text-green-800 font-medium leading-relaxed">
                                    {t('admin.success', { count: result.count })}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-1">
                                    <AlertTriangle className="text-red-600" size={28} />
                                </div>
                                <h3 className="text-lg font-bold text-red-900">Update Failed</h3>
                                <p className="text-red-800 font-medium">
                                    {t('admin.error', { message: result.message })}
                                </p>
                            </>
                        )}

                        <button
                            onClick={() => setResult(null)}
                            className="mt-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Actions */}
            <footer className="p-6 bg-white border-t shrink-0">
                <button
                    onClick={handleUpdate}
                    disabled={!file || isUpdating}
                    className={cn(
                        "w-full h-14 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                        !file || isUpdating
                            ? "bg-gray-100 text-gray-400"
                            : "bg-primary text-white shadow-lg shadow-primary/20"
                    )}
                >
                    {isUpdating ? (
                        <>
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('admin.updating')}
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            {t('admin.update_btn')}
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
};
