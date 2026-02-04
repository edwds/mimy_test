import Foundation
import Capacitor
import Photos

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin {

    @objc func getRecentPhotos(_ call: CAPPluginCall) {
        let quantity = call.getInt("quantity") ?? 1000

        // Request authorization
        PHPhotoLibrary.requestAuthorization { status in
            guard status == .authorized else {
                call.reject("Photo library access denied")
                return
            }

            // Fetch recent photos
            let fetchOptions = PHFetchOptions()
            fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
            fetchOptions.fetchLimit = quantity

            let assets = PHAsset.fetchAssets(with: .image, options: fetchOptions)

            var photos: [[String: Any]] = []
            let group = DispatchGroup()

            assets.enumerateObjects { asset, _, _ in
                guard let location = asset.location else {
                    return
                }

                group.enter()

                let options = PHImageRequestOptions()
                options.deliveryMode = .fastFormat
                options.isSynchronous = false

                PHImageManager.default().requestImage(
                    for: asset,
                    targetSize: CGSize(width: 300, height: 300),
                    contentMode: .aspectFill,
                    options: options
                ) { image, _ in
                    if let image = image, let imageData = image.jpegData(compressionQuality: 0.8) {
                        let base64 = imageData.base64EncodedString()

                        photos.append([
                            "identifier": asset.localIdentifier,
                            "latitude": location.coordinate.latitude,
                            "longitude": location.coordinate.longitude,
                            "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0,
                            "base64": base64
                        ])
                    }
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                call.resolve([
                    "photos": photos
                ])
            }
        }
    }
}
