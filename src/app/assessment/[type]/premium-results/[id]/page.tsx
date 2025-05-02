// src/app/assessment/[type]/premium-results/[id]/page.tsx
import Link from 'next/link';

export default function PremiumResultsPage({ params }: { params: { type: string, id: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
          <h1 className="text-2xl font-bold">Premium Assessment Received</h1>
          <p className="opacity-80">Your premium assessment package is being processed</p>
        </div>
        
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-purple-500 text-4xl">⭐</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Thank You for Choosing Our Premium Package</h2>
          
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-gray-700 mb-6">
              Your premium assessment has been received. Our team is preparing for your personalized consultation and in-depth analysis.
            </p>
            
            <div className="bg-purple-50 p-6 rounded-lg text-left mb-8">
              <h3 className="font-bold text-purple-800 mb-3">Your Premium Experience Includes:</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-purple-500 mr-3 text-xl">•</span>
                  <span>Our analysis team will contact you within 2 business days to schedule your 20-minute consultation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-3 text-xl">•</span>
                  <span>During your consultation, we'll discuss your unique career situation and goals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-3 text-xl">•</span>
                  <span>After your consultation, you'll receive a comprehensive analysis report within 3-5 working days</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-3 text-xl">•</span>
                  <span>You'll have priority email support for 30 days after receiving your report</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-8">
              <p className="text-yellow-800 font-medium">
                We'll be reaching out to you via the email address associated with your account to schedule your consultation.
              </p>
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