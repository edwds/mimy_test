import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import { QuizIntro } from '@/screens/quiz/QuizIntro';
import { QuizScreen } from '@/screens/quiz/QuizScreen';
import { QuizResult } from '@/screens/quiz/QuizResult';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { WriteFlow } from '@/screens/write/WriteFlow';

function App() {
    const isLoggedIn = !!localStorage.getItem("mimy_user_id");
    const [loading, setLoading] = useState(!isLoggedIn);

    useEffect(() => {
        if (!isLoggedIn) {
            const timer = setTimeout(() => setLoading(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isLoggedIn]);

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
        console.error("Missing VITE_GOOGLE_CLIENT_ID in environment variables");
    }

    return (
        <GoogleOAuthProvider clientId={googleClientId || ""}>
            <BrowserRouter>
                {loading ? (
                    <SplashScreen />
                ) : (
                    <Routes>
                        <Route path="/" element={isLoggedIn ? <Navigate to="/main" replace /> : <PublicHome />} />

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
                        <Route path="/quiz/intro" element={<QuizIntro />} />
                        <Route path="/quiz/test" element={<QuizScreen />} />
                        <Route path="/quiz/result" element={<QuizResult />} />

                        <Route path="/write" element={<WriteFlow />} />
                        <Route path="/main" element={<MainTab />} />
                        <Route path="/profile/edit" element={<EditProfileScreen />} />
                    </Routes>
                )}
            </BrowserRouter>
        </GoogleOAuthProvider>
    );
}

const PublicHome = () => {
    const navigate = useNavigate();
    return <StartPage onStart={() => navigate('/onboarding/age-check')} />;
};

export default App;