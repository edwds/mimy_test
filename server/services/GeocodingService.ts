/**
 * Geocoding Service - MapTiler integration for reverse geocoding
 */

interface GeocodingResult {
    neighborhood: string;      // Full format: "KR:강남구" or "US:San Francisco"
    displayName: string;       // Display name: "강남구" or "San Francisco"
    countryCode: string;       // ISO country code: "KR", "US"
    raw?: any;                 // Raw API response for debugging
}

export class GeocodingService {
    private static apiKey = process.env.MAPTILER_API_KEY || process.env.VITE_MAPTILER_API_KEY;

    /**
     * Reverse geocode coordinates to get neighborhood/city
     */
    static async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
        if (!this.apiKey) {
            console.error('[GeocodingService] MAPTILER_API_KEY not configured');
            return null;
        }

        try {
            // MapTiler Geocoding API
            const url = `https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${this.apiKey}`;

            const response = await fetch(url);
            if (!response.ok) {
                console.error('[GeocodingService] API error:', response.status);
                return null;
            }

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                console.log('[GeocodingService] No results found');
                return null;
            }

            // Extract relevant location info
            const result = this.extractNeighborhood(data.features);

            if (result) {
                console.log(`[GeocodingService] Reverse geocoded (${lat}, ${lon}) -> ${result.neighborhood}`);
            }

            return result;
        } catch (error) {
            console.error('[GeocodingService] Error:', error);
            return null;
        }
    }

    /**
     * Extract neighborhood from MapTiler features
     * Priority: district > municipality > place
     */
    private static extractNeighborhood(features: any[]): GeocodingResult | null {
        // Find country code from the first feature's context
        let countryCode = '';
        let cityName = '';
        let districtName = '';

        for (const feature of features) {
            const placeType = feature.place_type?.[0] || feature.type;

            // Extract country code
            if (placeType === 'country' || feature.properties?.country_code) {
                countryCode = (feature.properties?.country_code || feature.text || '').toUpperCase().slice(0, 2);
            }

            // Look for district/ward level (Korean 구/동)
            if (placeType === 'district' || placeType === 'sublocality' || placeType === 'neighbourhood') {
                if (!districtName) {
                    districtName = feature.text || feature.place_name?.split(',')[0] || '';
                }
            }

            // Look for city/municipality level
            if (placeType === 'place' || placeType === 'municipality' || placeType === 'city') {
                if (!cityName) {
                    cityName = feature.text || feature.place_name?.split(',')[0] || '';
                }
            }

            // Also check context array for additional info
            if (feature.context) {
                for (const ctx of feature.context) {
                    const ctxType = ctx.id?.split('.')[0];

                    if (ctxType === 'country' && !countryCode) {
                        countryCode = (ctx.short_code || ctx.text || '').toUpperCase().slice(0, 2);
                    }

                    if ((ctxType === 'district' || ctxType === 'locality') && !districtName) {
                        districtName = ctx.text || '';
                    }

                    if ((ctxType === 'place' || ctxType === 'municipality') && !cityName) {
                        cityName = ctx.text || '';
                    }
                }
            }
        }

        // Determine display name based on country
        let displayName = '';

        if (countryCode === 'KR' || countryCode === 'JP') {
            // For Korea/Japan, prefer district level (구/군)
            displayName = districtName || cityName;
        } else {
            // For other countries, prefer city level
            displayName = cityName || districtName;
        }

        if (!displayName) {
            // Fallback: use the first feature's name
            displayName = features[0]?.text || features[0]?.place_name?.split(',')[0] || '';
        }

        if (!displayName) {
            return null;
        }

        // Clean up display name
        displayName = displayName.trim();

        return {
            neighborhood: countryCode ? `${countryCode}:${displayName}` : displayName,
            displayName,
            countryCode: countryCode || 'XX',
            raw: features[0],
        };
    }

    /**
     * Parse stored neighborhood string to get display name
     */
    static parseNeighborhood(neighborhood: string): { countryCode: string; displayName: string } {
        if (!neighborhood) {
            return { countryCode: '', displayName: '' };
        }

        const parts = neighborhood.split(':');
        if (parts.length === 2) {
            return {
                countryCode: parts[0],
                displayName: parts[1],
            };
        }

        return {
            countryCode: '',
            displayName: neighborhood,
        };
    }
}
