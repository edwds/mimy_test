import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SearchShopStep } from './SearchShopStep';
import { BasicInfoStep } from './BasicInfoStep';
import { WriteContentStep } from './WriteContentStep';
import { RankingStep } from './RankingStep';
import { ContentService } from '@/services/ContentService';
import { ShopService } from '@/services/ShopService';

export const WriteFlow = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initialShopId = searchParams.get('shop_id');

    // Data Accumulation
    const [type, setType] = useState<'review' | 'post'>('review'); // Default to review
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [basicInfo, setBasicInfo] = useState<{ satisfaction: string; visitDate: string; companions: any[] } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Step Logic
    const [step, setStep] = useState<'SEARCH_SHOP' | 'BASIC_INFO' | 'RANKING' | 'OPTIONS' | 'WRITE_CONTENT' | 'LOADING'>(() => {
        if (initialShopId) return 'LOADING'; // Wait for fetch
        return 'SEARCH_SHOP';
    });

    // Get real user ID
    const currentUserId = Number(localStorage.getItem("mimy_user_id") || 0);

    // Fetch Shop if shop_id is present
    useEffect(() => {
        if (initialShopId) {
            const fetchShop = async () => {
                try {
                    const shopData = await ShopService.getById(Number(initialShopId));
                    setSelectedShop(shopData);
                    setStep('BASIC_INFO');
                } catch (error) {
                    console.error("Failed to fetch shop:", error);
                    alert("매장 정보를 불러올 수 없습니다.");
                    navigate(-1);
                }
            };
            fetchShop();
        }
    }, [initialShopId, navigate]);

    // Handlers
    const handleShopSelect = (shop: any) => {
        setSelectedShop(shop);
        setStep('BASIC_INFO');
    };

    const handleBasicInfoNext = (info: any) => {
        setBasicInfo(info);
        setStep('RANKING');
    };



    const handleSubmitContent = async (contentData: { text: string; images: string[]; imgText?: string[]; companions?: number[]; keywords?: string[]; visitDate?: string; links?: { title: string; url: string }[] }) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!currentUserId) {
                alert("Login required");
                navigate('/login');
                return;
            }

            // Prepare payload
            const payload = {
                user_id: currentUserId,
                type,
                text: contentData.text,
                img: contentData.images,
                video: [],
                review_prop: {
                    shop_id: selectedShop.id,
                    visit_date: contentData.visitDate || basicInfo?.visitDate || new Date().toISOString().split('T')[0],
                    companions: contentData.companions || [],
                    satisfaction: basicInfo?.satisfaction
                },
                keyword: contentData.keywords || [],
                link_json: contentData.links || [],
                img_text: contentData.imgText || []
            };

            await ContentService.create(payload);
            navigate('/main');
        } catch (error) {
            console.error(error);
            alert(t('discovery.alerts.save_failed'));
            setIsSubmitting(false);
        }
    };

    // Helper for "Evaluate Another"
    const handleEvaluateAnother = () => {
        // Reset states but keep user? 
        setSelectedShop(null);
        setBasicInfo(null);
        setType('review');
        setStep('SEARCH_SHOP');
        // Clear query param if any
        navigate('/write', { replace: true });
    };

    // Helper for "Complete" (Submit empty review if needed - ACTUALLY ranking is already saved. 
    // Do we need to create a content entry for the ranking to appear in feed? 
    // Yes, usually. The user wants "Evaluation" which implies a record.
    // If they click "Complete" or "Evaluate Another", we should probably save a minimal content entry.
    // Or does Ranking suffice? 
    // "ContentCard" is based on content. Ranking alone appears in profile but maybe not feed.
    // Let's assume we need to create a default content entry if they skip writing.


    if (step === 'LOADING') {
        return <div className="h-full bg-background flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="relative h-full bg-background">
            {step === 'SEARCH_SHOP' && (
                <SearchShopStep
                    onSelect={handleShopSelect}
                    onBack={() => navigate('/main')}
                />
            )}

            {step === 'BASIC_INFO' && selectedShop && (
                <BasicInfoStep
                    shopName={selectedShop.name}
                    onNext={handleBasicInfoNext}
                    onBack={() => {
                        if (initialShopId) {
                            navigate(-1);
                        } else {
                            setStep('SEARCH_SHOP');
                        }
                    }}
                />
            )}

            {step === 'RANKING' && selectedShop && basicInfo && (
                <RankingStep
                    userId={currentUserId}
                    currentShop={selectedShop}
                    satisfaction={basicInfo.satisfaction}
                    onWriteReview={() => {
                        // Logic: User wants to write details.
                        // We do NOT save default content yet, we let WriteContentStep do it.
                        setStep('WRITE_CONTENT');
                    }}
                    onEvaluateAnother={async () => {
                        // Ranking is already saved in RankingStep.
                        // We just reset to start over.
                        handleEvaluateAnother();
                    }}
                    onComplete={async () => {
                        // Ranking is already saved in RankingStep.
                        // We just exit to main.
                        navigate('/main');
                    }}
                />
            )}

            {step === 'WRITE_CONTENT' && (
                <WriteContentStep
                    mode={type}
                    shop={selectedShop}
                    satisfaction={basicInfo?.satisfaction}
                    onNext={handleSubmitContent}
                    isSubmitting={isSubmitting}
                    onBack={() => setStep('RANKING')} // Or go back to option selection? Ranking is done.
                />
            )}
        </div>
    );
};
