import React from 'react';
import { ShopCard } from '../ShopCard';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    shop: any;
    onClose: () => void;
    onSave?: (id: number) => void;
    onReserve?: (id: number) => void;
}

export const SelectedShopCard: React.FC<Props> = ({ shop, onClose, onSave, onReserve }) => {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-6 left-4 right-4 z-40"
        // Ensure padding for safe area if needed, though 'bottom-6' usually covers it. 
        // We adding marginBottom safe area manually if needed.
        >
            <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Close Button - absolute top right */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-2 right-2 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                    <X size={16} />
                </button>

                {/* Reuse ShopCard but maybe customize styles? 
                    ShopCard has padding and margins. We might want to remove 'mb-4' from it or wrap it tight.
                    ShopCard usually has 'mb-4'. 
                */}
                <div className="-mb-4"> {/* Cancel out ShopCard margin if present */}
                    <ShopCard
                        shop={shop}
                        onSave={onSave}
                        onReserve={onReserve}
                    // We might want to trigger 'view detail' on click? ShopCard handles it via onClick prop or default navigate
                    />
                </div>
            </div>
        </motion.div>
    );
};
