import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PhotoCacheDB extends DBSchema {
    photos: {
        key: string; // identifier
        value: {
            identifier: string;
            latitude: number;
            longitude: number;
            creationDate: number;
        };
        indexes: {
            'by-date': number;
        };
    };
    scanInfo: {
        key: string; // 'lastScan'
        value: {
            id: string; // 'lastScan'
            lastScanDate: number;
            totalScanned: number;
            totalWithGPS: number;
            offset: number; // How many photos we've scanned so far
        };
    };
}

class PhotoCacheService {
    private db: IDBPDatabase<PhotoCacheDB> | null = null;
    private readonly DB_NAME = 'MimyPhotoCache';
    private readonly DB_VERSION = 1;

    async init(): Promise<void> {
        if (this.db) return;

        console.log('[PhotoCache] Initializing IndexedDB...');

        this.db = await openDB<PhotoCacheDB>(this.DB_NAME, this.DB_VERSION, {
            upgrade(db) {
                // Photos store
                if (!db.objectStoreNames.contains('photos')) {
                    const photoStore = db.createObjectStore('photos', { keyPath: 'identifier' });
                    photoStore.createIndex('by-date', 'creationDate');
                    console.log('[PhotoCache] Created photos object store');
                }

                // Scan info store
                if (!db.objectStoreNames.contains('scanInfo')) {
                    db.createObjectStore('scanInfo', { keyPath: 'id' });
                    console.log('[PhotoCache] Created scanInfo object store');
                }
            },
        });

        console.log('[PhotoCache] IndexedDB initialized');
    }

    async saveMetadata(photos: Array<{
        identifier: string;
        latitude: number;
        longitude: number;
        creationDate: number;
    }>): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        console.log(`[PhotoCache] Saving ${photos.length} photos to cache...`);

        const tx = this.db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');

        await Promise.all(photos.map(photo => store.put(photo)));
        await tx.done;

        console.log('[PhotoCache] ✅ Photos saved to cache');
    }

    async findNearby(
        latitude: number,
        longitude: number,
        radiusMeters: number = 100
    ): Promise<Array<{
        identifier: string;
        latitude: number;
        longitude: number;
        distance: number;
        creationDate: number;
    }>> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        console.log(`[PhotoCache] Searching for photos within ${radiusMeters}m of`, { latitude, longitude });

        const allPhotos = await this.db.getAll('photos');
        console.log(`[PhotoCache] Found ${allPhotos.length} photos in cache`);

        const nearbyPhotos = allPhotos
            .map(photo => ({
                ...photo,
                distance: this.calculateDistance(latitude, longitude, photo.latitude, photo.longitude),
            }))
            .filter(photo => photo.distance <= radiusMeters)
            .sort((a, b) => a.distance - b.distance);

        console.log(`[PhotoCache] Found ${nearbyPhotos.length} photos within ${radiusMeters}m`);

        return nearbyPhotos;
    }

    async getLastScanInfo(): Promise<{
        lastScanDate: number;
        totalScanned: number;
        totalWithGPS: number;
        offset: number;
    } | null> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return await this.db.get('scanInfo', 'lastScan') || null;
    }

    async updateScanInfo(info: {
        lastScanDate: number;
        totalScanned: number;
        totalWithGPS: number;
        offset: number;
    }): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        await this.db.put('scanInfo', { ...info, id: 'lastScan' });
        console.log('[PhotoCache] Updated scan info:', info);
    }

    async getTotalCached(): Promise<number> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return await this.db.count('photos');
    }

    async clearCache(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        console.log('[PhotoCache] Clearing cache...');
        await this.db.clear('photos');
        await this.db.clear('scanInfo');
        console.log('[PhotoCache] ✅ Cache cleared');
    }

    private calculateDistance(
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
}

// Singleton instance
export const photoCacheService = new PhotoCacheService();
