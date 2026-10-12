import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import ThemeRegistry from '@/theme/ThemeRegistry';
import AppLayoutWrapper from '@/components/AppLayoutWrapper';

export const metadata = {
  title: 'Perpustakaan SMPN 1 Prambon',
  description: 'Sistem Informasi dan Layanan Mandiri Perpustakaan SMPN 1 Prambon',
  icons: {
    icon: '/image/logo_prambon.png',
    apple: '/image/logo_prambon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased bg-[#F6FAFD] text-[#0A1931] min-h-screen font-sans">
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <AppLayoutWrapper>{children}</AppLayoutWrapper>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
