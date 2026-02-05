import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SplashScreen } from '@/screens/onboarding/SplashScreen';
import { StartPage } from '@/screens/onboarding/StartPage';
import { AgeCheckStep } from '@/screens/onboarding/AgeCheckStep';
import { AgreementStep } from '@/screens/onboarding/AgreementStep';
import { LoginPage } from '@/screens/auth/LoginPage';
import { PhoneStep } from '@/screens/register/PhoneStep';
import { OtpStep } from '@/screens/register/OtpStep';
import { ProfileStep } from '@/screens/register/ProfileStep';
import { MainTab } from '@/screens/main/MainTab';
import './i18n';
import DebugLocaleSwitcher from '@/components/DebugLocaleSwitcher';
import { QuizIntro } from '@/screens/quiz/QuizIntro';
import { QuizScreen } from '@/screens/quiz/QuizScreen';
import { QuizResult } from '@/screens/quiz/QuizResult';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';
import { ImportScreen } from '@/screens/profile/ImportScreen';
import { ConnectionsScreen } from '@/screens/main/ConnectionsScreen';
import { WriteFlow } from '@/screens/write/WriteFlow';
import { AdminScreen } from '@/screens/admin/AdminScreen';
import { AdminMatchScreen } from '@/screens/admin/AdminMatchScreen';
import { ShopContentAdmin } from '@/screens/admin/ShopContentAdmin';
import { BannerAdminScreen } from '@/screens/admin/BannerAdminScreen';
import { ManageRankingScreen } from '@/screens/profile/ManageRankingScreen';
import { ManageVsScreen } from '@/screens/profile/ManageVsScreen';
import { ManageHateScreen } from '@/screens/profile/ManageHateScreen';
import { ListDetailScreen } from '@/screens/profile/ListDetailScreen';
import { ContentDetailScreen } from '@/screens/content/ContentDetailScreen';
import { NotificationScreen } from '@/screens/notification/NotificationScreen';
import { UserProvider, useUser } from '@/context/UserContext';
import { RankingProvider } from '@/context/RankingContext';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { StatusBarGuard } from '@/components/StatusBarGuard';

// Initialize GoogleAuth once at app startup
if (Capacitor.isNativePlatform()) {
    GoogleAuth.initialize();
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useUser();

    if (loading) {
        return <SplashScreen />;
    }

    if (!user) {
        return <Navigate to="/start" replace />;
    }

    return children;
};

// App content component that uses UserContext
function AppContent() {
    const { user, loading: userLoading } = useUser();
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        // Show splash for at least 2 seconds on first load if not logged in
        if (!userLoading) {
            const timer = setTimeout(() => setInitialLoading(false), user ? 0 : 2000);
            return () => clearTimeout(timer);
        }
    }, [userLoading, user]);

    const showLoading = userLoading || initialLoading;

    return (
        <BrowserRouter>
            <RankingProvider>
                <DebugLocaleSwitcher />
                <StatusBarGuard />
                {showLoading ? (
                    <SplashScreen />
                ) : (
                    <Routes>
                        <Route path="/" element={user ? <Navigate to="/main" replace /> : <Navigate to="/start" replace />} />
                                <Route path="/start" element={<StartRoute />} />

                                {/* Onboarding Flow */}
                                <Route path="/onboarding/age-check" element={<AgeCheckStep />} />
                                <Route path="/onboarding/agreement" element={<AgreementStep />} />

                                {/* Auth */}
                                <Route path="/login" element={<LoginPage />} />

                                {/* Registration Flow */}
                                <Route path="/register/phone" element={<PhoneStep />} />
                                <Route path="/register/otp" element={<OtpStep />} />
                                <Route path="/register/profile" element={<ProfileStep />} />

                                {/* Quiz Flow */}
                                {/* Protected Routes */}
                                <Route path="/quiz/intro" element={<ProtectedRoute><QuizIntro /></ProtectedRoute>} />
                                <Route path="/quiz/test" element={<ProtectedRoute><QuizScreen /></ProtectedRoute>} />
                                <Route path="/quiz/result" element={<ProtectedRoute><QuizResult /></ProtectedRoute>} />

                                <Route path="/write" element={<ProtectedRoute><WriteFlow /></ProtectedRoute>} />
                                <Route path="/main/*" element={<ProtectedRoute><MainTab /></ProtectedRoute>} />
                                <Route path="/profile/edit" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
                                <Route path="/profile/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
                                <Route path="/profile/lists/:userId" element={<ProtectedRoute><RedirectToList /></ProtectedRoute>} />
                                <Route path="/profile/import" element={<ProtectedRoute><ImportScreen /></ProtectedRoute>} />
                                <Route path="/profile/connections" element={<ProtectedRoute><ConnectionsScreen /></ProtectedRoute>} />
                                <Route path="/shop/:shopId" element={<ProtectedRoute><RedirectToShop /></ProtectedRoute>} />
                                <Route path="/profile/manage/vs" element={<ProtectedRoute><ManageVsScreen /></ProtectedRoute>} />
                                <Route path="/profile/manage/ranking" element={<ProtectedRoute><ManageRankingScreen /></ProtectedRoute>} />
                                <Route path="/profile/manage/hate" element={<ProtectedRoute><ManageHateScreen /></ProtectedRoute>} />
                                <Route path="/content/detail" element={<ProtectedRoute><ContentDetailScreen /></ProtectedRoute>} />
                                <Route path="/notifications" element={<ProtectedRoute><NotificationScreen /></ProtectedRoute>} />
                                <Route path="/admin" element={<ProtectedRoute><AdminScreen /></ProtectedRoute>} />
                                <Route path="/admin/match" element={<ProtectedRoute><AdminMatchScreen /></ProtectedRoute>} />
                                <Route path="/admin/shop-content" element={<ProtectedRoute><ShopContentAdmin /></ProtectedRoute>} />
                                <Route path="/admin/banners" element={<ProtectedRoute><BannerAdminScreen /></ProtectedRoute>} />

                                {/* Redirect old user profile link to new one */}
                                <Route path="/user/:userId" element={<ProtectedRoute><RedirectToMainUser /></ProtectedRoute>} />

                                {/* Public Shared List - No Auth Required */}
                                <Route path="/s/:code" element={<ListDetailScreen />} />
                            </Routes>
                        )}
                    </RankingProvider>
                </BrowserRouter>
    );
}

function App() {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
        console.error("Missing VITE_GOOGLE_CLIENT_ID in environment variables");
    }

    return (
        <GoogleOAuthProvider clientId={googleClientId || ""}>
            <UserProvider>
                <AppContent />
            </UserProvider>
        </GoogleOAuthProvider>
    );
}

const StartRoute = () => {
    const navigate = useNavigate();
    return <StartPage onStart={() => navigate('/onboarding/age-check')} />;
};

const RedirectToMainUser = () => {
    const { userId } = useParams();
    return <Navigate to={`/main?viewUser=${userId}`} replace />;
};

const RedirectToShop = () => {
    const { shopId } = useParams();
    return <Navigate to={`/main?viewShop=${shopId}`} replace />;
};

const RedirectToList = () => {
    const { userId } = useParams();
    const [searchParams] = useSearchParams();
    return <Navigate to={`/main?viewListUser=${userId}&${searchParams.toString()}`} replace />;
};

// PublicHome removed as it's replaced by explicit /start route
// const PublicHome = () => {
//     const navigate = useNavigate();
//     return <StartPage onStart={() => navigate('/onboarding/age-check')} />;
// };

export default App;