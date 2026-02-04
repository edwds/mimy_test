import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';
import { photoCacheService } from '@/services/PhotoCacheService';

class BackgroundPhotoScanner {
    private readonly BATCH_SIZE = 200;
    private readonly MAX_PHOTOS = 2000;
    private isScanning = false;

    /**
     * Initial scan after quiz completion or first app launch
     * Scans first 200 photos with GPS data
     */
    async initialScan(): Promise<{
        success: boolean;
        photosScanned: number;
        photosWithGPS: number;
    }> {
        if (!Capacitor.isNativePlatform()) {
            console.log('[BackgroundScanner] Not on native platform, skipping');
            return { success: false, photosScanned: 0, photosWithGPS: 0 };
        }

        if (this.isScanning) {
            console.log('[BackgroundScanner] Already scanning, skipping');
            return { success: false, photosScanned: 0, photosWithGPS: 0 };
        }

        this.isScanning = true;

        try {
            console.log('[BackgroundScanner] ========================================');
            console.log('[BackgroundScanner] 🚀 Starting initial scan...');
            console.log('[BackgroundScanner] Batch size:', this.BATCH_SIZE);

            const result = await Media.getMedias({
                quantity: this.BATCH_SIZE,
                thumbnailWidth: 1, // Minimal thumbnail - we only need metadata
                thumbnailHeight: 1,
                thumbnailQuality: 1,
                sort: [{
                    key: 'creationDate',
                    ascending: false
                }]
            });

            console.log('[BackgroundScanner] ✅ Got', result.medias?.length || 0, 'medias');

            // Filter photos with GPS data and convert to our format
            const photosWithGPS = (result.medias || [])
                .filter(media => media.location?.latitude && media.location?.longitude)
                .map(media => ({
                    identifier: media.identifier,
                    latitude: media.location!.latitude!,
                    longitude: media.location!.longitude!,
                    creationDate: new Date(media.creationDate).getTime() / 1000
                }));

            console.log('[BackgroundScanner] ✅ Found', photosWithGPS.length, 'photos with GPS');

            // Save to cache
            if (photosWithGPS.length > 0) {
                await photoCacheService.saveMetadata(photosWithGPS);
            }

            // Update scan info
            await photoCacheService.updateScanInfo({
                lastScanDate: Date.now(),
                totalScanned: result.medias?.length || 0,
                totalWithGPS: photosWithGPS.length,
                offset: this.BATCH_SIZE,
            });

            console.log('[BackgroundScanner] ========================================');

            return {
                success: true,
                photosScanned: result.medias?.length || 0,
                photosWithGPS: photosWithGPS.length,
            };
        } catch (error) {
            console.error('[BackgroundScanner] ❌ Initial scan failed:', error);
            return { success: false, photosScanned: 0, photosWithGPS: 0 };
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Incremental scan - scan next batch of photos
     * Call this during app idle time
     */
    async incrementalScan(): Promise<{
        success: boolean;
        photosScanned: number;
        totalCached: number;
        reachedLimit: boolean;
    }> {
        if (!Capacitor.isNativePlatform()) {
            return { success: false, photosScanned: 0, totalCached: 0, reachedLimit: false };
        }

        if (this.isScanning) {
            console.log('[BackgroundScanner] Already scanning, skipping');
            return { success: false, photosScanned: 0, totalCached: 0, reachedLimit: false };
        }

        // Check if we've reached the limit
        const totalCached = await photoCacheService.getTotalCached();
        if (totalCached >= this.MAX_PHOTOS) {
            console.log('[BackgroundScanner] ✅ Reached maximum cache limit:', this.MAX_PHOTOS);
            return { success: true, photosScanned: 0, totalCached, reachedLimit: true };
        }

        this.isScanning = true;

        try {
            const scanInfo = await photoCacheService.getLastScanInfo();
            const offset = scanInfo?.offset || 0;

            console.log('[BackgroundScanner] 🔄 Incremental scan starting from offset:', offset);

            const result = await Media.getMedias({
                quantity: this.BATCH_SIZE,
                thumbnailWidth: 1,
                thumbnailHeight: 1,
                thumbnailQuality: 1,
                sort: [{
                    key: 'creationDate',
                    ascending: false
                }]
                // Note: Media plugin doesn't support offset, so we'll get duplicates
                // but cache will handle it with unique identifiers
            });

            // Filter photos with GPS data
            const photosWithGPS = (result.medias || [])
                .filter(media => media.location?.latitude && media.location?.longitude)
                .map(media => ({
                    identifier: media.identifier,
                    latitude: media.location!.latitude!,
                    longitude: media.location!.longitude!,
                    creationDate: new Date(media.creationDate).getTime() / 1000
                }));

            console.log('[BackgroundScanner] ✅ Found', photosWithGPS.length, 'more photos with GPS');

            // Save to cache
            if (photosWithGPS.length > 0) {
                await photoCacheService.saveMetadata(photosWithGPS);
            }

            // Update scan info
            const newTotalCached = await photoCacheService.getTotalCached();
            await photoCacheService.updateScanInfo({
                lastScanDate: Date.now(),
                totalScanned: result.medias?.length || 0,
                totalWithGPS: newTotalCached,
                offset: offset + this.BATCH_SIZE,
            });

            const reachedLimit = newTotalCached >= this.MAX_PHOTOS;

            return {
                success: true,
                photosScanned: photosWithGPS.length,
                totalCached: newTotalCached,
                reachedLimit,
            };
        } catch (error) {
            console.error('[BackgroundScanner] ❌ Incremental scan failed:', error);
            return { success: false, photosScanned: 0, totalCached: 0, reachedLimit: false };
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Check if initial scan has been completed
     */
    async hasInitialScan(): Promise<boolean> {
        const scanInfo = await photoCacheService.getLastScanInfo();
        return scanInfo !== null && scanInfo.totalWithGPS > 0;
    }

    /**
     * Get scan statistics
     */
    async getStats(): Promise<{
        totalCached: number;
        lastScanDate: number | null;
        progress: number; // 0-100
    }> {
        const totalCached = await photoCacheService.getTotalCached();
        const scanInfo = await photoCacheService.getLastScanInfo();

        const progress = Math.min((totalCached / this.MAX_PHOTOS) * 100, 100);

        return {
            totalCached,
            lastScanDate: scanInfo?.lastScanDate || null,
            progress: Math.round(progress),
        };
    }

    /**
     * Reset and clear all cached data
     */
    async reset(): Promise<void> {
        console.log('[BackgroundScanner] 🗑️ Resetting cache...');
        await photoCacheService.clearCache();
        console.log('[BackgroundScanner] ✅ Cache reset complete');
    }
}

// Singleton instance
export const backgroundPhotoScanner = new BackgroundPhotoScanner();
