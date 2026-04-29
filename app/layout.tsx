import type { Metadata } from 'next';
import '@xyflow/react/dist/style.css';
import './globals.css';
import { ClerkAuthProvider } from '../lib/clerk-provider';

export const metadata: Metadata = {
  title: 'Nextflow',
  description: 'A production-ready workflow builder for Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkAuthProvider>{children}</ClerkAuthProvider>
      </body>
    </html>
  );
}