#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Next.js 15 Migration Tool ===${NC}"

# Check requirements
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required${NC}"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in a Node.js project directory${NC}"
    exit 1
fi

# Create backup of entire project
timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="../webkareerfit_backup_$timestamp"
echo -e "\n${YELLOW}Creating full project backup at: $backup_dir${NC}"
cp -r . "$backup_dir"

# Run migration script
echo -e "\n${BLUE}Running migration script...${NC}"
python3 scripts/migrate-next15.py

# Verification steps
echo -e "\n${BLUE}Verifying migration...${NC}"

# 1. Check for remaining non-Promise params
echo "Checking for non-Promise params..."
remaining_params=$(find src/app -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "params: { [^P]")
if [ ! -z "$remaining_params" ]; then
    echo -e "${YELLOW}Warning: Found files that might need manual review:${NC}"
    echo "$remaining_params"
fi

# 2. Check for missing useParams imports in client components
echo "Checking client components..."
client_files=$(find src/app -type f -name "*.tsx" | xargs grep -l "'use client'")
for file in $client_files; do
    if ! grep -q "useParams" "$file"; then
        echo -e "${YELLOW}Warning: Client component might need useParams: $file${NC}"
    fi
done

# 3. Check for proper async/await usage
echo "Checking async/await usage..."
async_issues=$(find src/app -type f -name "route.ts" | xargs grep -l "const.*params" | xargs grep -L "await params")
if [ ! -z "$async_issues" ]; then
    echo -e "${YELLOW}Warning: Files might need await for params:${NC}"
    echo "$async_issues"
fi

echo -e "\n${GREEN}Migration complete!${NC}"
echo -e "${BLUE}To rollback:${NC}"
echo "1. Remove all changes: cp -r $backup_dir/* ."
echo "2. Or restore individual files from nextjs15_migration_backup directory"
