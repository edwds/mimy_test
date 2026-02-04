import { Capacitor } from '@capacitor/core';
import PhotoLibrary from '@/plugins/PhotoLibrary';
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

            const result = await PhotoLibrary.scanRecentPhotos({
                quantity: this.BATCH_SIZE,
                offset: 0,
            });

            console.log('[BackgroundScanner] ✅ Scanned', result.total, 'total photos');
            console.log('[BackgroundScanner] ✅ Found', result.photos.length, 'photos with GPS');

            // Save to cache
            if (result.photos.length > 0) {
                await photoCacheService.saveMetadata(result.photos);
            }

            // Update scan info
            await photoCacheService.updateScanInfo({
                lastScanDate: Date.now(),
                totalScanned: result.total,
                totalWithGPS: result.photos.length,
                offset: this.BATCH_SIZE,
            });

            console.log('[BackgroundScanner] ========================================');

            return {
                success: true,
                photosScanned: result.total,
                photosWithGPS: result.photos.length,
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

            const result = await PhotoLibrary.scanRecentPhotos({
                quantity: this.BATCH_SIZE,
                offset,
            });

            console.log('[BackgroundScanner] ✅ Found', result.photos.length, 'more photos with GPS');

            // Save to cache
            if (result.photos.length > 0) {
                await photoCacheService.saveMetadata(result.photos);
            }

            // Update scan info
            const newTotalCached = await photoCacheService.getTotalCached();
            await photoCacheService.updateScanInfo({
                lastScanDate: Date.now(),
                totalScanned: result.total,
                totalWithGPS: newTotalCached,
                offset: offset + this.BATCH_SIZE,
            });

            const reachedLimit = newTotalCached >= this.MAX_PHOTOS;

            return {
                success: true,
                photosScanned: result.photos.length,
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
