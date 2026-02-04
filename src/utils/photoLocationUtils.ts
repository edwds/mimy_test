import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';
import exifr from 'exifr';
import { Dialog } from '@capacitor/dialog';

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

        // Attempt to access albums - this will trigger permission prompt
        const result = await Media.getAlbumsPath();
        const hasPermission = result.path.length > 0;

        console.log('[PhotoLocation] Permission granted:', hasPermission);
        return hasPermission;
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
        const result = await Media.getAlbumsPath();
        return result.path.length > 0;
    } catch (error: any) {
        return false;
    }
}

/**
 * Request photo library permission and get all media albums
 */
async function requestMediaPermission(): Promise<boolean> {
    try {
        const result = await Media.getAlbumsPath();
        return result.path.length > 0;
    } catch (error: any) {
        if (error.message?.includes('permission')) {
            console.error('[PhotoLocation] Permission denied:', error);
            return false;
        }
        throw error;
    }
}

/**
 * Get photos near a specific location from user's photo library
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
        console.log('[PhotoLocation] Not on native platform, skipping');
        return [];
    }

    try {
        console.log('[PhotoLocation] Starting search near:', { latitude, longitude, radiusMeters });

        // Request permission
        const hasPermission = await requestMediaPermission();
        if (!hasPermission) {
            console.log('[PhotoLocation] Photo library permission not granted');
            return [];
        }

        // Get all albums
        const albumsResult = await Media.getAlbumsPath();
        console.log('[PhotoLocation] Found albums path:', albumsResult.path.length);

        const photosWithLocation: PhotoWithLocation[] = [];

        // Get media from library
        const mediaResult = await Media.getMedias({
            quantity: 200, // Get up to 200 most recent photos
            types: 'photos', // Only photos, not videos
            sort: 'creationDate',
        });

        console.log('[PhotoLocation] Found', mediaResult.medias.length, 'photos in library');

        // Process each photo
        for (const mediaItem of mediaResult.medias) {
            try {
                // Get media data with path
                const mediaData = await Media.getMediaByIdentifier({
                    identifier: mediaItem.identifier,
                });

                if (!mediaData?.path) continue;

                // Fetch the image file
                const response = await fetch(mediaData.path);
                const blob = await response.blob();

                // Extract EXIF data
                const exif = await exifr.parse(blob);

                if (exif?.latitude && exif?.longitude) {
                    const distance = calculateDistance(
                        latitude,
                        longitude,
                        exif.latitude,
                        exif.longitude
                    );

                    console.log('[PhotoLocation] Photo distance:', distance, 'meters');

                    // Check if within radius
                    if (distance <= radiusMeters) {
                        photosWithLocation.push({
                            identifier: mediaItem.identifier,
                            uri: mediaData.path,
                            latitude: exif.latitude,
                            longitude: exif.longitude,
                            distance,
                            dateTaken: exif.DateTimeOriginal || exif.CreateDate || new Date(mediaItem.creationDate),
                        });

                        // Stop if we've found enough photos
                        if (photosWithLocation.length >= maxPhotos * 2) {
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('[PhotoLocation] Error processing photo:', error);
                // Continue to next photo
            }
        }

        // Sort by distance and take top N
        const sortedPhotos = photosWithLocation
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxPhotos);

        console.log('[PhotoLocation] Found', sortedPhotos.length, 'photos within', radiusMeters, 'meters');

        return sortedPhotos;
    } catch (error) {
        console.error('[PhotoLocation] Error getting photos near location:', error);
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
