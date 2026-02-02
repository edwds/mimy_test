import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Loader2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { resizeImage } from '@/lib/image';
import { API_BASE_URL } from '@/lib/api';

import { useUser } from '@/context/UserContext';
import { saveTokens } from '@/lib/tokenStorage';
import { authFetch } from '@/lib/authFetch';
import { Capacitor } from '@capacitor/core';

import { useTranslation } from 'react-i18next';

export const ProfileStep = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refreshUser } = useUser();
    const [step, setStep] = useState(0); // 0: Handle, 1: Nickname, 2: Photo
    const [handle, setHandle] = useState("");
    const [nickname, setNickname] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Validation State
    const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputRef = useRef<HTMLInputElement>(null);
    const nicknameInputRef = useRef<HTMLInputElement>(null);

    // Auto focus on step change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (step === 0) handleInputRef.current?.focus();
            if (step === 1) nicknameInputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
    }, [step]);

    // Debounce Check
    useEffect(() => {
        if (step !== 0 || handle.length < 3) {
            setHandleStatus('idle');
            setErrorMessage(null);
            return;
        }

        const timer = setTimeout(() => {
            checkHandleAvailability(handle);
        }, 1000);

        return () => clearTimeout(timer);
    }, [handle, step]);

    const checkHandleAvailability = async (checkHandle: string) => {
        if (checkHandle.length < 3) return;

        setHandleStatus('checking');
        setErrorMessage(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/check-handle?handle=${checkHandle}`);
            const data = await response.json();

            if (data.available) {
                setHandleStatus('available');
            } else {
                setHandleStatus('taken');
                setErrorMessage(t('register.profile.id.taken'));
            }
        } catch (error) {
            console.error("Check failed", error);
            setHandleStatus('idle'); // Retry allowed
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        } else {
            navigate(-1);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            // 1. Resize
            const resizedBlob = await resizeImage(file, 1280);
            console.log("Resized blob size:", resizedBlob.size);
            if (resizedBlob.size === 0) throw new Error("Resized image is empty");

            // 2. Upload
            const formData = new FormData();
            formData.append("file", resizedBlob, file.name);

            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setPhotoUrl(data.url);
            } else {
                const errorText = await response.text();
                alert(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error uploading image");
        } finally {
            setUploading(false);
        }
    };

    const handleNext = async () => {
        if (step < 2) {
            if (step === 0 && handleStatus !== 'available') return;

            if (step === 1 && nickname.trim() === "") {
                setNickname(handle);
            }

            setStep(step + 1);
        } else {
            // Final submit
            setChecking(true);
            const userId = localStorage.getItem("mimy_user_id");

            try {
                const birthDate = localStorage.getItem("mimy_reg_birthyear");
                const phone = localStorage.getItem("mimy_reg_phone");

                let response;

                if (userId) {
                    // Update existing user
                    response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            account_id: handle,
                            nickname: nickname,
                            phone: phone,
                            birthdate: birthDate,
                            profile_image: photoUrl
                        })
                    });
                } else {
                    // Create new user (Registration)
                    const googleInfoStr = localStorage.getItem("mimy_reg_google_info");
                    if (!googleInfoStr) {
                        alert("Session expired. Please login again.");
                        navigate('/login');
                        return;
                    }
                    const googleInfo = JSON.parse(googleInfoStr);

                    response = await authFetch(`${API_BASE_URL}/api/auth/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: googleInfo.email,
                            account_id: handle,
                            nickname: nickname,
                            phone: phone,
                            birthdate: birthDate,
                            profile_image: photoUrl || googleInfo.profile_image,
                            gender: null, // Removed gender step or it's implicitly M/F? Assuming null for now
                            taste_cluster: null
                        })
                    });
                }

                if (response.ok) {
                    console.log('[Register] Response OK, parsing JSON...');
                    const responseText = await response.text();
                    console.log('[Register] Response text:', responseText);

                    let data;
                    try {
                        data = JSON.parse(responseText);
                        console.log('[Register] Parsed data:', data);
                    } catch (parseError) {
                        console.error('[Register] JSON parse error:', parseError);
                        console.error('[Register] Response text that failed to parse:', responseText);
                        alert(`서버 응답 파싱 실패: ${responseText}`);
                        setChecking(false);
                        return;
                    }

                    const { tokens } = data;

                    // Save tokens for native apps
                    if (Capacitor.isNativePlatform()) {
                        if (!tokens) {
                            console.error('[Register] ❌ Native platform but no tokens in response!');
                            alert('서버로부터 인증 정보를 받지 못했습니다. 다시 시도해주세요.');
                            return;
                        }

                        console.log('[Register] Saving tokens for native platform...');
                        console.log('[Register] Access token length:', tokens.accessToken?.length);
                        console.log('[Register] Refresh token length:', tokens.refreshToken?.length);

                        const saved = await saveTokens(tokens.accessToken, tokens.refreshToken);
                        if (!saved) {
                            console.error('[Register] ❌ Failed to save tokens, cannot proceed');
                            alert('로그인 정보 저장에 실패했습니다. 다시 시도해주세요.');
                            return;
                        }
                        console.log('[Register] ✅ Tokens saved successfully');

                        // Double-check by reading token back
                        const { getAccessToken } = await import('@/lib/tokenStorage');
                        const verifyToken = await getAccessToken();
                        if (!verifyToken) {
                            console.error('[Register] ❌ Token verification failed - cannot read back saved token!');
                            alert('로그인 정보 확인에 실패했습니다. 앱을 재시작해주세요.');
                            return;
                        }
                        console.log('[Register] ✅ Token verified successfully, length:', verifyToken.length);

                        // Wait a bit for token storage to fully commit (especially on iOS)
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    console.log('[Register] Calling refreshUser to update context...');
                    // Skip authFailed check since we just registered successfully
                    await refreshUser(true);
                    console.log('[Register] refreshUser completed');

                    // Clear temp reg data
                    localStorage.removeItem("mimy_reg_birthyear");
                    localStorage.removeItem("mimy_reg_phone");
                    localStorage.removeItem("mimy_reg_google_info");

                    navigate('/quiz/intro');
                } else {
                    let errorData: any = null;
                    try {
                        const text = await response.text();
                        errorData = text ? JSON.parse(text) : { error: 'Unknown error' };
                    } catch (parseError) {
                        console.error('[Register] Failed to parse error response:', parseError);
                        errorData = { error: 'Failed to parse server response' };
                    }
                    console.error('[Register] Server error:', response.status, errorData);
                    alert(errorData.error || "Failed to save profile");
                    setChecking(false);
                }
            } catch (e) {
                console.error('[Register] Network error:', e);
                alert(`Network error: ${e instanceof Error ? e.message : 'Unknown error'}`);
                setChecking(false);
            }
        }
    };

    const isNextDisabled = () => {
        if (step === 0) return handleStatus !== 'available';
        // if (step === 1) return nickname.length < 1; // Allow empty nickname
        if (step === 2) return checking || uploading;
        return false;
    };

    const stepVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6 overflow-hidden">
            <header className="flex items-center mb-8 gap-4">
                <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        variants={stepVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="flex-1 flex flex-col space-y-8"
                    >
                        {step === 0 && (
                            <>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold">{t('register.profile.id.title')}</h1>
                                    <p className="text-muted-foreground">{t('register.profile.id.desc')}</p>
                                </div>

                                <div className="pt-4">
                                    <div
                                        className="
      flex items-baseline gap-1
      border-b-2 border-border
      py-4
      focus-within:border-primary transition-colors
      relative
    "
                                    >
                                        <span className="text-3xl font-bold text-muted-foreground leading-none">
                                            @
                                        </span>

                                        <input
                                            ref={handleInputRef}
                                            type="text"
                                            placeholder={t('register.profile.id.placeholder')}
                                            value={handle}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                                                setHandle(val);
                                                setHandleStatus('idle'); // Reset on type
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    checkHandleAvailability(handle);
                                                }
                                            }}
                                            className="
        flex-1
        bg-transparent
        text-3xl font-bold leading-none
        outline-none
        placeholder:text-muted/20
      "
                                            autoFocus
                                        />

                                        {/* Validation Icons */}
                                        <div className="flex items-center absolute right-0 top-1/2 -translate-y-1/2">
                                            {handleStatus === 'checking' && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
                                            {handleStatus === 'available' && <Check className="w-6 h-6 text-green-500" />}
                                            {handleStatus === 'taken' && <X className="w-6 h-6 text-destructive" />}
                                        </div>
                                    </div>
                                    {errorMessage && (
                                        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
                                    )}
                                    {!errorMessage && (
                                        <p className="mt-2 text-sm text-muted-foreground/60">
                                            {t('register.profile.id.rules')}
                                        </p>
                                    )}
                                </div>                            </>
                        )}

                        {step === 1 && (
                            <>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold">{t('register.profile.nickname.title')}</h1>
                                    <p className="text-muted-foreground">{t('register.profile.nickname.desc')}</p>
                                </div>
                                <div className="pt-4">
                                    <input
                                        type="text"
                                        placeholder={t('register.profile.nickname.placeholder')}
                                        value={nickname}
                                        onChange={(e) => {
                                            const val = e.target.value
                                                .replace(/[\p{C}]/gu, '')  // remove control chars
                                                .slice(0, 30);             // max length
                                            setNickname(val);
                                        }} className="w-full text-3xl font-bold bg-transparent border-b-2 border-border py-4 focus:outline-none focus:border-primary transition-colors placeholder:text-muted/20"
                                        autoFocus
                                    />
                                    <p className="mt-4 text-sm text-muted-foreground">
                                        {t('register.profile.nickname.id_label')} <span className="font-semibold text-primary">@{handle}</span>
                                    </p>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold">{t('register.profile.photo.title')}</h1>
                                    <p className="text-muted-foreground">{t('register.profile.photo.desc')}</p>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                                    {/* OUTER: overflow-visible */}
                                    <div className="relative">
                                        {/* CLICKABLE AVATAR SHELL */}
                                        <div
                                            className="
                                            w-40 h-40 rounded-full bg-muted
                                            ring-1 ring-border shadow-sm
                                            hover:ring-2 hover:ring-primary hover:shadow-md
                                            transition
                                            cursor-pointer
                                            flex items-center justify-center
                                            "
                                            onClick={() => fileInputRef.current?.click()}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                                        >
                                            {/* INNER: only this clips the photo */}
                                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                                {photoUrl ? (
                                                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Camera className="w-10 h-10 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">{t('register.profile.photo.upload')}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {uploading && (
                                                <div className="absolute inset-0 rounded-full bg-background/50 flex items-center justify-center">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>

                                        {/* EDIT / CAMERA BUTTON (never clipped) */}
                                        {!uploading && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="
                                                absolute -bottom-1 -right-1
                                                w-11 h-11 rounded-full
                                                bg-primary text-primary-foreground
                                                shadow-md
                                                grid place-items-center
                                                hover:scale-[1.03] active:scale-[0.98]
                                                transition
                                                ring-4 ring-background
                                                "
                                                aria-label="Change profile photo"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />

                                    <div className="mt-8 text-center space-y-1">
                                        <h3 className="text-3xl font-bold">{nickname}</h3>
                                        <p className="text-lg text-muted-foreground">@{handle}</p>
                                    </div>
                                </div>                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer className="mt-auto pt-6">
                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleNext}
                    disabled={isNextDisabled()}
                >
                    {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 2 ? t('register.profile.complete') : t('register.profile.next')}
                </Button>
            </footer>
        </div>
    );
};
