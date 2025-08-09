// /src/components/ui/LoadingScreen.tsx

'use client';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Processing...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75 backdrop-blur-sm">
      <div className="text-center">
        {/* Spinner */}
        <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin mx-auto"></div>
        
        {/* Message */}
        <p className="mt-4 text-white text-lg font-medium">
          {message}
        </p>
        <p className="mt-1 text-white text-opacity-80">
          Please do not close this window.
        </p>
      </div>
    </div>
  );
}