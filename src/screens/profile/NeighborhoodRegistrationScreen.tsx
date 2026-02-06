import { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, MapPin, Navigation, Check, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { authFetch } from '@/lib/authFetch';
import { useTranslation } from 'react-i18next';

interface AffiliationStatus {
    neighborhood: {
        id: number;
        localName: string;
        englishName: string | null;
        countryCode: string;
        value: string;
        joined_at: string;
        can_change: boolean;
    } | null;
}

interface GeocodingResult {
    neighborhood: string;
    displayName: string;
    englishName: string | null;
}

export const NeighborhoodRegistrationScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refreshUser } = useUser();

    const [status, setStatus] = useState<AffiliationStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [error, setError] = useState('');
    const [detected, setDetected] = useState<GeocodingResult | null>(null);
    const [success, setSuccess] = useState(false);

    // Fetch current status on mount
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/affiliation/status`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (err) {
            console.error('Failed to fetch affiliation status:', err);
        }
    };

    const handleGetLocation = async () => {
        setDetecting(true);
        setError('');
        setDetected(null);

        try {
            // Get current position
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            });

            const { latitude: lat, longitude: lon } = position.coords;

            // Call MapTiler Geocoding API from frontend (using existing key)
            const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

            // 1. Get local language result (default)
            const geocodeUrl = `https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${apiKey}`;
            const geoRes = await fetch(geocodeUrl);
            if (!geoRes.ok) {
                throw new Error('Geocoding failed');
            }
            const geoData = await geoRes.json();
            const localResult = extractNeighborhood(geoData.features);

            if (!localResult) {
                setError(t('profile.neighborhood.error.geocoding_failed', '주소를 변환할 수 없습니다.'));
                return;
            }

            // 2. Get English result for translation
            let englishName: string | null = null;
            try {
                const geocodeUrlEn = `https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${apiKey}&language=en`;
                const geoResEn = await fetch(geocodeUrlEn);
                if (geoResEn.ok) {
                    const geoDataEn = await geoResEn.json();
                    const enResult = extractNeighborhood(geoDataEn.features);
                    if (enResult) {
                        englishName = enResult.displayName;
                    }
                }
            } catch (err) {
                console.warn('Failed to get English translation:', err);
                // Continue without English name
            }

            setDetected({
                ...localResult,
                englishName,
            });
        } catch (err: any) {
            if (err.code === 1) {
                setError(t('profile.neighborhood.error.location_denied', '위치 정보 접근이 거부되었습니다.'));
            } else if (err.code === 2) {
                setError(t('profile.neighborhood.error.location_unavailable', '위치 정보를 사용할 수 없습니다.'));
            } else if (err.code === 3) {
                setError(t('profile.neighborhood.error.location_timeout', '위치 정보 요청 시간이 초과되었습니다.'));
            } else {
                setError(t('profile.neighborhood.error.location_failed', '위치를 가져올 수 없습니다.'));
            }
        } finally {
            setDetecting(false);
        }
    };

    const extractNeighborhood = (features: any[]): GeocodingResult | null => {
        if (!features || features.length === 0) return null;

        let countryCode = '';
        let provinceName = ''; // 도/특별시/광역시 level
        let cityName = '';     // 시/군 level
        let districtName = ''; // 구 level

        // POI patterns to skip
        const poiPatterns = /테크노밸리|산업단지|공단|타워|빌딩|몰|센터|Tower|Building|Mall|Center|Station|역$/i;

        // Korean metropolitan cities (특별시/광역시)
        const metropolitanCities = ['서울', '서울특별시', '부산', '부산광역시', '대구', '대구광역시',
            '인천', '인천광역시', '광주', '광주광역시', '대전', '대전광역시',
            '울산', '울산광역시', '세종', '세종특별자치시'];

        // Extract administrative info from text (province, city, district)
        const extractFromText = (text: string) => {
            if (!text || text.match(poiPatterns)) return;

            // === Korean administrative units ===
            // Province level (도/특별시/광역시)
            if (text.match(/도$|특별시$|광역시$|특별자치시$|특별자치도$/)) {
                if (!provinceName) provinceName = text;
            }

            // City level (시/군)
            if (text.match(/시$|군$/)) {
                // Check if it's a metropolitan city (광역시급)
                if (metropolitanCities.some(m => text.includes(m))) {
                    if (!provinceName) provinceName = text;
                } else {
                    if (!cityName) cityName = text;
                }
            }

            // District level (구) - Korean
            if (text.match(/구$/)) {
                if (!districtName) districtName = text;
            }

            // === Japanese administrative units ===
            // Prefecture level (都/道/府/県)
            if (text.match(/都$|道$|府$|県$/)) {
                if (!provinceName) provinceName = text;
            }

            // City level (市/町/村)
            if (text.match(/市$|町$|村$/)) {
                if (!cityName) cityName = text;
            }

            // District level (区) - Japanese
            if (text.match(/区$/)) {
                if (!districtName) districtName = text;
            }
        };

        for (const feature of features) {
            const text = feature.text || '';

            // Extract country code from properties (NOT from text like "대한민국")
            if (feature.properties?.country_code) {
                countryCode = feature.properties.country_code.toUpperCase().slice(0, 2);
            }

            extractFromText(text);

            // Also check place_name for additional info
            if (feature.place_name) {
                const parts = feature.place_name.split(',').map((p: string) => p.trim());
                for (const part of parts) {
                    extractFromText(part);
                }
            }

            // Check context for additional administrative info
            if (feature.context) {
                for (const ctx of feature.context) {
                    const ctxText = ctx.text || '';

                    // Extract country code from context short_code
                    if (ctx.id?.startsWith('country') && ctx.short_code) {
                        countryCode = ctx.short_code.toUpperCase().slice(0, 2);
                    }

                    extractFromText(ctxText);
                }
            }
        }

        let displayName = '';

        // Fallback: If Korean/Japanese administrative units detected but no country code
        if (!countryCode && (provinceName || cityName || districtName)) {
            const hasKoreanAdminUnit = [provinceName, cityName, districtName].some(name =>
                name && /도$|특별시$|광역시$|특별자치시$|특별자치도$|시$|군$/.test(name)
            );
            const hasJapaneseAdminUnit = [provinceName, cityName, districtName].some(name =>
                name && /都$|道$|府$|県$|市$|町$|村$/.test(name)
            );

            if (hasKoreanAdminUnit) {
                countryCode = 'KR';
            } else if (hasJapaneseAdminUnit) {
                countryCode = 'JP';
            }
        }

        if (countryCode === 'KR') {
            // Korean address logic:
            // 1. 특별시/광역시 + 구 (e.g. 서울특별시 강남구)
            // 2. 도 + 시/군 (e.g. 경기도 성남시)

            const isMetropolitan = provinceName && metropolitanCities.some(m => provinceName.includes(m));

            if (isMetropolitan && districtName) {
                // 특별시/광역시: 시 + 구
                displayName = `${provinceName} ${districtName}`;
            } else if (provinceName && cityName) {
                // 도: 도 + 시/군
                displayName = `${provinceName} ${cityName}`;
            } else if (provinceName && districtName) {
                // Fallback: 시 + 구
                displayName = `${provinceName} ${districtName}`;
            } else {
                // Last resort: use whatever we have
                displayName = districtName || cityName || provinceName || '';
            }
        } else if (countryCode === 'JP') {
            // Japanese address logic:
            // 1. 都 (Tokyo) + 区 (e.g. 東京都 渋谷区)
            // 2. 府/県 + 市 (e.g. 大阪府 大阪市, 神奈川県 横浜市)
            const isTokyoOrHokkaido = provinceName && (provinceName.endsWith('都') || provinceName.endsWith('道'));

            if (isTokyoOrHokkaido && districtName) {
                // Tokyo: 都 + 区
                displayName = `${provinceName} ${districtName}`;
            } else if (provinceName && cityName) {
                // Other prefectures: 府/県 + 市
                displayName = `${provinceName} ${cityName}`;
            } else if (provinceName && districtName) {
                // Fallback: 府/県 + 区
                displayName = `${provinceName} ${districtName}`;
            } else {
                // Last resort
                displayName = districtName || cityName || provinceName || '';
            }
        } else {
            // For other countries: use city
            displayName = cityName || districtName || provinceName;
        }

        // Fallback: use first non-POI feature
        if (!displayName) {
            for (const feature of features) {
                const text = feature.text || feature.place_name?.split(',')[0] || '';
                if (text && !text.match(poiPatterns)) {
                    displayName = text;
                    break;
                }
            }
        }

        if (!displayName) return null;

        displayName = displayName.trim();

        return {
            neighborhood: countryCode ? `${countryCode}:${displayName}` : displayName,
            displayName,
            englishName: null, // Will be populated by separate API call
        };
    };

    const handleConfirm = async () => {
        if (!detected) return;

        setLoading(true);
        setError('');

        try {
            const res = await authFetch(`${API_BASE_URL}/api/affiliation/neighborhood`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    neighborhood: detected.neighborhood,
                    englishName: detected.englishName,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                await refreshUser();
            } else {
                setError(data.message || t('profile.neighborhood.error.save_failed', '동네 등록에 실패했습니다.'));
            }
        } catch (err) {
            setError(t('profile.neighborhood.error.network', '네트워크 오류가 발생했습니다.'));
        } finally {
            setLoading(false);
        }
    };

    const handleClearNeighborhood = async () => {
        if (!confirm(t('profile.neighborhood.clear_confirm', '동네 등록을 해제하시겠습니까?'))) return;

        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE_URL}/api/affiliation/neighborhood`, {
                method: 'DELETE',
            });

            if (res.ok) {
                await refreshUser();
                await fetchStatus();
                setDetected(null);
            } else {
                const data = await res.json();
                setError(data.message || '동네 해제에 실패했습니다.');
            }
        } catch (err) {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header
                className="px-4 py-3 flex items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10"
                style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 0.75rem)' : undefined }}
            >
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">{t('profile.settings.neighborhood', '동네 등록')}</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-5" data-scroll-container="true">
                {/* Success State */}
                {success ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{t('profile.neighborhood.success_title', '등록 완료!')}</h2>
                            <p className="text-muted-foreground">
                                {t('profile.neighborhood.success_desc', '{{neighborhood}}에 등록되었습니다.', { neighborhood: detected?.displayName })}
                            </p>
                        </div>
                        <Button className="w-full max-w-xs h-12" onClick={() => navigate(-1)}>
                            {t('common.done', '완료')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Current Status */}
                        {status?.neighborhood && (
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <MapPin className="w-6 h-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('profile.neighborhood.current', '현재 동네')}</p>
                                        <p className="font-bold text-lg">{status.neighborhood.localName}</p>
                                        {status.neighborhood.englishName && (
                                            <p className="text-sm text-muted-foreground">{status.neighborhood.englishName}</p>
                                        )}
                                    </div>
                                </div>
                                {status.neighborhood.can_change ? (
                                    <Button variant="outline" size="sm" onClick={handleClearNeighborhood} disabled={loading}>
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('profile.neighborhood.clear', '동네 해제')}
                                    </Button>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {t('profile.neighborhood.cooldown_warning', '동네 변경은 30일마다 가능합니다')}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Instructions */}
                        <div>
                            <h2 className="text-xl font-bold mb-2">
                                {status?.neighborhood
                                    ? t('profile.neighborhood.change_title', '동네 변경')
                                    : t('profile.neighborhood.title', '동네 등록')}
                            </h2>
                            <p className="text-muted-foreground">
                                {t('profile.neighborhood.desc', '현재 위치를 기반으로 동네를 등록합니다. 같은 동네에 사는 사람들의 랭킹을 볼 수 있습니다.')}
                            </p>
                        </div>

                        {/* Get Location Button */}
                        {!detected && (
                            <Button
                                variant="outline"
                                className="w-full h-14 text-lg"
                                onClick={handleGetLocation}
                                disabled={detecting}
                            >
                                {detecting ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" />
                                        {t('profile.neighborhood.detecting', '위치 확인 중...')}
                                    </>
                                ) : (
                                    <>
                                        <Navigation className="mr-2" />
                                        {t('profile.neighborhood.get_location', '현재 위치로 등록')}
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 p-4 bg-red-50 text-red-600 rounded-lg">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Detected Location */}
                        {detected && (
                            <div className="space-y-4">
                                <div className="p-6 bg-muted/50 rounded-xl text-center">
                                    <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground mb-1">{t('profile.neighborhood.detected', '감지된 위치')}</p>
                                    <p className="text-2xl font-bold">{detected.displayName}</p>
                                </div>

                                <p className="text-sm text-center text-muted-foreground">
                                    {t('profile.neighborhood.confirm_question', '이 동네로 등록하시겠습니까?')}
                                </p>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-12"
                                        onClick={() => setDetected(null)}
                                    >
                                        {t('common.cancel', '취소')}
                                    </Button>
                                    <Button
                                        className="flex-1 h-12"
                                        onClick={handleConfirm}
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : t('common.confirm', '확인')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
