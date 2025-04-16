#!/bin/bash
# Cari semua route.ts files
find src/app -name "route.ts" | xargs sed -i 's/{ params }: { params: Params }/context: { params: { id: string } }/g'
find src/app -name "route.ts" | xargs sed -i 's/import { Params } from.*//g'

# Cari semua route.ts dalam direktori [id]
find src/app -path "*/[id]/route.ts" | xargs sed -i 's/{ params }: { params: Params }/context: { params: { id: string } }/g'
find src/app -path "*/[id]/route.ts" | xargs sed -i 's/import { Params } from.*//g'
