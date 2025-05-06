import Providers from './providers';
import './globals.css';
import ActivityMonitor from '@/components/ActivityMonitor';
import GrammarlyAttributesCleaner from '@/components/GrammarlyAttributesCleaner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="grammarly-disable-extension" content="true" />
      </head>
      <body>
        <Providers>
          <ActivityMonitor />
          <GrammarlyAttributesCleaner />
          {children}
        </Providers>
      </body>
    </html>
  );
}