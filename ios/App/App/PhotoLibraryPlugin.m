#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(PhotoLibraryPlugin, "PhotoLibrary",
    CAP_PLUGIN_METHOD(getRecentPhotos, CAPPluginReturnPromise);
)
