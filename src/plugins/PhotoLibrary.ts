import { registerPlugin } from '@capacitor/core';

export interface PhotoMetadata {
    identifier: string;
    latitude: number;
    longitude: number;
    creationDate: number;
}

export interface PhotoWithThumbnail extends PhotoMetadata {
    base64: string;
}

export interface PhotoLibraryPlugin {
    scanRecentPhotos(options: {
        quantity: number;
        offset?: number;
    }): Promise<{
        photos: PhotoMetadata[];
        total: number;
    }>;

    getThumbnails(options: {
        identifiers: string[];
        size?: number; // Target size in pixels (default: 400, max: 1200)
        quality?: number; // JPEG quality 0-1 (default: 0.8)
    }): Promise<{
        photos: PhotoWithThumbnail[];
    }>;

    getPhotoCount(): Promise<{
        total: number;
        withLocation: number;
    }>;
}

const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>('PhotoLibrary');

export default PhotoLibrary;
