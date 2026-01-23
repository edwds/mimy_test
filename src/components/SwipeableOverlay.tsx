
import React, { useEffect } from 'react';
import { motion, useAnimation, PanInfo, useDragControls } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Props {
    children: React.ReactNode;
    onBack?: () => void;
    className?: string;
}

export const SwipeableOverlay = ({ children, onBack, className }: Props) => {
    const navigate = useNavigate();
    const controls = useAnimation();
    const dragControls = useDragControls();

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
            drag="x"
            dragControls={dragControls}
            dragListener={false} // Disable auto drag from anywhere
            dragConstraints={{ left: 0 }}
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
            {/* Edge Hit Slop - only this area initiates drag */}
            <div
                className="absolute left-0 top-0 bottom-0 w-8 z-[110] cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={(e) => dragControls.start(e)}
            />
            {children}
        </motion.div>
    );
};
