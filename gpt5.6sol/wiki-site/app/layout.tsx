import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { siteAssetUrl } from '@/lib/asset-url.mjs';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: process.env.WIKI_SITE_ORIGIN ? new URL(process.env.WIKI_SITE_ORIGIN) : undefined,
  icons: { icon: siteAssetUrl('/favicon.svg') },
  title: 'Ravengard Wiki · 8.29 资源包全量档案',
  description: 'Hypixel Ravengard 8.29 资源包的完整可检索 Wiki，覆盖全部 8,974 个文件。',
  openGraph: {
    title: 'Ravengard Wiki · 8.29 资源包全量档案',
    description: '完整收录并可检索 8.29 资源包全部 8,974 个文件。',
    images: [{ url: siteAssetUrl('/og.png'), width: 1200, height: 630, alt: 'Ravengard Wiki 8.29 资源包全量档案' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ravengard Wiki · 8.29 资源包全量档案',
    description: '完整收录并可检索 8.29 资源包全部 8,974 个文件。',
    images: [siteAssetUrl('/og.png')],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
