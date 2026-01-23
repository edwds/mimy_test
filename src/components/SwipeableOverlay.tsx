
import React, { useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Props {
    children: React.ReactNode;
    onBack?: () => void;
    className?: string;
}

export const SwipeableOverlay = ({ children, onBack, className }: Props) => {
    const navigate = useNavigate();
    const controls = useAnimation();

    const handleDragEnd = async (_: any, info: PanInfo) => {
        const x = info.offset.x;
        const velocity = info.velocity.x;

        // Trigger back if dragged more than 100px or flicked fast to the right
        if (x > 100 || velocity > 200) {
            // Animate off screen
            await controls.start({ x: '100%', transition: { duration: 0.2 } });

            if (onBack) {
                onBack();
            } else {
                navigate(-1);
            }
        } else {
            // Reset position
            controls.start({ x: 0 });
        }
    };

    useEffect(() => {
        controls.start({ x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } });
    }, [controls]);

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={controls}
            exit={{ x: '100%' }}
            // We use simple slide-in animation on mount. 
            // Note: Framer motion `animate` runs on mount. 
            // To mimic the CSS `animate-in` we saw: `slide-in-from-right`.
            // We'll set initial x: '100%' and animate to 0.

            drag="x"
            dragConstraints={{ left: 0 }} // Don't allow drag to left
            dragElastic={{ left: 0, right: 0.1 }}
            onDragEnd={handleDragEnd}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 100,
                background: 'var(--background)',
                boxShadow: '-4px 0 15px rgba(0,0,0,0.1)'
            }}
            className={className}
        >
            {/* Edge Hit Slop - invisible area to ensure edge grab is easy */}
            <div className="absolute left-0 top-0 bottom-0 w-6 z-[110]" />
            {children}
        </motion.div>
    );
};
