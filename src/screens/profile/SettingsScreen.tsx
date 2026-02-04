import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';
import { Browser } from '@capacitor/browser';
import { ChevronRight, ChevronLeft, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';

export const SettingsScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout, refreshUser } = useUser();

    const [isIdSheetOpen, setIsIdSheetOpen] = useState(false);
    const [newId, setNewId] = useState('');
    const [savingId, setSavingId] = useState(false);

    const handleLogout = async () => {
        console.log('[SettingsScreen] Logout button clicked');

        try {
            // Use native dialog on mobile, browser confirm on web
            let confirmed = false;

            if (Capacitor.isNativePlatform()) {
                const result = await Dialog.confirm({
                    title: t('profile.menu.logout_confirm') || 'Are you sure you want to logout?',
                    message: '',
                    okButtonTitle: t('common.confirm') || 'OK',
                    cancelButtonTitle: t('common.cancel') || 'Cancel'
                });
                confirmed = result.value;
                console.log('[SettingsScreen] Native dialog result:', confirmed);
            } else {
                confirmed = window.confirm(t('profile.menu.logout_confirm'));
                console.log('[SettingsScreen] Web confirm result:', confirmed);
            }

            if (confirmed) {
                console.log('[SettingsScreen] Logout confirmed, calling logout()');
                await logout();
                console.log('[SettingsScreen] Logout completed');
                // Note: logout() already redirects to /start via window.location.href
            } else {
                console.log('[SettingsScreen] Logout cancelled');
            }
        } catch (error) {
            console.error('[SettingsScreen] Logout error:', error);
        }
    };

    const handleRetakeQuiz = () => {
        if (window.confirm(t('profile.menu.quiz_confirm'))) {
            navigate('/quiz/test');
        }
    };

    const handleMockAction = (featureName: string) => {
        alert(`${featureName}: ${t('profile.menu.coming_soon')}`);
    };

    const handleOpenSuggestions = async () => {
        const url = 'https://wad-hq.slack.com/archives/C0A9THPF0SG';
        try {
            if (Capacitor.isNativePlatform()) {
                await Browser.open({ url });
            } else {
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Failed to open suggestions link:', error);
        }
    };

    const openIdSheet = () => {
        setNewId(user?.account_id || '');
        setIsIdSheetOpen(true);
    };

    const handleSaveId = async () => {
        if (!user || !newId.trim()) return;

        setSavingId(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: newId }),
            });

            if (response.ok) {
                await refreshUser();
                setIsIdSheetOpen(false);
                alert(t('profile.id_sheet.success'));
            } else {
                const err = await response.json();
                alert(err.error || t('profile.id_sheet.fail'));
            }
        } catch (e) {
            console.error(e);
            alert(t('profile.id_sheet.error'));
        } finally {
            setSavingId(false);
        }
    };

    const MenuItem = ({ label, onClick, value, isDestructive = false }: { label: string, onClick: () => void, value?: string, isDestructive?: boolean }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between py-4 px-1 bg-background active:bg-muted/50 transition-colors"
        >
            <span className={`text-[17px] ${isDestructive ? 'text-red-500' : 'text-foreground'}`}>
                {label}
            </span>
            <div className="flex items-center gap-2">
                {value && <span className="text-[17px] text-muted-foreground">{value}</span>}
                {!isDestructive && <ChevronRight className="w-5 h-5 text-muted-foreground/50" />}
            </div>
        </button>
    );



    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header
                className="px-4 py-3 flex items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10"
                style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 0.75rem)' : undefined }}
            >
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">{t('profile.settings.title')}</h1>
            </header>

            <main className="flex-1 overflow-y-auto" data-scroll-container="true">
                <div className="p-5 pb-10">
                    {/* Account Section */}
                    {/* <SectionHeader title={t('profile.settings.section_account')} /> */}

                    <MenuItem
                        label={t('profile.menu.change_id')}
                        value={user?.account_id}
                        onClick={openIdSheet}
                    />
                    <MenuItem
                        label={t('profile.menu.edit_profile')}
                        onClick={() => navigate('/profile/edit')}
                    />
                    <MenuItem
                        label={t('profile.menu.retake_quiz')}
                        onClick={handleRetakeQuiz}
                    />
                    <MenuItem
                        label={t('profile.menu.manage_vs')}
                        onClick={() => navigate('/profile/manage/vs')}
                    />
                    <MenuItem
                        label={t('profile.menu.manage_hate')}
                        onClick={() => navigate('/profile/manage/hate')}
                    />
                    <MenuItem
                        label={t('profile.settings.school_company')}
                        onClick={() => handleMockAction(t('profile.settings.school_company'))}
                    />
                    <MenuItem
                        label={t('profile.settings.neighborhood')}
                        onClick={() => handleMockAction(t('profile.settings.neighborhood'))}
                    />

                    <div className="h-px bg-border/50 my-2" />

                    {/* Usage Section */}
                    {/* <SectionHeader title={t('profile.settings.section_usage')} /> */}

                    <MenuItem
                        label={t('profile.settings.notifications')}
                        onClick={() => handleMockAction(t('profile.settings.notifications'))}
                    />
                    <MenuItem
                        label={t('profile.settings.blocked_users')}
                        onClick={() => handleMockAction(t('profile.settings.blocked_users'))}
                    />
                    <MenuItem
                        label={t('profile.settings.suggestions')}
                        onClick={handleOpenSuggestions}
                    />

                    <div className="h-px bg-border/50 my-2" />

                    {/* Info Section */}
                    {/* <SectionHeader title={t('profile.settings.section_info')} /> */}

                    <MenuItem
                        label={t('profile.settings.about')}
                        onClick={() => handleMockAction(t('profile.settings.about'))}
                    />
                    <MenuItem
                        label={t('profile.settings.notices')}
                        onClick={() => handleMockAction(t('profile.settings.notices'))}
                    />
                    <MenuItem
                        label={t('profile.settings.terms')}
                        onClick={() => handleMockAction(t('profile.settings.terms'))}
                    />
                    <MenuItem
                        label={t('profile.settings.privacy')}
                        onClick={() => handleMockAction(t('profile.settings.privacy'))}
                    />
                    <MenuItem
                        label={t('profile.settings.opensource')}
                        onClick={() => handleMockAction(t('profile.settings.opensource'))}
                    />
                    <MenuItem
                        label={t('profile.settings.version')}
                        value="1.0.0"
                        onClick={() => { }}
                    />

                    <div className="h-px bg-border/50 my-2" />

                    <MenuItem
                        label={t('profile.menu.logout')}
                        onClick={handleLogout}
                        isDestructive
                    />
                </div>
            </main>

            {/* ID Sheet */}
            {isIdSheetOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
                        onClick={() => setIsIdSheetOpen(false)}
                    />

                    <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl z-50 p-6 animate-in slide-in-from-bottom duration-300 shadow-lg"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">{t('profile.id_sheet.title')}</h3>
                            <button onClick={() => setIsIdSheetOpen(false)} className="p-2 -mr-2 text-muted-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">{t('profile.id_sheet.label')}</label>
                                <input
                                    type="text"
                                    value={newId}
                                    onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                                    className="w-full border-b border-border py-2 text-xl bg-transparent focus:outline-none focus:border-primary font-mono"
                                    autoFocus
                                    placeholder={t('profile.id_sheet.placeholder')}
                                />
                                <p className="text-xs text-muted-foreground">{t('profile.id_sheet.helper')}</p>
                            </div>

                            <Button
                                className="w-full h-12 text-lg mt-4"
                                onClick={handleSaveId}
                                disabled={savingId || !newId || newId === user?.account_id}
                            >
                                {savingId ? <Loader2 className="animate-spin" /> : t('profile.id_sheet.save')}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
