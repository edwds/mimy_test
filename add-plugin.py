#!/usr/bin/env python3
import sys
import uuid
import shutil
from pathlib import Path

print("🔧 Adding PhotoLibrary plugin to Xcode project...")

PROJECT_DIR = Path("/Users/catchtable/mimy_test")
XCODE_PROJECT = PROJECT_DIR / "ios/App/App.xcodeproj/project.pbxproj"

# Check if files exist
swift_file = PROJECT_DIR / "ios/App/App/PhotoLibraryPlugin.swift"
objc_file = PROJECT_DIR / "ios/App/App/PhotoLibraryPlugin.m"

if not swift_file.exists():
    print(f"❌ PhotoLibraryPlugin.swift not found at {swift_file}")
    sys.exit(1)

if not objc_file.exists():
    print(f"❌ PhotoLibraryPlugin.m not found at {objc_file}")
    sys.exit(1)

print("✅ Plugin files found")

# Backup project file
shutil.copy(XCODE_PROJECT, str(XCODE_PROJECT) + ".backup")
print("✅ Backed up project file")

# Read project file
with open(XCODE_PROJECT, 'r') as f:
    content = f.read()

# Generate UUIDs for the new files
swift_uuid = uuid.uuid4().hex[:24].upper()
objc_uuid = uuid.uuid4().hex[:24].upper()
swift_build_uuid = uuid.uuid4().hex[:24].upper()
objc_build_uuid = uuid.uuid4().hex[:24].upper()

# Find the PBXGroup section for App folder
app_group_marker = "/* App */ ="
if app_group_marker not in content:
    print("❌ Could not find App group in project")
    sys.exit(1)

# Find PBXFileReference section
file_ref_section = "/* Begin PBXFileReference section */"
file_ref_end = "/* End PBXFileReference section */"

# Find PBXBuildFile section
build_file_section = "/* Begin PBXBuildFile section */"
build_file_end = "/* End PBXBuildFile section */"

# Find PBXSourcesBuildPhase section
sources_section = "/* Begin PBXSourcesBuildPhase section */"

# Add file references
swift_file_ref = f"\t\t{swift_uuid} /* PhotoLibraryPlugin.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = PhotoLibraryPlugin.swift; sourceTree = \"<group>\"; }};\n"
objc_file_ref = f"\t\t{objc_uuid} /* PhotoLibraryPlugin.m */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; path = PhotoLibraryPlugin.m; sourceTree = \"<group>\"; }};\n"

# Add build files
swift_build_file = f"\t\t{swift_build_uuid} /* PhotoLibraryPlugin.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {swift_uuid} /* PhotoLibraryPlugin.swift */; }};\n"
objc_build_file = f"\t\t{objc_build_uuid} /* PhotoLibraryPlugin.m in Sources */ = {{isa = PBXBuildFile; fileRef = {objc_uuid} /* PhotoLibraryPlugin.m */; }};\n"

# Insert file references
file_ref_insert_pos = content.find(file_ref_end)
if file_ref_insert_pos == -1:
    print("❌ Could not find PBXFileReference section")
    sys.exit(1)

content = content[:file_ref_insert_pos] + swift_file_ref + objc_file_ref + content[file_ref_insert_pos:]

# Insert build files
build_file_insert_pos = content.find(build_file_end)
if build_file_insert_pos == -1:
    print("❌ Could not find PBXBuildFile section")
    sys.exit(1)

content = content[:build_file_insert_pos] + swift_build_file + objc_build_file + content[build_file_insert_pos:]

# Add files to App group
# Find the App group's children array
app_group_start = content.find(app_group_marker)
if app_group_start == -1:
    print("❌ Could not find App group")
    sys.exit(1)

# Find the children array within this group
children_start = content.find("children = (", app_group_start)
if children_start == -1:
    print("❌ Could not find children array in App group")
    sys.exit(1)

children_end = content.find(");", children_start)
if children_end == -1:
    print("❌ Could not find end of children array")
    sys.exit(1)

# Insert our files before the closing parenthesis
swift_child = f"\t\t\t\t{swift_uuid} /* PhotoLibraryPlugin.swift */,\n"
objc_child = f"\t\t\t\t{objc_uuid} /* PhotoLibraryPlugin.m */,\n"

content = content[:children_end] + swift_child + objc_child + content[children_end:]

# Add to Sources build phase
# Find the first PBXSourcesBuildPhase files array
sources_start = content.find(sources_section)
if sources_start == -1:
    print("❌ Could not find PBXSourcesBuildPhase section")
    sys.exit(1)

files_start = content.find("files = (", sources_start)
if files_start == -1:
    print("❌ Could not find files array in Sources build phase")
    sys.exit(1)

files_end = content.find(");", files_start)
if files_end == -1:
    print("❌ Could not find end of files array")
    sys.exit(1)

swift_source = f"\t\t\t\t{swift_build_uuid} /* PhotoLibraryPlugin.swift in Sources */,\n"
objc_source = f"\t\t\t\t{objc_build_uuid} /* PhotoLibraryPlugin.m in Sources */,\n"

content = content[:files_end] + swift_source + objc_source + content[files_end:]

# Write modified content
with open(XCODE_PROJECT, 'w') as f:
    f.write(content)

print("✅ Successfully added plugin to Xcode project")
print("")
print("Next steps:")
print("1. Open Xcode: npx cap open ios")
print("2. Clean build: Product > Clean Build Folder (⇧⌘K)")
print("3. Build: Product > Build (⌘B)")
