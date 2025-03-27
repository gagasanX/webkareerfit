import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <Link href="/about" className="text-gray-400 hover:text-gray-500">
            Tentang Kami
          </Link>
          <Link href="/contact" className="text-gray-400 hover:text-gray-500">
            Hubungi Kami
          </Link>
          <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-500">
            Dasar Privasi
          </Link>
          <Link href="/terms" className="text-gray-400 hover:text-gray-500">
            Terma Penggunaan
          </Link>
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center text-xs leading-5 text-gray-500">
            &copy; {new Date().getFullYear()} Kareerfit. Hak Cipta Terpelihara.
          </p>
        </div>
      </div>
    </footer>
  );
}