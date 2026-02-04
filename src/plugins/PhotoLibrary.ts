import { registerPlugin } from '@capacitor/core';

export interface PhotoLibraryPlugin {
    getRecentPhotos(options: { quantity: number }): Promise<{ photos: Array<{
        identifier: string;
        latitude: number;
        longitude: number;
        creationDate: number;
        base64: string;
    }> }>;
}

const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>('PhotoLibrary');

export default PhotoLibrary;
