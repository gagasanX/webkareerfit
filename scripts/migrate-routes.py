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

    # Patterns to match and replace
    patterns = [
        # Fix Promise<params> pattern
        (
            r'{\s*params\s*}:\s*{\s*params:\s*Promise<([^>]+)>}',
            lambda m: f'context: {{ params: {m.group(1)} }}'
        ),
        # Fix direct params destructuring
        (
            r'{\s*params\s*}:\s*{\s*params:\s*{\s*([^}]+)\s*}\s*}',
            lambda m: f'context: {{ params: {{ {m.group(1)} }} }}'
        ),
        # Fix params access
        (
            r'const\s*{\s*([^}]+)\s*}\s*=\s*(?:await\s+)?params',
            lambda m: f'const {{ {m.group(1)} }} = context.params'
        ),
        # Remove await from params
        (
            r'await\s+params',
            'params'
        )
    ]
    
    new_content = content
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, new_content)

    return new_content

def backup_file(file_path, backup_dir):
    """Create a backup of the file."""
    backup_path = Path(backup_dir) / f"{file_path.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"📑 Backed up: {file_path} -> {backup_path}")

def main():
    # Check for --dry-run flag
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("🔍 Running in dry-run mode - no files will be modified")

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
            
            if dry_run:
                # Show diff in dry-run mode
                from difflib import unified_diff
                with open(file_path, 'r') as f:
                    old_content = f.read()
                diff = list(unified_diff(
                    old_content.splitlines(keepends=True),
                    new_content.splitlines(keepends=True),
                    fromfile=str(file_path),
                    tofile=f"{file_path} (after migration)"
                ))
                if diff:
                    print("\n" + "".join(diff))
                else:
                    print("No changes needed")
            else:
                # Write changes in normal mode
                with open(file_path, 'w') as f:
                    f.write(new_content)
            
            success_count += 1
            print(f"✅ {'Analyzed' if dry_run else 'Migrated'}: {file_path}")
            
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
