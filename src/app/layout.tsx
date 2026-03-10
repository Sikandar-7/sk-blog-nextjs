import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', weight: ['300', '400', '500', '600', '700', '800'] });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['700', '800'] });

export const metadata: Metadata = {
  title: { default: 'SK Blog — Tech & Code', template: '%s | SK Blog' },
  description: 'A headless WordPress blog powered by Next.js. Tutorials, code snippets and insights by Sikandar Abbas.',
  keywords: ['WordPress', 'Next.js', 'Blog', 'Web Development'],
  authors: [{ name: 'Sikandar Abbas' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${fraunces.variable}`}>
      <body>
        <Navbar />
        <main className="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
