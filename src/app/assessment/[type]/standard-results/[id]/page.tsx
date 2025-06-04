// src/app/assessment/[type]/standard-results/[id]/page.tsx
import Link from 'next/link';

export default function StandardResultsPage({ params }: { params: { type: string, id: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
          <h1 className="text-2xl font-bold">Standard Assessment Received</h1>
          <p className="opacity-80">Your detailed report package is being prepared</p>
        </div>
        
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-blue-500 text-4xl">📋</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Thank You for Choosing Standard Package</h2>
          
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-gray-700 mb-6">
              Your RM100 standard assessment has been received. You'll get a <strong>comprehensive detailed report</strong> with personalized recommendations.
            </p>
            
            <div className="bg-blue-50 p-6 rounded-lg text-left mb-8">
              <h3 className="font-bold text-blue-800 mb-3">What You'll Receive:</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                  <div>
                    <h4 className="font-semibold text-blue-700">Expert Review Process (3-5 days)</h4>
                    <p className="text-gray-600">Our career analysts will carefully review your assessment responses</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                  <div>
                    <h4 className="font-semibold text-blue-700">Detailed Personality Assessment</h4>
                    <p className="text-gray-600">In-depth analysis of your career personality and working style</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                  <div>
                    <h4 className="font-semibold text-blue-700">Comprehensive Career Recommendations</h4>
                    <p className="text-gray-600">Specific career paths that match your skills and interests</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mr-4 mt-1">4</div>
                  <div>
                    <h4 className="font-semibold text-blue-700">Personalized Development Plan</h4>
                    <p className="text-gray-600">Step-by-step action plan for your career advancement</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Standard vs Basic comparison */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-8">
              <h3 className="font-bold text-green-800 mb-3">Standard Package Benefits:</h3>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">All Basic Analysis features</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Detailed personality assessment</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Expert human review</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Development path suggestions</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Personalized action plan</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Industry-specific insights</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-8">
              <p className="text-yellow-800 font-medium">
                📬 Your comprehensive report will be sent to your email within 3-5 working days.
              </p>
            </div>
            
            <div className="bg-blue-100 p-4 rounded-lg border border-blue-200 mb-8">
              <h4 className="font-semibold text-blue-800 mb-2">Want More Personalized Guidance?</h4>
              <p className="text-blue-700 text-sm">
                Consider upgrading to our Premium Package (RM250) which includes a 20-minute personal interview session with our career consultant for even more tailored advice.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/dashboard" 
              className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Return to Dashboard
            </Link>
            <Link 
              href="/contact" 
              className="bg-white text-[#7e43f1] border border-[#7e43f1] px-6 py-3 rounded-lg hover:bg-purple-50 transition-all font-medium"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}