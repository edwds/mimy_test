import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { QUESTIONS } from '@/data/quiz';
import { useUser } from '@/context/UserContext';

export const QuizScreen = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

    const currentQuestion = QUESTIONS[currentIndex];
    const hasExistingProfile = !!user?.taste_result;

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);

    // Color overlays based on swipe direction
    const redOverlay = useTransform(x, [-200, 0], [1, 0]);
    const greenOverlay = useTransform(x, [0, 200], [0, 1]);
    const grayOverlay = useTransform(y, [-200, 0], [1, 0]);

    const handleClose = () => {
        navigate(-1);
    };

    const handleSwipe = (direction: 'left' | 'right' | 'up') => {
        if (exitDirection) return; // Prevent multiple swipes

        // Map swipe direction to answer value
        // left = -1 (싫어요), up = 0 (별생각없어요), right = +1 (좋아요)
        const val = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

        setExitDirection(direction);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));

        // Next Question - wait for card to fully exit
        setTimeout(() => {
            setExitDirection(null);
            x.set(0);
            y.set(0);

            if (currentIndex < QUESTIONS.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                finishQuiz({ ...answers, [currentQuestion.id]: val });
            }
        }, 500);
    };

    const handleDragEnd = (_: any, info: PanInfo) => {
        const xOffset = info.offset.x;
        const yOffset = info.offset.y;
        const xVelocity = info.velocity.x;
        const yVelocity = info.velocity.y;

        // Determine swipe direction based on offset and velocity
        if (Math.abs(yOffset) > 100 && Math.abs(yVelocity) > 300 && yOffset < 0) {
            // Up swipe
            handleSwipe('up');
        } else if (Math.abs(xOffset) > 150 || Math.abs(xVelocity) > 500) {
            if (xOffset > 0) {
                // Right swipe
                handleSwipe('right');
            } else {
                // Left swipe
                handleSwipe('left');
            }
        } else {
            // Reset position if not swiped far enough
            x.set(0);
            y.set(0);
        }
    };

    const finishQuiz = async (finalAnswers: Record<number, number>) => {
        setIsSubmitting(true);
        try {
            const userId = user?.id || localStorage.getItem("mimy_user_id");
            console.log('[QuizScreen] Submitting quiz with userId:', userId);

            if (!userId) {
                console.error('[QuizScreen] No userId found!');
                alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
                navigate('/start');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/quiz/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, answers: finalAnswers })
            });

            if (!response.ok) throw new Error("Quiz submission failed");

            const data = await response.json();
            // Expected data.result = { clusterId, clusterData, scores }

            navigate('/quiz/result', { state: { result: data.result } });

        } catch (error) {
            console.error(error);
            alert("Failed to submit quiz. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) {
        return (
            <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
                {/* Header */}
                <div className="px-6 pb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-muted-foreground">
                            분석 중...
                        </span>
                    </div>
                </div>

                {/* Loading Card */}
                <main className="flex-1 flex flex-col items-center justify-center px-6 relative">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative w-full max-w-md border border-border rounded-3xl shadow-2xl overflow-hidden"
                        style={{
                            height: 'min(calc(200vw * 4/3), 500px)',
                            background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)'
                        }}
                    >
                        <div className="p-10 flex flex-col items-center justify-center h-full space-y-6">
                            <Loader2 className="w-16 h-16 animate-spin text-primary" />
                            <div className="text-center space-y-2">
                                <p className="text-2xl font-bold">당신의 미식 성향을 분석하고 있어요</p>
                                <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Header with counter and close button */}
            <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-muted-foreground">
                        {currentIndex + 1} / {QUESTIONS.length}
                    </span>
                    {hasExistingProfile && (
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Stacked Cards Container */}
            <main className="flex-1 flex flex-col items-center justify-center -mt-16 px-6 relative overflow-visible">

                {/* Helper text */}
                <div className="mb-12 text-center text-sm text-muted-foreground">
                    위 문장에 동의하면 오른쪽으로<br></br>아니라면 왼쪽으로 밀어주세요
                </div>


                {/* Card Stack - cards stacked vertically with scale */}
                <div className="relative w-full max-w-md" style={{ height: 'min(calc(200vw * 4/3), 500px)', perspective: '1000px' }}>
                    {/* All cards rendered with smooth transitions */}
                    {/* Card 3번째 (맨 뒤) */}
                    {currentIndex + 2 < QUESTIONS.length && (
                        <motion.div
                            key={`card-${QUESTIONS[currentIndex + 2].id}`}
                            className="absolute border border-border rounded-3xl shadow-lg overflow-hidden"
                            initial={{
                                scale: 0.82,
                                y: -36,
                                opacity: 0
                            }}
                            animate={{
                                scale: 0.88,
                                y: -24,
                                opacity: 1,
                                zIndex: 1
                            }}
                            exit={{
                                scale: 0.94,
                                y: -12,
                                opacity: 1
                            }}
                            transition={{
                                duration: 0.3,
                                ease: "easeOut"
                            }}
                            style={{
                                width: '100%',
                                height: '100%',
                                left: 0,
                                top: 0,
                                transformOrigin: 'top center',
                                background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)'
                            }}
                        >
                            <div className="p-10 flex items-center h-full">
                                <div className="text-3xl font-bold leading-tight text-left w-full">
                                    {QUESTIONS[currentIndex + 2]?.text}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Card 2번째 (중간) */}
                    {currentIndex + 1 < QUESTIONS.length && (
                        <motion.div
                            key={`card-${QUESTIONS[currentIndex + 1].id}`}
                            className="absolute border border-border rounded-3xl shadow-xl overflow-hidden"
                            initial={{
                                scale: 0.88,
                                y: -24,
                                opacity: 1
                            }}
                            animate={{
                                scale: 0.94,
                                y: -12,
                                opacity: 1,
                                zIndex: 2
                            }}
                            exit={{
                                scale: 1,
                                y: 0,
                                opacity: 1
                            }}
                            transition={{
                                duration: 0.3,
                                ease: "easeOut"
                            }}
                            style={{
                                width: '100%',
                                height: '100%',
                                left: 0,
                                top: 0,
                                transformOrigin: 'top center',
                                background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)'
                            }}
                        >
                            <div className="p-10 flex items-center h-full">
                                <div className="text-3xl font-bold leading-tight text-left w-full">
                                    {QUESTIONS[currentIndex + 1]?.text}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Active Card (맨 앞) */}
                    <motion.div
                        key={`card-${QUESTIONS[currentIndex].id}`}
                        className="absolute border border-border rounded-3xl shadow-2xl"
                        style={{
                            width: '100%',
                            height: '100%',
                            left: 0,
                            top: 0,
                            transformOrigin: 'top center',
                            x,
                            y,
                            rotate,
                            background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
                            overflow: 'hidden'
                        }}
                        animate={{
                            scale: 1,
                            y: exitDirection === 'up' ? -500 : 0,
                            x: exitDirection === 'left' ? -500 : exitDirection === 'right' ? 500 : 0,
                            rotate: exitDirection === 'left' ? -30 : exitDirection === 'right' ? 30 : 0,
                            opacity: exitDirection ? 0 : 1,
                            zIndex: 3
                        }}
                        exit={{
                            opacity: 0,
                            scale: 1.05
                        }}
                        transition={{
                            duration: 0.3,
                            ease: "easeOut"
                        }}
                        drag={!exitDirection}
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={1}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Color overlays for swipe feedback */}
                        <motion.div
                            className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12"
                            style={{
                                opacity: greenOverlay,
                                background: 'linear-gradient(135deg, #E0F7F7 0%, #E8F8F5 100%)'
                            }}
                        >
                            <div className="px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                                <span className="text-gray-800 text-sm font-semibold">
                                    그런 편이다
                                </span>
                            </div>
                        </motion.div>
                        <motion.div
                            className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12"
                            style={{
                                opacity: redOverlay,
                                background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4F3 100%)'
                            }}
                        >
                            <div className="px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                                <span className="text-gray-800 text-sm font-semibold">
                                    아닌 편이다
                                </span>
                            </div>
                        </motion.div>
                        <motion.div
                            className="absolute inset-0 bg-gray-400/70 pointer-events-none flex items-end justify-center pb-12"
                            style={{ opacity: grayOverlay }}
                        >
                            <div className="px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                                <span className="text-gray-800 text-sm font-semibold">
                                    고를 수 없음
                                </span>
                            </div>
                        </motion.div>

                        <div className="p-10 cursor-grab active:cursor-grabbing flex items-center h-full relative">
                            <h2 className="text-3xl font-bold leading-tight text-left w-full">
                                {currentQuestion.text}
                            </h2>
                        </div>
                    </motion.div>
                </div>

                {/* "고를 수 없음" 버튼 */}
                <button
                    onClick={() => handleSwipe('up')}
                    disabled={!!exitDirection}
                    className="mt-6 px-6 py-3 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-full shadow-sm border border-gray-200 transition-all active:scale-95 font-medium"
                >
                    고를 수 없음
                </button>

            </main>
        </div>
    );
};
