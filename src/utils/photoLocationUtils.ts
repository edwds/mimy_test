import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Dialog } from '@capacitor/dialog';
import PhotoLibrary from '@/plugins/PhotoLibrary';

export interface PhotoWithLocation {
    identifier: string;
    uri: string;
    latitude: number;
    longitude: number;
    distance: number; // meters
    dateTaken?: Date;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Request photo library permission
 * Should be called early in the app lifecycle
 */
export async function requestPhotoLibraryPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    try {
        console.log('[PhotoLocation] Requesting photo library permission');

        // Show explanation before requesting permission
        const { value } = await Dialog.confirm({
            title: '사진 라이브러리 접근',
            message: 'Mimy는 맛집 위치에서 촬영한 사진을 자동으로 찾아 리뷰 작성을 도와드립니다.\n\n권한 팝업에서 "모든 사진 허용"을 선택하시면 더 정확한 사진 추천을 받을 수 있습니다.',
            okButtonTitle: '확인',
            cancelButtonTitle: '건너뛰기',
        });

        if (!value) {
            console.log('[PhotoLocation] User skipped permission request');
            return false;
        }

        // Use Camera plugin to request photo library permission
        // This triggers the iOS permission popup reliably
        const permissionStatus = await Camera.checkPermissions();
        console.log('[PhotoLocation] Current permission status:', permissionStatus);

        if (permissionStatus.photos === 'prompt' || permissionStatus.photos === 'prompt-with-rationale') {
            console.log('[PhotoLocation] Requesting photos permission via Camera plugin');
            const result = await Camera.requestPermissions({ permissions: ['photos'] });
            console.log('[PhotoLocation] Permission request result:', result);

            const granted = result.photos === 'granted' || result.photos === 'limited';
            console.log('[PhotoLocation] Permission granted:', granted);
            return granted;
        } else if (permissionStatus.photos === 'granted' || permissionStatus.photos === 'limited') {
            console.log('[PhotoLocation] Permission already granted');
            return true;
        } else {
            console.log('[PhotoLocation] Permission denied');
            return false;
        }
    } catch (error: any) {
        console.error('[PhotoLocation] Permission request failed:', error);
        return false;
    }
}

/**
 * Check if photo library permission is already granted
 */
export async function checkPhotoLibraryPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    try {
        const permissionStatus = await Camera.checkPermissions();
        return permissionStatus.photos === 'granted' || permissionStatus.photos === 'limited';
    } catch (error: any) {
        return false;
    }
}

/**
 * Request media permission for internal use
 */
async function requestMediaPermission(): Promise<boolean> {
    try {
        console.log('[PhotoLocation] 🔐 Checking permission status...');
        const permissionStatus = await Camera.checkPermissions();
        console.log('[PhotoLocation] Current permission status:', permissionStatus.photos);

        if (permissionStatus.photos === 'granted' || permissionStatus.photos === 'limited') {
            console.log('[PhotoLocation] ✅ Permission already granted:', permissionStatus.photos);
            return true;
        }

        if (permissionStatus.photos === 'prompt' || permissionStatus.photos === 'prompt-with-rationale') {
            console.log('[PhotoLocation] 📱 Requesting permission from user...');
            const result = await Camera.requestPermissions({ permissions: ['photos'] });
            console.log('[PhotoLocation] Permission request result:', result.photos);

            const granted = result.photos === 'granted' || result.photos === 'limited';
            if (granted) {
                console.log('[PhotoLocation] ✅ Permission granted');
            } else {
                console.log('[PhotoLocation] ❌ Permission denied by user');
            }
            return granted;
        }

        console.log('[PhotoLocation] ❌ Permission denied (status:', permissionStatus.photos + ')');
        return false;
    } catch (error: any) {
        console.error('[PhotoLocation] ❌ Permission request error:', error);
        console.error('[PhotoLocation] Error message:', error?.message);
        return false;
    }
}

/**
 * Get photos near a specific location from user's photo library
 * Automatically scans recent 1000 photos
 * @param latitude - Target latitude
 * @param longitude - Target longitude
 * @param radiusMeters - Search radius in meters (default: 100m)
 * @param maxPhotos - Maximum number of photos to return (default: 10)
 */
export async function getPhotosNearLocation(
    latitude: number,
    longitude: number,
    radiusMeters: number = 100,
    maxPhotos: number = 10
): Promise<PhotoWithLocation[]> {
    if (!Capacitor.isNativePlatform()) {
        console.log('[PhotoLocation] ❌ Not on native platform, skipping');
        return [];
    }

    try {
        console.log('[PhotoLocation] ========================================');
        console.log('[PhotoLocation] 🔍 Starting photo search');
        console.log('[PhotoLocation] Target location:', { latitude, longitude, radiusMeters, maxPhotos });

        // Check permission first
        const hasPermission = await requestMediaPermission();
        if (!hasPermission) {
            console.log('[PhotoLocation] ❌ Photo library permission not granted');
            console.log('[PhotoLocation] User needs to grant permission in Settings > Mimy > Photos');
            return [];
        }
        console.log('[PhotoLocation] ✅ Permission granted');

        // Use native plugin to get recent photos with location
        console.log('[PhotoLocation] Fetching recent 1000 photos from native plugin...');
        const result = await PhotoLibrary.getRecentPhotos({ quantity: 1000 });

        console.log('[PhotoLocation] ✅ Found', result.photos.length, 'photos with GPS data');

        if (result.photos.length === 0) {
            console.log('[PhotoLocation] ⚠️ No photos with GPS data found');
            return [];
        }

        const photosWithLocation: PhotoWithLocation[] = [];
        let photosWithinRadius = 0;

        // Process each photo
        for (const photo of result.photos) {
            const distance = calculateDistance(
                latitude,
                longitude,
                photo.latitude,
                photo.longitude
            );

            // Check if within radius
            if (distance <= radiusMeters) {
                photosWithinRadius++;
                photosWithLocation.push({
                    identifier: photo.identifier,
                    uri: `data:image/jpeg;base64,${photo.base64}`,
                    latitude: photo.latitude,
                    longitude: photo.longitude,
                    distance,
                    dateTaken: new Date(photo.creationDate * 1000),
                });

                console.log(`[PhotoLocation] ✅ Found photo within radius! Distance: ${Math.round(distance)}m`);

                // Stop if we've found enough photos
                if (photosWithLocation.length >= maxPhotos * 2) {
                    console.log('[PhotoLocation] Found enough photos, stopping search');
                    break;
                }
            }
        }

        console.log('[PhotoLocation] ========================================');
        console.log('[PhotoLocation] 📊 Search Summary:');
        console.log(`  - Total photos with GPS: ${result.photos.length}`);
        console.log(`  - Photos within ${radiusMeters}m: ${photosWithinRadius}`);
        console.log('[PhotoLocation] ========================================');

        // Sort by distance and take top N
        const sortedPhotos = photosWithLocation
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxPhotos);

        console.log('[PhotoLocation] ✅ Returning', sortedPhotos.length, 'photos (sorted by distance)');
        if (sortedPhotos.length > 0) {
            console.log('[PhotoLocation] Distances:', sortedPhotos.map(p => Math.round(p.distance) + 'm').join(', '));
        }

        return sortedPhotos;
    } catch (error) {
        console.error('[PhotoLocation] ❌ FATAL ERROR getting photos near location:', error);
        console.error('[PhotoLocation] Error type:', typeof error);
        console.error('[PhotoLocation] Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('[PhotoLocation] Error stack:', error instanceof Error ? error.stack : undefined);
        return [];
    }
}

/**
 * Convert photo data URI to File object for upload
 */
export async function photoUriToFile(uri: string, filename: string = 'photo.jpg'): Promise<File | null> {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new File([blob], filename, { type: 'image/jpeg' });
    } catch (error) {
        console.error('[PhotoLocation] Error converting URI to File:', error);
        return null;
    }
}
