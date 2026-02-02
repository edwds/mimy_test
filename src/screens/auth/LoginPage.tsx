import { Apple, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { API_BASE_URL } from '@/lib/api';
import { useEffect } from 'react';

import { useUser } from '@/context/UserContext';
import { saveTokens } from '@/lib/tokenStorage';
import { authFetch } from '@/lib/authFetch';

import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// GoogleAuth initialization moved to App.tsx

export const LoginPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login: contextLogin, user, loading } = useUser();

    // If already logged in, redirect to main
    useEffect(() => {
        if (!loading && user) {
            console.log('[Login] Already logged in, redirecting to main');
            navigate('/main', { replace: true });
        }
    }, [loading, user, navigate]);

    const handleLogin = async () => {
        try {
            // Clear previous user data before login
            console.log('[Login] Clearing previous user data...');
            localStorage.removeItem('mimy_user_id');
            localStorage.removeItem('mimy_reg_google_info');
            localStorage.removeItem('mimy_reg_phone');
            localStorage.removeItem('mimy_reg_birthyear');
            localStorage.removeItem('mimy_reg_nickname');

            if (Capacitor.isNativePlatform()) {
                // Native Login
                const user = await GoogleAuth.signIn();
                // const idToken = user.authentication.idToken;
                // Alternatively user.serverAuthCode if available and configured
                // The backend expects `token` which is usually the access_token for web flow,
                // but checking backend logic might be needed.
                // Assuming backend verifies via token.

                // Note: The web flow sends { token: access_token }.
                // GoogleAuth plugin returns authentication object.
                // Let's assume we send ID token or Server Auth Code depending on verification strategy.
                // For this project, if we use access_token verification on backend, we need the access_token.
                // GoogleAuth plugin returns `authentication.accessToken`.
                await processLogin(user.authentication.accessToken);
            } else {
                // Web Login
                webLogin();
            }
        } catch (e) {
            console.error(e);
            alert("Login Failed");
        }
    };

    const processLogin = async (accessToken: string) => {
        try {
            console.log('[Login] Sending Google token to backend...');

            // Send access token to backend
            const response = await authFetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: accessToken })
            });

            console.log('[Login] Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[Login] Response data:', {
                    hasUser: !!data.user,
                    hasTokens: !!data.tokens,
                    isNew: data.isNew,
                    userId: data.user?.id,
                    userEmail: data.user?.email,
                    tokenKeys: data.tokens ? Object.keys(data.tokens) : []
                });

                const { user, isNew, tokens } = data;
                console.log('[Login] isNew flag:', isNew);

                if (isNew) {
                    // New User: Don't login yet, just go to register
                    console.log('[Login] ✅ New user detected, redirecting to registration');
                    console.log('[Login] User info:', user);

                    if (!user || !user.email) {
                        console.error('[Login] ❌ Invalid user data from server');
                        alert('서버로부터 사용자 정보를 받지 못했습니다. 다시 시도해주세요.');
                        return;
                    }

                    localStorage.setItem("mimy_reg_google_info", JSON.stringify(user));
                    console.log('[Login] Google info saved to localStorage, navigating to /register/phone');
                    navigate('/register/phone');
                    return; // Important: stop execution here
                }

                // Existing user
                console.log('[Login] ✅ Existing user, platform:', Capacitor.isNativePlatform() ? 'Native' : 'Web');
                console.log('[Login] Tokens available:', !!tokens);

                // Save user ID to localStorage for x-user-id header (temporary fallback)
                if (user?.id) {
                    console.log('[Login] Saving user ID to localStorage:', user.id);
                    localStorage.setItem('mimy_user_id', user.id.toString());
                } else {
                    console.error('[Login] ❌ No user ID in response');
                    alert('서버 응답에 사용자 ID가 없습니다. 다시 시도해주세요.');
                    return;
                }

                // Existing User: Save tokens for native apps
                if (tokens && Capacitor.isNativePlatform()) {
                        console.log('[Login] Attempting to save tokens for native platform...');
                        console.log('[Login] Token types:', typeof tokens.accessToken, typeof tokens.refreshToken);
                        console.log('[Login] Access token length:', tokens.accessToken?.length);
                        console.log('[Login] Refresh token length:', tokens.refreshToken?.length);

                        const saved = await saveTokens(tokens.accessToken, tokens.refreshToken);
                        if (!saved) {
                            console.error('[Login] ❌ Failed to save tokens, cannot proceed');
                            alert('로그인 정보 저장에 실패했습니다. 다시 시도해주세요.');
                            return;
                        }
                        console.log('[Login] ✅ Tokens saved successfully');

                        // Double-check by reading token back
                        const { getAccessToken } = await import('@/lib/tokenStorage');
                        const verifyToken = await getAccessToken();
                        if (!verifyToken) {
                            console.error('[Login] ❌ Token verification failed - cannot read back saved token!');
                            alert('로그인 정보 확인에 실패했습니다. 앱을 재시작해주세요.');
                            return;
                        }
                        console.log('[Login] ✅ Token verified successfully, length:', verifyToken.length);
                } else if (Capacitor.isNativePlatform() && !tokens) {
                    console.error('[Login] ❌ Native platform but no tokens in response!');
                    alert('서버로부터 인증 정보를 받지 못했습니다. 다시 시도해주세요.');
                    return;
                } else {
                    // Web: Wait for browser to process Set-Cookie headers
                    console.log('[Login] Web platform, waiting for cookies to be set...');
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                // Login (JWT cookies already set by server for web)
                console.log('[Login] Calling contextLogin with userId:', user.id);
                await contextLogin(user.id.toString());
                console.log('[Login] contextLogin completed');

                // Give a moment for UserContext to update
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log('[Login] Navigating to /main');
                navigate('/main');
            } else if (response.status === 403) {
                const errorData = await response.json();
                console.error('[Login] 403 Error:', errorData);
                alert(errorData.message || "Only @catchtable.co.kr email addresses are allowed");
            } else {
                const errorText = await response.text();
                console.error('[Login] Server error:', response.status, errorText);
                alert(`Login failed on server: ${response.status}`);
            }
        } catch (e) {
            console.error('[Login] Network error:', e);
            alert(`Network error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    // Web Login Wrapper
    const webLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => processLogin(tokenResponse.access_token),
        onError: () => alert("Google Login Failed"),
    });

    return (
        <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6 animate-in fade-in duration-500 overflow-hidden">
            <header className="flex-1 flex flex-col justify-center items-center space-y-6">
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">{t('auth.login.title')}</h1>
                    <p className="text-muted-foreground">{t('auth.login.desc')}</p>
                    <p className="text-sm text-muted-foreground/70 pt-2">
                        @catchtable.co.kr {t('auth.login.emailOnly', { defaultValue: 'email addresses only' })}
                    </p>
                </div>
            </header>

            <main className="space-y-4 mb-8">
                {/* Google */}
                <Button
                    variant="outline"
                    className="w-full border-muted-foreground/20"
                    size="lg"
                    onClick={handleLogin}
                >
                    <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                    {t('auth.login.google')}
                </Button>

                {/* Apple */}
                <Button
                    className="w-full bg-black text-white hover:bg-black/90 opacity-50 cursor-not-allowed"
                    size="lg"
                    disabled
                >
                    <Apple className="mr-2 w-5 h-5 fill-current" />
                    {t('auth.login.apple')}
                </Button>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {t('auth.login.or')}
                        </span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full text-muted-foreground opacity-50 cursor-not-allowed"
                    disabled
                >
                    <Mail className="mr-2 w-4 h-4" />
                    {t('auth.login.email')}
                </Button>
            </main>
        </div>
    );
};
