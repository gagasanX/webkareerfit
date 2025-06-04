// /src/app/assessment/[type]/results/[id]/page.tsx
import { ResultsClient } from './ResultsClient';

// CRITICAL FIX: Proper Next.js 15 async params handling
export default async function ResultsPage({ 
  params 
}: {
  params: Promise<{ type: string; id: string }>
}) {
  // FIXED: Properly await params for Next.js 15
  const resolvedParams = await params;
  const { type, id } = resolvedParams;
  
  // This page shows assessment results - rendering client component with props
  return <ResultsClient assessmentType={type} assessmentId={id} />;
}