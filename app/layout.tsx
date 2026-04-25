import type { Metadata } from 'next';
import '@xyflow/react/dist/style.css';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}