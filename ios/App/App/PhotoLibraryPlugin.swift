import Foundation
import Capacitor
import Photos

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoLibraryPlugin"
    public let jsName = "PhotoLibrary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanRecentPhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getThumbnails", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPhotoCount", returnType: CAPPluginReturnPromise)
    ]

    // Scan recent photos and extract GPS metadata only (no image loading)
    @objc func scanRecentPhotos(_ call: CAPPluginCall) {
        let quantity = call.getInt("quantity") ?? 200
        let offset = call.getInt("offset") ?? 0

        // Request authorization
        PHPhotoLibrary.requestAuthorization { status in
            // Check authorization status with iOS 14+ compatibility
            let isAuthorized: Bool
            if #available(iOS 14, *) {
                isAuthorized = status == .authorized || status == .limited
            } else {
                isAuthorized = status == .authorized
            }

            guard isAuthorized else {
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

        // Get optional size parameter (default to 400 for thumbnails, can request up to 1200 for full res)
        let targetSize = call.getInt("size") ?? 400
        let quality = call.getDouble("quality") ?? 0.8

        // Fetch assets by identifiers
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: identifiers, options: nil)

        var photos: [[String: Any]] = []
        let group = DispatchGroup()

        fetchResult.enumerateObjects { asset, _, _ in
            group.enter()

            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.isSynchronous = false
            options.resizeMode = .fast
            options.isNetworkAccessAllowed = true // Allow iCloud download
            options.progressHandler = { progress, error, stop, info in
                if error != nil {
                    print("[PhotoLibrary] Download error:", error?.localizedDescription ?? "unknown")
                }
            }

            // Request image at specified size
            PHImageManager.default().requestImage(
                for: asset,
                targetSize: CGSize(width: targetSize, height: targetSize),
                contentMode: .aspectFill,
                options: options
            ) { image, info in
                defer { group.leave() }

                // Check if we got a degraded image or need to wait for full quality
                let isDegraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
                let isInCloud = (info?[PHImageResultIsInCloudKey] as? Bool) ?? false

                if isInCloud {
                    print("[PhotoLibrary] Photo is in iCloud, downloading...")
                    // Don't return yet, wait for high quality version
                    if isDegraded {
                        group.enter() // Re-enter to wait for full quality
                    }
                }

                guard let image = image,
                      let imageData = image.jpegData(compressionQuality: quality),
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
            // Check authorization status with iOS 14+ compatibility
            let isAuthorized: Bool
            if #available(iOS 14, *) {
                isAuthorized = status == .authorized || status == .limited
            } else {
                isAuthorized = status == .authorized
            }

            guard isAuthorized else {
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
