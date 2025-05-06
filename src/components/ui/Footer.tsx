import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white py-6 text-center text-sm text-gray-500 border-t border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex justify-center space-x-5 mb-3">
        </div>
        <p>
          &copy; {new Date().getFullYear()} KareerFit. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}