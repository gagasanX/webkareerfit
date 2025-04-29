'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DebugHelperProps {
  assessmentId: string;
  assessmentType: string;
  currentTier?: string;
}

export default function AssessmentDebugHelper({ 
  assessmentId, 
  assessmentType,
  currentTier = 'basic' 
}: DebugHelperProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Add debug log function
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)}: ${message}`]);
  };

  useEffect(() => {
    addLog(`Component initialized with assessmentId: ${assessmentId}, type: ${assessmentType}, tier: ${currentTier}`);
  }, [assessmentId, assessmentType, currentTier]);

  // Simple direct approach to update tier
  const updateTier = async (tier: string) => {
    addLog(`Attempting to update tier to: ${tier}`);
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/assessment/${assessmentType}/${assessmentId}/update-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tier: tier,
          manualProcessing: tier === 'standard' || tier === 'premium'
        }),
      });
      
      const data = await response.json();
      addLog(`API Response: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        addLog(`Error: ${data.message || 'Unknown error'}`);
        throw new Error(data.message || 'Error updating tier');
      }
      
      addLog('Tier updated successfully!');
      return true;
    } catch (error) {
      addLog(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct approach to payment
  const goToPayment = () => {
    addLog('Redirecting to payment page directly...');
    router.push(`/payment/${assessmentId}`);
  };

  // Combined approach
  const updateAndGoToPayment = async () => {
    addLog('Starting update & redirect flow...');
    const success = await updateTier(selectedTier);
    if (success) {
      addLog('Update successful, redirecting...');
      goToPayment();
    } else {
      addLog('Update failed, not redirecting');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
      <h2 className="text-xl font-bold mb-4">Assessment Debug Helper</h2>
      
      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          {['basic', 'standard', 'premium'].map(tier => (
            <button 
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded ${
                selectedTier === tier ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={() => updateTier(selectedTier)}
            disabled={isProcessing}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Step 1: Update Tier Only
          </button>
          
          <button
            onClick={goToPayment}
            disabled={isProcessing}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Step 2: Go To Payment Only
          </button>
          
          <button
            onClick={updateAndGoToPayment}
            disabled={isProcessing}
            className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Combined: Update & Go To Payment
          </button>
        </div>
      </div>
      
      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto h-40">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}