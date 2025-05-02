// src/app/assessment/[type]/standard-results/[id]/page.tsx
import Link from 'next/link';

export default function StandardResultsPage({ params }: { params: { type: string, id: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
          <h1 className="text-2xl font-bold">Assessment Received</h1>
          <p className="opacity-80">Your assessment has been received and is being processed</p>
        </div>
        
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-green-500 text-4xl">✓</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Thank You for Your Submission</h2>
          
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-gray-700 mb-6">
              Your assessment has been received and is being reviewed by our expert analysis team.
            </p>
            
            <div className="bg-blue-50 p-6 rounded-lg text-left mb-8">
              <h3 className="font-bold text-blue-800 mb-3">What Happens Next?</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 text-xl">•</span>
                  <span>Our expert team is carefully reviewing your assessment responses</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 text-xl">•</span>
                  <span>A comprehensive report will be prepared based on your answers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 text-xl">•</span>
                  <span>Your personalized report will be sent to your email within 3-5 working days</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 text-xl">•</span>
                  <span>You can also check back here or in your dashboard to view your results</span>
                </li>
              </ul>
            </div>
          </div>
          
          <Link 
            href="/dashboard" 
            className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-medium"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}