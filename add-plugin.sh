#!/bin/bash

echo "🔧 Adding PhotoLibrary plugin to Xcode project..."

PROJECT_DIR="/Users/catchtable/mimy_test"
XCODE_PROJECT="$PROJECT_DIR/ios/App/App.xcodeproj/project.pbxproj"

# Check if files exist
if [ ! -f "$PROJECT_DIR/ios/App/App/PhotoLibraryPlugin.swift" ]; then
    echo "❌ PhotoLibraryPlugin.swift not found!"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/ios/App/App/PhotoLibraryPlugin.m" ]; then
    echo "❌ PhotoLibraryPlugin.m not found!"
    exit 1
fi

echo "✅ Plugin files found"

# Backup project file
cp "$XCODE_PROJECT" "$XCODE_PROJECT.backup"
echo "✅ Backed up project file"

# Use ruby to modify the pbxproj file
ruby << 'EOF'
require 'xcodeproj'

project_path = '/Users/catchtable/mimy_test/ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the App target
target = project.targets.first

# Get the App group
app_group = project.main_group.find_subpath('App/App', true)

# Add Swift file
swift_file_ref = app_group.new_reference('PhotoLibraryPlugin.swift')
target.source_build_phase.add_file_reference(swift_file_ref)

# Add Objective-C file
objc_file_ref = app_group.new_reference('PhotoLibraryPlugin.m')
target.source_build_phase.add_file_reference(objc_file_ref)

# Save the project
project.save

puts "✅ Files added to Xcode project"
EOF

if [ $? -eq 0 ]; then
    echo "✅ Successfully added plugin to Xcode project"
    echo ""
    echo "Next steps:"
    echo "1. Open Xcode: npx cap open ios"
    echo "2. Clean build: Product > Clean Build Folder (⇧⌘K)"
    echo "3. Build: Product > Build (⌘B)"
else
    echo "❌ Failed to add plugin. Restoring backup..."
    mv "$XCODE_PROJECT.backup" "$XCODE_PROJECT"
    echo ""
    echo "Manual installation required. Please follow these steps in Xcode:"
    echo "1. Right-click 'App' folder in Project Navigator"
    echo "2. Select 'Add Files to App...'"
    echo "3. Select both PhotoLibraryPlugin.swift and PhotoLibraryPlugin.m"
    echo "4. Check 'Copy items if needed' and 'App' target"
    echo "5. Click 'Add'"
fi
