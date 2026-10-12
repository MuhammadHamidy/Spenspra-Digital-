import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import ThemeRegistry from '@/theme/ThemeRegistry';
import AppLayoutWrapper from '@/components/AppLayoutWrapper';

export const metadata = {
  title: 'e-Rapor SMP Negeri 1 Prambon',
  description: 'Sistem e-Rapor untuk pengelolaan penilaian siswa SMP Negeri 1 Prambon',
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
