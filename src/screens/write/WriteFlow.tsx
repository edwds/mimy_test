import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SelectTypeStep } from './SelectTypeStep';
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
    const initialType = searchParams.get('type') as 'review' | 'post' | null;
    const initialShopId = searchParams.get('shop_id');

    // Data Accumulation
    const [type, setType] = useState<'review' | 'post'>(initialType || 'review');
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [basicInfo, setBasicInfo] = useState<{ satisfaction: string; visitDate: string; companions: any[] } | null>(null);

    // Initial Step Logic
    const [step, setStep] = useState<'TYPE_SELECT' | 'SEARCH_SHOP' | 'BASIC_INFO' | 'WRITE_CONTENT' | 'RANKING' | 'LOADING'>(() => {
        if (initialShopId) return 'LOADING'; // Wait for fetch
        if (initialType === 'review') return 'SEARCH_SHOP';
        if (initialType === 'post') return 'WRITE_CONTENT';
        return 'TYPE_SELECT';
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

    const handleTypeSelect = (selectedType: 'review' | 'post') => {
        setType(selectedType);
        if (selectedType === 'review') {
            setStep('SEARCH_SHOP');
        } else {
            setStep('WRITE_CONTENT');
        }
    };

    const handleShopSelect = (shop: any) => {
        setSelectedShop(shop);
        setStep('BASIC_INFO');
    };

    const handleBasicInfoNext = (info: any) => {
        setBasicInfo(info);
        setStep('WRITE_CONTENT');
    };

    const handleContentNext = async (contentData: { text: string; images: string[]; companions?: number[]; keywords?: string[]; visitDate?: string; links?: { title: string; url: string }[] }) => {
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
                img: contentData.images, // Note: In real app, these should be uploaded URLs
                video: [],
                review_prop: type === 'review' ? {
                    shop_id: selectedShop.id,
                    visit_date: contentData.visitDate || basicInfo?.visitDate || new Date().toISOString().split('T')[0], // Priority: Content Step -> Basic -> Today
                    companions: contentData.companions || [], // Use from content step
                    satisfaction: basicInfo?.satisfaction
                } : undefined,
                keyword: contentData.keywords || [],
                link_json: contentData.links || []
            };

            await ContentService.create(payload);

            // If review, update ranking (mock or real)
            if (type === 'review') {
                // Submit a default rank for MVP
                // Removed automatic submitRanking. RankingStep handles it.
                // await ContentService.submitRanking({...});
                setStep('RANKING');
            } else {
                navigate('/main');
            }
        } catch (error) {
            console.error(error);
            alert(t('discovery.alerts.save_failed'));
        }
    };

    if (step === 'LOADING') {
        return <div className="h-full bg-background flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="relative h-full bg-background">
            <SelectTypeStep
                isOpen={step === 'TYPE_SELECT'}
                onClose={() => navigate('/main')}
                onSelect={handleTypeSelect}
            />

            {step === 'SEARCH_SHOP' && (
                <SearchShopStep
                    onSelect={handleShopSelect}
                    onBack={() => setStep('TYPE_SELECT')}
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

            {step === 'WRITE_CONTENT' && (
                <WriteContentStep
                    mode={type}
                    shop={selectedShop}
                    satisfaction={basicInfo?.satisfaction}
                    onNext={handleContentNext}
                    onBack={() => {
                        if (type === 'review') {
                            setStep('BASIC_INFO');
                        } else {
                            // If it's a post, we go back to main tab, effectively cancelling
                            navigate('/main');
                        }
                    }}
                />
            )}

            {step === 'RANKING' && selectedShop && basicInfo && (
                <RankingStep
                    userId={currentUserId}
                    currentShop={selectedShop}
                    satisfaction={basicInfo.satisfaction}
                    onFinish={() => navigate('/main')}
                />
            )}
        </div>
    );
};
