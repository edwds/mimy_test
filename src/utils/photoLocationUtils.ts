import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Dialog } from '@capacitor/dialog';
import { Media } from '@capacitor-community/media';
import { photoCacheService } from '@/services/PhotoCacheService';
import { backgroundPhotoScanner } from '@/services/BackgroundPhotoScanner';

export interface PhotoWithLocation {
    identifier: string;
    uri: string;
    latitude: number;
    longitude: number;
    distance: number; // meters
    dateTaken?: Date;
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
 * Get photos near a specific location using cached metadata
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
        console.log('[PhotoLocation] 🔍 Starting photo search (cache-based)');
        console.log('[PhotoLocation] Target location:', { latitude, longitude, radiusMeters, maxPhotos });

        // Check if initial scan has been done
        const hasInitialScan = await backgroundPhotoScanner.hasInitialScan();

        if (!hasInitialScan) {
            console.log('[PhotoLocation] ⚠️ No initial scan found. Triggering initial scan...');

            // Check permission
            const hasPermission = await checkPhotoLibraryPermission();
            if (!hasPermission) {
                console.log('[PhotoLocation] ❌ No permission, cannot scan');
                return [];
            }

            // Run initial scan (this will take a few seconds)
            const scanResult = await backgroundPhotoScanner.initialScan();
            console.log('[PhotoLocation] Initial scan result:', scanResult);

            if (!scanResult.success) {
                console.log('[PhotoLocation] ❌ Initial scan failed');
                return [];
            }
        }

        // Search in cache
        console.log('[PhotoLocation] Searching in IndexedDB cache...');
        const nearbyMetadata = await photoCacheService.findNearby(latitude, longitude, radiusMeters);

        console.log('[PhotoLocation] ✅ Found', nearbyMetadata.length, 'photos in cache within radius');

        if (nearbyMetadata.length === 0) {
            return [];
        }

        // Get thumbnails for nearby photos (limited to maxPhotos)
        const identifiersToLoad = nearbyMetadata.slice(0, maxPhotos).map(p => p.identifier);

        console.log('[PhotoLocation] Loading small thumbnails for', identifiersToLoad.length, 'photos...');

        // Load small thumbnails first (fast preview)
        const photosWithLocation: PhotoWithLocation[] = [];
        const batchSize = 500;
        let found = 0;

        for (let offset = 0; offset < 2000 && found < identifiersToLoad.length; offset += batchSize) {
            console.log(`[PhotoLocation] Loading batch: ${offset}-${offset + batchSize}...`);

            try {
                const thumbnailResult = await Media.getMedias({
                    quantity: batchSize,
                    thumbnailWidth: 120, // Smaller thumbnail for faster loading
                    thumbnailHeight: 120,
                    thumbnailQuality: 60, // Lower quality for speed
                    sort: [{
                        key: 'creationDate',
                        ascending: false
                    }]
                });

                console.log('[PhotoLocation] ✅ Got', thumbnailResult.medias?.length || 0, 'thumbnails in this batch');

                // Match by identifier
                for (const metadata of nearbyMetadata.slice(0, maxPhotos)) {
                    // Skip if already found
                    if (photosWithLocation.find(p => p.identifier === metadata.identifier)) {
                        continue;
                    }

                    const media = thumbnailResult.medias?.find(m => m.identifier === metadata.identifier);

                    if (media?.data) {
                        photosWithLocation.push({
                            identifier: metadata.identifier,
                            uri: media.data.startsWith('data:') ? media.data : `data:image/jpeg;base64,${media.data}`,
                            latitude: metadata.latitude,
                            longitude: metadata.longitude,
                            distance: metadata.distance,
                            dateTaken: new Date(metadata.creationDate * 1000),
                        });
                        found++;
                        console.log('[PhotoLocation] ✅ Matched photo:', metadata.identifier, 'distance:', Math.round(metadata.distance), 'm');
                    }
                }

                // Stop early if we found all photos
                if (found >= identifiersToLoad.length) {
                    console.log('[PhotoLocation] ✅ Found all requested photos!');
                    break;
                }
            } catch (error) {
                console.error('[PhotoLocation] Error loading batch:', error);
                break;
            }
        }

        if (found < identifiersToLoad.length) {
            console.warn(`[PhotoLocation] ⚠️ Only found ${found}/${identifiersToLoad.length} photos`);
        }

        console.log('[PhotoLocation] ✅ Loaded', photosWithLocation.length, 'thumbnails with data');

        // Sort by distance
        photosWithLocation.sort((a, b) => a.distance - b.distance);

        console.log('[PhotoLocation] ========================================');
        console.log('[PhotoLocation] 📊 Search Summary:');
        console.log(`  - Photos in cache within ${radiusMeters}m: ${nearbyMetadata.length}`);
        console.log(`  - Thumbnails loaded: ${photosWithLocation.length}`);
        console.log(`  - Distances: ${photosWithLocation.map(p => Math.round(p.distance) + 'm').join(', ')}`);
        console.log('[PhotoLocation] ========================================');

        return photosWithLocation;
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

/**
 * Get full resolution image for a photo identifier
 */
export async function getFullResolutionPhoto(identifier: string): Promise<File | null> {
    if (!Capacitor.isNativePlatform()) {
        return null;
    }

    try {
        console.log('[PhotoLocation] Loading full resolution for:', identifier);

        // Load high quality image (1200px is enough, faster than full resolution)
        const result = await Media.getMedias({
            quantity: 500, // Need to scan to find our identifier
            thumbnailWidth: 1200, // Good quality for upload
            thumbnailHeight: 1200,
            thumbnailQuality: 85, // Good balance between quality and size
            sort: [{
                key: 'creationDate',
                ascending: false
            }]
        });

        const photo = result.medias?.find(m => m.identifier === identifier);

        if (!photo?.data) {
            console.error('[PhotoLocation] Could not find full resolution photo');
            return null;
        }

        const dataUri = photo.data.startsWith('data:') ? photo.data : `data:image/jpeg;base64,${photo.data}`;
        const response = await fetch(dataUri);
        const blob = await response.blob();

        const filename = `photo_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });

        console.log('[PhotoLocation] ✅ Loaded full resolution:', file.size, 'bytes', `(~${Math.round(file.size / 1024)}KB)`);
        return file;
    } catch (error) {
        console.error('[PhotoLocation] Error loading full resolution:', error);
        return null;
    }
}
