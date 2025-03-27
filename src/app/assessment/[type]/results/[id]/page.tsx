// Server component
import { ResultsClient } from './ResultsClient';

export default function ResultsPage({ params }: {
  params: { type: string; id: string }
}) {
  const { type, id } = params;
  
  // This page shows assessment results - rendering client component with props
  return <ResultsClient assessmentType={type} assessmentId={id} />;
}