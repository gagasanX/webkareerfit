#!/bin/bash

# Tetapkan warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Memulakan pembetulan useSearchParams untuk semua fail...${NC}"

# Senarai fail yang perlu diperbaiki
FILES_TO_FIX=(
  "src/app/payment/status/page.tsx"
  "src/app/assessment/page.tsx"
)

for file in "${FILES_TO_FIX[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${YELLOW}Memproses: ${file}${NC}"
    
    # Buat backup
    cp "$file" "${file}.bak"
    
    # Baca kandungan fail
    content=$(cat "$file")
    
    # Periksa jika sudah ada import Suspense
    if ! grep -q "import.*Suspense" "$file"; then
      # Tambah import Suspense
      content=$(echo "$content" | sed 's/import React, { /import React, { Suspense, /g')
      content=$(echo "$content" | sed 's/import { /import { Suspense, /g')
      content=$(echo "$content" | sed 's/import React from/import React, { Suspense } from/g')
      
      # Jika masih tiada, tambah import secara manual
      if ! echo "$content" | grep -q "Suspense"; then
        content=$(echo "$content" | sed 's/'\''use client'\'';/'\''use client'\'\';\n\nimport { Suspense } from '\''react'\'';/g')
      fi
    fi
    
    # Dapatkan nama komponen utama
    component_name=$(echo "$content" | grep -o "export default function [a-zA-Z0-9_]*" | sed 's/export default function //')
    
    if [ -z "$component_name" ]; then
      component_name=$(basename "$file" | sed 's/\.tsx//' | sed 's/\.jsx//' | sed 's/\.js//' | sed 's/page/Page/')
      component_name="${component_name^}Page" # Kapitalisasi huruf pertama
    fi
    
    client_component="${component_name}Client"
    fallback_component="${component_name}Fallback"
    
    # Buat komponen client dan fallback
    echo -e "${GREEN}Membuat komponen client: ${client_component}${NC}"
    
    # Tulis ke fail baru
    cat > "$file.new" << EOFNEW
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Import semua dependencies yang diperlukan - anda mungkin perlu mengemaskinikan ini

// Komponen Client yang menggunakan useSearchParams
function ${client_component}() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pindahkan logic dari komponen utama ke sini
  
  return (
    <div>
      {/* Pindahkan rendering UI dari komponen utama ke sini */}
      <p>Kandungan komponen client</p>
    </div>
  );
}

// Komponen Fallback untuk Suspense
function ${fallback_component}() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-40 bg-gray-200 rounded mb-4"></div>
      <div className="h-20 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

export default function ${component_name}() {
  return (
    <div>
      <h1>${component_name}</h1>
      <Suspense fallback={<${fallback_component} />}>
        <${client_component} />
      </Suspense>
    </div>
  );
}
EOFNEW
    
    echo -e "${GREEN}Template untuk ${file} telah dibuat.${NC}"
    echo -e "${YELLOW}Anda perlu mengedit fail ${file}.new dan memindahkan logik dari fail asal ${file}.bak${NC}"
    echo -e "${YELLOW}Setelah selesai, gantikan fail asal dengan:${NC}"
    echo -e "${YELLOW}mv ${file}.new ${file}${NC}"
    echo ""
  else
    echo -e "${RED}Fail tidak dijumpai: ${file}${NC}"
  fi
done

echo -e "${GREEN}Pembetulan useSearchParams selesai.${NC}"
echo -e "${YELLOW}Anda perlu:${NC}"
echo -e "${YELLOW}1. Edit setiap fail .new untuk memindahkan logik dari fail .bak${NC}"
echo -e "${YELLOW}2. Semak dan pastikan semua import dan dependencies yang diperlukan telah disertakan${NC}"
echo -e "${YELLOW}3. Gantikan fail asal dengan fail .new yang telah dikemaskinikan${NC}"
echo -e "${YELLOW}4. Jalankan build semula: npm run build${NC}"
