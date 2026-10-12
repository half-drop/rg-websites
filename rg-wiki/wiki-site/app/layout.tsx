import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Ravengard 8.29 · 资源百科',
  icons: { icon: (process.env.WIKI_BASE_PATH || '') + '/pack/pack.png' },
  description:
    '完整浏览 Ravengard 8.29 资源包的模型、物品、纹理、声音和原始文件。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
