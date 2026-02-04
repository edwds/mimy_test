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
