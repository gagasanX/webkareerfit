// src/components/AssessmentDebugHelper.tsx
interface AssessmentDebugHelperProps {
  assessmentId: string;
  assessmentType: string;
  currentTier: string;
}

export default function AssessmentDebugHelper({ 
  assessmentId, 
  assessmentType, 
  currentTier 
}: AssessmentDebugHelperProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-sm font-semibold text-yellow-800">Debug Info</h3>
      <p className="text-xs text-yellow-700">ID: {assessmentId}</p>
      <p className="text-xs text-yellow-700">Type: {assessmentType}</p>
      <p className="text-xs text-yellow-700">Tier: {currentTier}</p>
    </div>
  );
}