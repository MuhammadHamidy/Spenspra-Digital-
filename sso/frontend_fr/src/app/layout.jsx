import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import ThemeRegistry from '@/theme/ThemeRegistry';
import AppLayoutWrapper from '@/components/AppLayoutWrapper';

export const metadata = {
  title: 'SSO SMP Negeri 1 Prambon',
  description: 'Portal Single Sign-On untuk seluruh layanan digital SMP Negeri 1 Prambon',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-50 text-slate-800 min-h-screen font-sans">
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <AppLayoutWrapper>{children}</AppLayoutWrapper>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
