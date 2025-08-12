import { CareerSuggesterClient } from '@/components/career/CareerSuggesterClient';

export default function CareerSuggesterPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Find Your Career Path in 3 Minutes
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-600">
            Whether you're starting out or looking to advance, our AI will help you explore your next steps
          </p>
        </div>
        <CareerSuggesterClient />
      </div>
    </main>
  );
}