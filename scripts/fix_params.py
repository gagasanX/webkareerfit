#!/usr/bin/env python3
import re
import sys
import os
from typing import List, Dict, Tuple
from pathlib import Path

def is_client_component(content: str) -> bool:
    return "'use client'" in content or '"use client"' in content

def find_params_usage(content: str) -> List[str]:
    """Find all unique params?.something patterns in the code."""
    pattern = r'params\?\.(\w+)'
    return list(set(re.findall(pattern, content)))

def has_params_import(content: str) -> bool:
    """Check if useParams is already imported."""
    return 'useParams' in content and 'next/navigation' in content

def has_params_declaration(content: str) -> bool:
    """Check if params is already declared via useParams or props."""
    return bool(re.search(r'const\s+params\s*=\s*useParams\(\)', content) or
               re.search(r'{\s*params\s*}:\s*{\s*params:', content))

def add_use_params_import(content: str) -> str:
    """Add useParams import if needed."""
    if not has_params_import(content):
        import_line = "import { useParams } from 'next/navigation';\n"
        # Try to add after 'use client' if it exists
        if "'use client'" in content or '"use client"' in content:
            content = re.sub(r"('use client'|\"use client\")\s*;?\n",
                           r"\1;\n" + import_line, content)
        else:
            # Add at the top of other imports
            content = import_line + content
    return content

def fix_client_component(content: str, params_list: List[str]) -> str:
    """Fix a client component by adding useParams hook and extracting variables."""
    if not has_params_declaration(content):
        # Find function declaration
        function_match = re.search(r'(export\s+default\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*{', content)
        if function_match:
            # Add params declaration right after function start
            params_decl = "\n  const params = useParams();\n"
            variables_decl = "".join([f"  const {param} = params?.{param} as string;\n" 
                                    for param in params_list])
            insert_pos = function_match.end()
            content = content[:insert_pos] + params_decl + variables_decl + content[insert_pos:]
    
    # Replace params?.x with x
    for param in params_list:
        content = re.sub(rf'params\?\.{param}(?=[\s),;]|$)', param, content)
    
    return content

def fix_server_component(content: str, params_list: List[str]) -> str:
    """Fix a server component by adding params prop with Promise type."""
    # Find function declaration
    func_pattern = r'(export\s+default\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)'
    func_match = re.search(func_pattern, content)
    
    if func_match:
        # Build params interface
        params_type = "{ " + ", ".join(f"{param}: string" for param in params_list) + " }"
        params_prop = f"{{ params }}: {{ params: Promise<{params_type}> }}"
        
        # Replace function signature
        new_sig = f"{func_match.group(1) or ''}async function {func_match.group(2)}({params_prop})"
        content = content[:func_match.start()] + new_sig + content[func_match.end():]
        
        # Add params extraction
        params_decl = f"\n  const {{ {', '.join(params_list)} }} = await params;\n"
        content = content.replace('{', '{' + params_decl, 1)
        
        # Replace params?.x with x
        for param in params_list:
            content = re.sub(rf'params\?\.{param}(?=[\s),;]|$)', param, content)
    
    return content

def fix_file(filepath: str) -> Tuple[bool, List[str]]:
    """Fix params usage in a file. Returns (was_modified, params_fixed)."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'params?' not in content:
            return False, []
        
        original_content = content
        params_list = find_params_usage(content)
        
        if not params_list:
            return False, []
            
        if is_client_component(content):
            content = add_use_params_import(content)
            content = fix_client_component(content, params_list)
        else:
            content = fix_server_component(content, params_list)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, params_list
            
        return False, []
        
    except Exception as e:
        print(f"Error processing {filepath}: {str(e)}", file=sys.stderr)
        return False, []

def main():
    """Main function to process all TypeScript/TSX files."""
    workspace_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    
    files_fixed = []
    total_params_fixed = set()
    
    for root, _, files in os.walk(workspace_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx')) and not file.endswith('.d.ts'):
                filepath = os.path.join(root, file)
                
                was_modified, params_fixed = fix_file(filepath)
                if was_modified:
                    files_fixed.append((filepath, params_fixed))
                    total_params_fixed.update(params_fixed)
    
    # Print summary
    print("\n=== Summary of Fixes ===")
    print(f"Files modified: {len(files_fixed)}")
    print(f"Total unique params fixed: {len(total_params_fixed)}")
    print("\nDetailed changes:")
    for filepath, params in files_fixed:
        rel_path = os.path.relpath(filepath, workspace_dir)
        print(f"\n{rel_path}:")
        print(f"  Fixed params: {', '.join(params)}")

if __name__ == '__main__':
    main()
