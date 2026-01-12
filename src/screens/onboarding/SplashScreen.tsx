import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const SplashScreen = () => {
    const navigate = useNavigate();
    const [ready, setReady] = useState(false);
    const startedRef = useRef(false);

    // 전체 길이(초) - 여기만 조절
    const D = 4;

    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        if (!ready) return;
        if (startedRef.current) return; // StrictMode(dev) 중복 방지
        startedRef.current = true;

        const t = window.setTimeout(() => {
            navigate('/start', { replace: true }); // 원하는 경로로 변경
        }, D * 1000);

        return () => window.clearTimeout(t);
    }, [ready, navigate]);

    if (!ready) return <div className="h-full bg-orange-500" />;

    return (
        <div className="h-full bg-orange-500 flex items-center justify-center">
            {/* 전체 페이드아웃 + 블러 (마지막 구간에서만) */}
            <motion.div
                className="flex flex-col items-center justify-center"
                style={{ willChange: 'opacity, filter' }}
                initial={{ opacity: 1, filter: 'blur(0px)' }}
                animate={{
                    opacity: [1, 1, 1, 0],
                    filter: ['blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(10px)'],
                }}
                transition={{ duration: D, ease: 'easeOut', times: [0, 0.72, 0.86, 1] }}
            >
                {/* SLOT 1: slogan과 mimy가 "같은 자리"를 공유 (절대 겹침, 움직임 없음) */}
                <div className="relative w-[320px] h-[92px] flex items-center justify-center">
                    {/* Make It My Yummy */}
                    <motion.p
                        className="absolute inset-0 flex items-center justify-center text-white text-center text-lg font-medium"
                        style={{ willChange: 'opacity, filter' }}
                        initial={{ opacity: 0, filter: 'blur(6px)' }}
                        animate={{
                            opacity: [0, 1, 1, 0, 0],
                            filter: ['blur(6px)', 'blur(0px)', 'blur(0px)', 'blur(8px)', 'blur(8px)'],
                        }}
                        transition={{ duration: D, ease: 'easeOut', times: [0, 0.18, 0.32, 0.40, 1] }}
                    >
                        Make It My Yummy
                    </motion.p>

                    {/* mimy (동일 자리) */}
                    <motion.h1
                        className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-white tracking-tight text-center leading-none -translate-y-3"
                        style={{ willChange: 'opacity, filter' }}
                        initial={{ opacity: 0, filter: 'blur(10px)' }}
                        animate={{
                            opacity: [0, 0, 1, 1],
                            filter: ['blur(10px)', 'blur(10px)', 'blur(0px)', 'blur(0px)'],
                        }}
                        transition={{ duration: D, ease: 'easeOut', times: [0, 0.30, 0.44, 1] }}
                    >
                        mimy
                    </motion.h1>
                </div>

                {/* SLOT 2: tagline 고정 위치 (아래 자리 고정) */}
                <div className="relative w-[320px] h-[32px] -mt-6 flex items-center justify-center">
                    <motion.p
                        className="absolute inset-0 flex items-center justify-center text-white/70 text-center text-lg font-medium"
                        style={{ willChange: 'opacity, filter' }}
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{
                            opacity: [0, 0, 1, 1],
                            filter: ['blur(4px)', 'blur(4px)', 'blur(0px)', 'blur(0px)'],
                        }}
                        transition={{ duration: D, ease: 'easeOut', times: [0, 0.48, 0.60, 1] }}
                    >
                        Rank what you ate
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
};