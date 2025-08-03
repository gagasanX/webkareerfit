#!/usr/bin/env python3

import os
import re
import sys
import shutil
from pathlib import Path
from datetime import datetime
import json

# ANSI colors for output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(message, status_type="info"):
    colors = {
        "info": Colors.BLUE,
        "success": Colors.GREEN,
        "warning": Colors.WARNING,
        "error": Colors.FAIL
    }
    color = colors.get(status_type, Colors.BLUE)
    print(f"{color}[{status_type.upper()}]{Colors.ENDC} {message}")

def create_backup(file_path: Path, backup_dir: Path) -> None:
    """Create a backup of the file with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"{file_path.name}_{timestamp}.bak"
    shutil.copy2(file_path, backup_path)
    return backup_path

def fix_route_handler(content: str) -> str:
    """Fix route.ts files for Next.js 15."""
    
    # Remove interface definitions
    content = re.sub(
        r'interface\s+(?:Route)?Params\s*{[^}]*}',
        '',
        content,
        flags=re.MULTILINE
    )

    # Fix function signatures with various param patterns
    patterns = [
        (r'\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*([^}]+)\}\s*\}',
         r'{ params }: { params: Promise<{\1}> }'),
        (r'\{\s*params\s*\}:\s*(?:Route)?Params',
         r'{ params }: { params: Promise<{ id: string }> }'),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)

    # Fix params access
    content = re.sub(
        r'const\s*\{([^}]+)\}\s*=\s*params;',
        r'const {\1} = await params;',
        content
    )

    # Fix direct params access in catch blocks
    content = re.sub(
        r'params\.(\w+)',
        r'(await params).\1',
        content
    )

    return content

def fix_server_page(content: str) -> str:
    """Fix server-side page.tsx files for Next.js 15."""
    
    # Add async to the Page function if not present
    content = re.sub(
        r'(export\s+default\s+)function\s+Page',
        r'\1async function Page',
        content
    )

    # Fix params type
    content = re.sub(
        r'\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*([^}]+)\}\s*\}',
        r'{ params }: { params: Promise<{\1}> }',
        content
    )

    # Fix params access
    content = re.sub(
        r'const\s*\{([^}]+)\}\s*=\s*params;',
        r'const {\1} = await params;',
        content
    )

    return content

def fix_client_page(content: str) -> str:
    """Fix client-side page.tsx files for Next.js 15."""
    
    if "'use client'" not in content and '"use client"' not in content:
        return content

    # Add useParams import if not present
    if 'useParams' not in content:
        imports = re.search(r'(import[^;]+;\n)+', content)
        if imports:
            content = content.replace(
                imports.group(0),
                f"{imports.group(0)}import {{ useParams }} from 'next/navigation';\n"
            )
        else:
            content = "import { useParams } from 'next/navigation';\n" + content

    # Remove params from function signature and add useParams hook
    content = re.sub(
        r'export\s+default\s+function\s+Page\s*\(\{\s*params\s*\}:[^)]+\)',
        'export default function Page()',
        content
    )

    # Add useParams hook if not present
    if 'useParams()' not in content:
        page_function = re.search(r'export\s+default\s+function\s+Page\s*\([^)]*\)\s*{', content)
        if page_function:
            indent = re.search(r'^\s+', content[page_function.end():], re.MULTILINE)
            indent = indent.group(0) if indent else '  '
            content = content.replace(
                page_function.group(0),
                f"{page_function.group(0)}\n{indent}const params = useParams();"
            )

    # Fix params access to use optional chaining
    content = re.sub(
        r'params\.(\w+)',
        r'params?.\1',
        content
    )

    return content

def process_file(file_path: Path, backup_dir: Path) -> dict:
    """Process a single file and return stats."""
    result = {"status": "unchanged", "backup": None, "changes": []}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        original_content = f.read()
    
    new_content = original_content
    
    # Determine file type and apply appropriate fixes
    if file_path.name == 'route.ts':
        new_content = fix_route_handler(new_content)
    elif file_path.name == 'page.tsx':
        if "'use client'" in new_content or '"use client"' in new_content:
            new_content = fix_client_page(new_content)
        else:
            new_content = fix_server_page(new_content)
    
    if new_content != original_content:
        # Create backup before making changes
        backup_path = create_backup(file_path, backup_dir)
        result["backup"] = str(backup_path)
        
        # Write changes
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        result["status"] = "modified"
    
    return result

def find_files(base_path: Path) -> tuple[list[Path], list[Path]]:
    """Find all relevant files to process."""
    route_files = []
    page_files = []
    
    for path in base_path.rglob('**/[[]*/route.ts'):
        route_files.append(path)
    
    for path in base_path.rglob('**/[[]*/page.tsx'):
        page_files.append(path)
    
    return route_files, page_files

def main():
    print_status(f"{Colors.HEADER}Next.js 15 Migration Tool{Colors.ENDC}")
    print_status("Starting migration process...", "info")
    
    # Create backup directory
    backup_dir = Path('nextjs15_migration_backup') / datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir.mkdir(parents=True, exist_ok=True)
    print_status(f"Created backup directory: {backup_dir}", "info")
    
    # Find all files to process
    src_dir = Path('src/app')
    if not src_dir.exists():
        src_dir = Path('app')
        if not src_dir.exists():
            print_status("No app directory found!", "error")
            sys.exit(1)
    
    route_files, page_files = find_files(src_dir)
    
    if not route_files and not page_files:
        print_status("No files to process!", "warning")
        sys.exit(0)
    
    print_status(f"Found {len(route_files)} route files and {len(page_files)} page files", "info")
    
    # Process files and collect results
    results = {
        "timestamp": datetime.now().isoformat(),
        "backup_dir": str(backup_dir),
        "modified_files": [],
        "errors": []
    }
    
    for file_path in route_files + page_files:
        try:
            print_status(f"Processing: {file_path}", "info")
            result = process_file(file_path, backup_dir)
            
            if result["status"] == "modified":
                results["modified_files"].append({
                    "path": str(file_path),
                    "backup": result["backup"],
                    "type": "route" if file_path.name == "route.ts" else "page"
                })
        except Exception as e:
            print_status(f"Error processing {file_path}: {str(e)}", "error")
            results["errors"].append({
                "path": str(file_path),
                "error": str(e)
            })
    
    # Save results
    with open(backup_dir / 'migration_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print_status("\nMigration Summary:", "info")
    print(f"Total files processed: {len(route_files) + len(page_files)}")
    print(f"Files modified: {len(results['modified_files'])}")
    print(f"Errors: {len(results['errors'])}")
    print(f"\nBackup directory: {backup_dir}")
    
    if results["errors"]:
        print_status("\nErrors occurred during migration:", "error")
        for error in results["errors"]:
            print(f"- {error['path']}: {error['error']}")
    
    print_status("\nTo rollback changes:", "info")
    print(f"1. Check migration_results.json in {backup_dir}")
    print("2. For each modified file, copy its backup version back")
    print(f"3. Or use: for f in {backup_dir}/*.bak; do cp \"$f\" \"$(echo $f | sed 's/_[0-9]*\.bak$//')\" ; done")

if __name__ == "__main__":
    main()
