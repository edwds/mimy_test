
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelectTypeStep } from './SelectTypeStep';
import { SearchShopStep } from './SearchShopStep';
import { BasicInfoStep } from './BasicInfoStep';
import { WriteContentStep } from './WriteContentStep';
import { RankingStep } from './RankingStep';
import { ContentService } from '@/services/ContentService';

export const WriteFlow = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get('type') as 'review' | 'post' | null;

    const [step, setStep] = useState<'TYPE_SELECT' | 'SEARCH_SHOP' | 'BASIC_INFO' | 'WRITE_CONTENT' | 'RANKING'>(() => {
        if (initialType === 'review') return 'SEARCH_SHOP';
        if (initialType === 'post') return 'WRITE_CONTENT';
        return 'TYPE_SELECT';
    });

    // Data Accumulation
    const [type, setType] = useState<'review' | 'post'>(initialType || 'review');
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [basicInfo, setBasicInfo] = useState<{ satisfaction: string; visitDate: string; companions: any[] } | null>(null);

    // TODO: Get real user ID from context/storage
    const currentUserId = 1;

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

    const handleContentNext = async (contentData: { text: string; images: string[] }) => {
        try {
            // Prepare payload
            const payload = {
                user_id: currentUserId,
                type,
                text: contentData.text,
                img: contentData.images, // Note: In real app, these should be uploaded URLs
                video: [],
                review_prop: type === 'review' ? {
                    shop_id: selectedShop.id,
                    visit_date: basicInfo?.visitDate,
                    companions: basicInfo?.companions,
                    satisfaction: basicInfo?.satisfaction
                } : undefined,
                keyword: [] // extract hashtags if needed
            };

            await ContentService.create(payload);

            // If review, update ranking (mock or real)
            if (type === 'review') {
                // Submit a default rank for MVP
                await ContentService.submitRanking({
                    user_id: currentUserId,
                    shop_id: selectedShop.id,
                    sort_key: 1 // Default rank 1 (Best)
                });
                setStep('RANKING');
            } else {
                navigate('/main');
            }
        } catch (error) {
            console.error(error);
            alert('저장에 실패했습니다.');
        }
    };

    return (
        <div className="h-screen bg-[var(--color-background)]">
            {step === 'TYPE_SELECT' && <SelectTypeStep onSelect={handleTypeSelect} />}

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
                    onBack={() => setStep('SEARCH_SHOP')}
                />
            )}

            <WriteContentStep
                mode={type}
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

            {step === 'RANKING' && selectedShop && (
                <RankingStep
                    shopName={selectedShop.name}
                    onFinish={() => navigate('/main')}
                />
            )}
        </div>
    );
};
