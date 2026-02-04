# Photo Location Testing Guide

## Overview
This document provides comprehensive testing instructions for the iOS photo location-based suggestion feature implemented in Tasks 1-4.

## Architecture Summary

The implementation uses a **three-layer architecture** for optimal performance:

1. **Native Layer** (PhotoLibraryPlugin.swift)
   - Extracts GPS metadata WITHOUT loading images
   - Provides three methods: scanRecentPhotos(), getThumbnails(), getPhotoCount()

2. **Cache Layer** (PhotoCacheService.ts)
   - IndexedDB storage for photo metadata (~100 bytes per photo)
   - Fast distance-based search using Haversine formula

3. **Background Scanner** (BackgroundPhotoScanner.ts)
   - Incremental scanning: 200 photos per batch
   - Maximum 2000 photos cached total
   - Runs initial scan on first use, incremental scans during idle time

## Testing Steps

### 1. Build and Deploy to iOS Device

```bash
# Already completed:
npm run build
npx cap sync ios

# Open Xcode
npx cap open ios
```

### 2. Verify Plugin Compilation

In Xcode:
1. Product → Clean Build Folder (Cmd+Shift+K)
2. Product → Build (Cmd+B)
3. Check build log for:
   ```
   CompileSwift PhotoLibraryPlugin.swift
   ```
4. Verify NO errors related to PhotoLibraryPlugin

### 3. Deploy to iOS Device

1. Connect physical iOS device (simulator may not have photos)
2. Select device in Xcode
3. Product → Run (Cmd+R)

### 4. Test Permission Flow

**Expected Flow:**
1. On first app launch (or after quiz completion), permission dialog should appear
2. Dialog text: "사진 라이브러리 접근"
3. User taps "확인" (Confirm)
4. iOS permission popup appears
5. Select "모든 사진 허용" (Allow Access to All Photos)

**Testing:**
```typescript
// Check permission status
const hasPermission = await checkPhotoLibraryPermission();
console.log('[TEST] Has permission:', hasPermission);

// Request permission
const granted = await requestPhotoLibraryPermission();
console.log('[TEST] Permission granted:', granted);
```

### 5. Test Initial Scan

**Where to trigger:** After quiz completion or first time entering WriteContentStep

**Expected behavior:**
- Initial scan of first 200 photos
- Extracts ONLY GPS metadata (identifier, lat, lng, creationDate)
- Takes ~2-5 seconds depending on device
- Stores metadata in IndexedDB

**Console logs to watch for:**
```
[BackgroundScanner] 🚀 Starting initial scan...
[BackgroundScanner] Batch size: 200
[BackgroundScanner] ✅ Scanned X total photos
[BackgroundScanner] ✅ Found Y photos with GPS
[PhotoCache] Saving Y photos to cache...
[PhotoCache] ✅ Photos saved to cache
```

**Testing:**
```typescript
// Manually trigger initial scan
const result = await backgroundPhotoScanner.initialScan();
console.log('[TEST] Initial scan result:', result);
// Expected: { success: true, photosScanned: X, photosWithGPS: Y }

// Check scan status
const hasInitialScan = await backgroundPhotoScanner.hasInitialScan();
console.log('[TEST] Has initial scan:', hasInitialScan);

// Get statistics
const stats = await backgroundPhotoScanner.getStats();
console.log('[TEST] Scanner stats:', stats);
// Expected: { totalCached: Y, lastScanDate: timestamp, progress: N% }
```

### 6. Test Photo Search (Main Feature)

**Where:** WriteContentStep.tsx - when entering review flow for a restaurant

**Test scenario:**
1. Navigate to Write Review
2. Select a restaurant (must have lat/lng)
3. System should automatically search for photos near restaurant

**Expected behavior:**
- Searches IndexedDB for photos within 100m radius
- Returns photos sorted by distance (closest first)
- Loads thumbnails ONLY for nearby photos (max 10)
- Takes <1 second after cache is populated

**Console logs to watch for:**
```
[PhotoLocation] ========================================
[PhotoLocation] 🔍 Starting photo search (cache-based)
[PhotoLocation] Target location: { latitude: 37.xxx, longitude: 127.xxx, radiusMeters: 100, maxPhotos: 10 }
[PhotoLocation] Searching in IndexedDB cache...
[PhotoCache] Found X photos in cache
[PhotoCache] Found Y photos within 100m
[PhotoLocation] ✅ Found Y photos in cache within radius
[PhotoLocation] Loading thumbnails for Y photos...
[PhotoLocation] ✅ Loaded Y thumbnails
[PhotoLocation] 📊 Search Summary:
  - Photos in cache within 100m: Y
  - Thumbnails loaded: Y
  - Distances: 15m, 32m, 67m, ...
[PhotoLocation] ========================================
```

**Testing:**
```typescript
// Test with known restaurant location
const shopLat = 37.5665; // Example: Seoul
const shopLng = 126.9780;

const nearbyPhotos = await getPhotosNearLocation(shopLat, shopLng, 100, 10);
console.log('[TEST] Found photos:', nearbyPhotos.length);
console.log('[TEST] First photo distance:', nearbyPhotos[0]?.distance, 'm');
console.log('[TEST] Photo URIs:', nearbyPhotos.map(p => p.uri.substring(0, 50)));
```

### 7. Test Incremental Scanning

**When:** During app idle time (future implementation)

**Testing:**
```typescript
// Manually trigger incremental scan
const result = await backgroundPhotoScanner.incrementalScan();
console.log('[TEST] Incremental scan result:', result);
// Expected: { success: true, photosScanned: X, totalCached: Y, reachedLimit: false }

// Keep scanning until limit
while (true) {
    const stats = await backgroundPhotoScanner.getStats();
    if (stats.totalCached >= 2000) break;

    await backgroundPhotoScanner.incrementalScan();
    await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### 8. Performance Testing

**Test cases:**

1. **Large photo library (5000+ photos):**
   - Initial scan should complete in ~5 seconds
   - Cache should only store first 2000 photos
   - Search should remain fast (<1 second)

2. **Memory usage:**
   - IndexedDB cache: ~200KB for 2000 photos
   - Thumbnail loading: Only nearby photos (not all)
   - App should not crash or slow down

3. **No GPS photos:**
   - Should gracefully return empty array
   - Should not show errors to user

4. **No permission:**
   - Should return empty array
   - Should show permission request dialog

## Troubleshooting

### Issue: Native Plugin Still Shows "UNIMPLEMENTED"

**Symptoms:**
```
[error] - Error: "PhotoLibrary" plugin is not implemented on ios
```

**Possible causes:**
1. Plugin not properly linked in Xcode
2. Bridging header issues
3. Plugin not registered in Capacitor runtime

**Solutions:**

A. **Clean and Rebuild:**
```bash
# Frontend
npm run build
npx cap sync ios

# Xcode
rm -rf ~/Library/Developer/Xcode/DerivedData
npx cap open ios
# Product → Clean Build Folder
# Product → Build
```

B. **Verify Plugin Registration:**
Check `ios/App/App/PhotoLibraryPlugin.m`:
```objc
CAP_PLUGIN(PhotoLibraryPlugin, "PhotoLibrary",
    CAP_PLUGIN_METHOD(scanRecentPhotos, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getThumbnails, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getPhotoCount, CAPPluginReturnPromise);
)
```

C. **Verify Swift File:**
Check `ios/App/App/PhotoLibraryPlugin.swift`:
```swift
import Capacitor
import Photos

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoLibraryPlugin"
    public let jsName = "PhotoLibrary"
    // ... rest of implementation
}
```

D. **Check Xcode File References:**
- Both .swift and .m files should NOT have "?" icon
- Both files should be in "Compile Sources" build phase
- Check file paths in project.pbxproj

E. **Verify Import in AppDelegate.swift:**
Not necessary for Capacitor 6, but if issues persist, add:
```swift
import Capacitor
```

### Issue: Permission Not Requesting

**Check Info.plist:**
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Mimy needs access to your photo library to suggest photos taken at restaurant locations for your reviews.</string>
```

### Issue: No Photos Found Despite Having Photos

**Debugging steps:**
1. Check if photos have GPS data:
   - Open Photos app → Select photo → Swipe up → Should see location
2. Check cache:
   ```typescript
   const totalCached = await photoCacheService.getTotalCached();
   console.log('[TEST] Total cached:', totalCached);
   ```
3. Check scan info:
   ```typescript
   const scanInfo = await photoCacheService.getLastScanInfo();
   console.log('[TEST] Scan info:', scanInfo);
   ```
4. Manually trigger scan:
   ```typescript
   await backgroundPhotoScanner.reset(); // Clear cache
   await backgroundPhotoScanner.initialScan(); // Re-scan
   ```

### Issue: Photos Found But Not Displaying

**Check:**
1. Thumbnail loading:
   ```typescript
   const thumbnails = await PhotoLibrary.getThumbnails({
       identifiers: ['photo-identifier-here']
   });
   console.log('[TEST] Thumbnails:', thumbnails);
   ```
2. Base64 encoding:
   - URIs should start with `data:image/jpeg;base64,`
3. UI rendering:
   - Check if `suggestedPhotos` state is properly passed to UI components

## Expected Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Initial scan time | 2-5 seconds | First 200 photos |
| Search time | <1 second | After cache populated |
| Cache size | ~200KB | 2000 photos |
| Memory usage | <50MB | During scanning |
| Thumbnail load | <2 seconds | 10 photos |

## Success Criteria

✅ **Task 5 Complete When:**
1. Native plugin compiles without errors
2. Permission request works on iOS
3. Initial scan completes successfully
4. Photos are cached in IndexedDB
5. Search finds photos within 100m radius
6. Thumbnails load correctly
7. UI displays suggested photos in review flow
8. Performance meets targets
9. No crashes or memory issues
10. Works with large photo libraries (1000+ photos)

## Next Steps (After Task 5)

1. **Background Scanning Implementation:**
   - Trigger incremental scans during app idle time
   - Add UI progress indicator
   - Handle app background/foreground transitions

2. **UI Enhancements:**
   - Show scanning progress
   - Add "loading photos" state
   - Handle no permission gracefully

3. **Performance Optimization:**
   - Batch thumbnail loading
   - Add image caching
   - Optimize IndexedDB queries

4. **Error Handling:**
   - User-friendly error messages
   - Retry logic for failed scans
   - Fallback when no permission

## Related Files

**Native Plugin:**
- `ios/App/App/PhotoLibraryPlugin.swift` - Core implementation
- `ios/App/App/PhotoLibraryPlugin.m` - Capacitor registration
- `ios/App/App/Info.plist` - Permission strings

**TypeScript:**
- `src/plugins/PhotoLibrary.ts` - Plugin interface
- `src/services/PhotoCacheService.ts` - IndexedDB caching
- `src/services/BackgroundPhotoScanner.ts` - Scanning logic
- `src/utils/photoLocationUtils.ts` - Public API

**Integration:**
- `src/screens/write/WriteContentStep.tsx` - Main usage

## Contact

For issues or questions about this implementation, refer to:
- Native plugin: PhotoLibraryPlugin.swift
- Architecture decisions: This document
- Performance analysis: BackgroundPhotoScanner.ts comments
