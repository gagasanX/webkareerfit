#!/usr/bin/env python3

import re
import sys
import os
from pathlib import Path
import shutil
from datetime import datetime

def process_file(file_path):
    """Process a single route.ts file for Next.js 15 migration."""
    with open(file_path, 'r') as f:
        content = f.read()

    # Pattern to match the old route handler params
    old_pattern = r'{\s*params\s*}:\s*{\s*params:\s*Promise<[^>]+>}'
    
    # Replace with new format
    new_content = re.sub(
        old_pattern,
        lambda m: m.group(0).replace('Promise<', '').replace('>', ''),
        content
    )
    
    # Remove await from params access
    new_content = re.sub(
        r'await\s+params',
        'params',
        new_content
    )

    return new_content

def backup_file(file_path, backup_dir):
    """Create a backup of the file."""
    backup_path = Path(backup_dir) / f"{file_path.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"📑 Backed up: {file_path} -> {backup_path}")

def main():
    # Find all route.ts files in dynamic routes
    app_dir = Path('src/app')
    if not app_dir.exists():
        app_dir = Path('app')
        if not app_dir.exists():
            print("❌ No app directory found!")
            sys.exit(1)

    # Create backup directory
    backup_dir = Path(f"route_migration_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup_dir.mkdir(exist_ok=True)
    print(f"📁 Created backup directory: {backup_dir}")

    # Process files
    route_files = list(app_dir.rglob('**/[[]*/route.ts'))
    if not route_files:
        print("❌ No dynamic route files found!")
        sys.exit(1)

    print(f"\n🔍 Found {len(route_files)} dynamic route files:")
    for file in route_files:
        print(f"  └─ {file}")

    # Confirm with user
    if input("\n⚠️ Proceed with migration? (y/N): ").lower() != 'y':
        print("Migration cancelled")
        sys.exit(0)

    # Process each file
    success_count = 0
    for file_path in route_files:
        try:
            print(f"\n🔄 Processing: {file_path}")
            
            # Backup original file
            backup_file(file_path, backup_dir)
            
            # Process file
            new_content = process_file(file_path)
            
            # Write changes
            with open(file_path, 'w') as f:
                f.write(new_content)
            
            success_count += 1
            print(f"✅ Successfully migrated: {file_path}")
            
        except Exception as e:
            print(f"❌ Error processing {file_path}: {str(e)}")

    # Summary
    print(f"\n📊 Migration Summary:")
    print(f"  ├─ Total files: {len(route_files)}")
    print(f"  ├─ Successfully migrated: {success_count}")
    print(f"  ├─ Failed: {len(route_files) - success_count}")
    print(f"  └─ Backup directory: {backup_dir}")

if __name__ == "__main__":
    print("🚀 Next.js 15 Dynamic Routes Migration Tool")
    print("==========================================")
    main()
