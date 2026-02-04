import Foundation
import Capacitor
import Photos

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin {

    // Scan recent photos and extract GPS metadata only (no image loading)
    @objc func scanRecentPhotos(_ call: CAPPluginCall) {
        let quantity = call.getInt("quantity") ?? 200
        let offset = call.getInt("offset") ?? 0

        // Request authorization
        PHPhotoLibrary.requestAuthorization { status in
            guard status == .authorized || status == .limited else {
                call.reject("Photo library access denied")
                return
            }

            // Fetch recent photos with offset
            let fetchOptions = PHFetchOptions()
            fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
            // Note: fetchLimit doesn't support offset, so we'll fetch more and skip
            fetchOptions.fetchLimit = quantity + offset

            let assets = PHAsset.fetchAssets(with: .image, options: fetchOptions)

            var photoMetadata: [[String: Any]] = []
            var processedCount = 0

            // Extract metadata only (no image loading)
            assets.enumerateObjects { asset, index, _ in
                // Skip offset items
                if index < offset {
                    return
                }

                guard let location = asset.location else {
                    return
                }

                photoMetadata.append([
                    "identifier": asset.localIdentifier,
                    "latitude": location.coordinate.latitude,
                    "longitude": location.coordinate.longitude,
                    "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0
                ])

                processedCount += 1

                // Stop after quantity items
                if processedCount >= quantity {
                    return
                }
            }

            call.resolve([
                "photos": photoMetadata,
                "total": assets.count
            ])
        }
    }

    // Get thumbnails for specific photo identifiers
    @objc func getThumbnails(_ call: CAPPluginCall) {
        guard let identifiers = call.getArray("identifiers", String.self) else {
            call.reject("Missing identifiers parameter")
            return
        }

        // Fetch assets by identifiers
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: identifiers, options: nil)

        var photos: [[String: Any]] = []
        let group = DispatchGroup()

        fetchResult.enumerateObjects { asset, _, _ in
            group.enter()

            let options = PHImageRequestOptions()
            options.deliveryMode = .fastFormat
            options.isSynchronous = false
            options.resizeMode = .fast

            // Request small thumbnail
            PHImageManager.default().requestImage(
                for: asset,
                targetSize: CGSize(width: 200, height: 200),
                contentMode: .aspectFill,
                options: options
            ) { image, info in
                defer { group.leave() }

                guard let image = image,
                      let imageData = image.jpegData(compressionQuality: 0.7),
                      let location = asset.location else {
                    return
                }

                let base64 = imageData.base64EncodedString()

                photos.append([
                    "identifier": asset.localIdentifier,
                    "latitude": location.coordinate.latitude,
                    "longitude": location.coordinate.longitude,
                    "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0,
                    "base64": base64
                ])
            }
        }

        group.notify(queue: .main) {
            call.resolve([
                "photos": photos
            ])
        }
    }

    // Get total photo count with location
    @objc func getPhotoCount(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization { status in
            guard status == .authorized || status == .limited else {
                call.reject("Photo library access denied")
                return
            }

            let fetchOptions = PHFetchOptions()
            let assets = PHAsset.fetchAssets(with: .image, options: fetchOptions)

            var countWithLocation = 0
            assets.enumerateObjects { asset, _, _ in
                if asset.location != nil {
                    countWithLocation += 1
                }
            }

            call.resolve([
                "total": assets.count,
                "withLocation": countWithLocation
            ])
        }
    }
}
