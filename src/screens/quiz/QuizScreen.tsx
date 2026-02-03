import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ThumbsUp, X, Minus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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
    const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    const handleSwipe = (direction: 'left' | 'right' | 'up') => {
        // Map swipe direction to answer value
        // left = -1 (싫어요), up = 0 (별생각없어요), right = +1 (좋아요)
        const val = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

        setExitDirection(direction);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));

        // Next Question
        setTimeout(() => {
            setExitDirection(null);
            if (currentIndex < QUESTIONS.length - 1) {
                setCurrentIndex(prev => prev + 1);
                x.set(0);
                y.set(0);
            } else {
                finishQuiz({ ...answers, [currentQuestion.id]: val });
            }
        }, 300);
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
            <div className="flex items-center justify-center h-full bg-background">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                    <p className="text-lg font-medium text-muted-foreground">Analyzing your taste profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Header / Progress */}
            <div className="px-6 pb-2">
                <div className="flex items-center justify-center mb-4">
                    <span className="font-bold text-muted-foreground">
                        {currentIndex + 1} / {QUESTIONS.length}
                    </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Swipe Instructions */}
            <div className="px-6 py-4 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <X className="w-5 h-5 text-red-500" />
                    <span>싫어요</span>
                </div>
                <div className="flex items-center gap-2">
                    <Minus className="w-5 h-5 text-gray-400" />
                    <span>별로</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-green-500" />
                    <span>좋아요</span>
                </div>
            </div>

            {/* Question Card */}
            <main className="flex-1 flex items-center justify-center p-6 relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        style={{
                            x: exitDirection ? (exitDirection === 'left' ? -300 : exitDirection === 'right' ? 300 : 0) : x,
                            y: exitDirection === 'up' ? -300 : y,
                            rotate,
                            opacity: exitDirection ? 0 : opacity,
                        }}
                        drag={!exitDirection}
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={1}
                        onDragEnd={handleDragEnd}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute w-full max-w-md bg-card border-2 border-border rounded-3xl shadow-2xl p-8 cursor-grab active:cursor-grabbing"
                    >
                        <h2 className="text-2xl font-bold leading-tight text-center">
                            {currentQuestion.text}
                        </h2>

                        {/* Visual feedback indicators */}
                        <motion.div
                            className="absolute top-8 right-8 bg-green-500 text-white rounded-full p-4 shadow-lg"
                            style={{
                                opacity: useTransform(x, [0, 100], [0, 1])
                            }}
                        >
                            <ThumbsUp className="w-8 h-8" />
                        </motion.div>

                        <motion.div
                            className="absolute top-8 left-8 bg-red-500 text-white rounded-full p-4 shadow-lg"
                            style={{
                                opacity: useTransform(x, [-100, 0], [1, 0])
                            }}
                        >
                            <X className="w-8 h-8" />
                        </motion.div>

                        <motion.div
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-400 text-white rounded-full p-4 shadow-lg"
                            style={{
                                opacity: useTransform(y, [-100, 0], [1, 0])
                            }}
                        >
                            <Minus className="w-8 h-8" />
                        </motion.div>
                    </motion.div>
                </AnimatePresence>

                {/* Helper text */}
                <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground px-6">
                    카드를 좌우 또는 위로 밀어보세요
                </div>
            </main>
        </div>
    );
};
