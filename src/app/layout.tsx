import Providers from './providers';
import './globals.css';
import ActivityMonitor from '@/components/ActivityMonitor';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ActivityMonitor />
          {children}
        </Providers>
      </body>
    </html>
  );
}