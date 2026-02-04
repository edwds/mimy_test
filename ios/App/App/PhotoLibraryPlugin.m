#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(PhotoLibraryPlugin, "PhotoLibrary",
    CAP_PLUGIN_METHOD(scanRecentPhotos, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getThumbnails, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getPhotoCount, CAPPluginReturnPromise);
)
