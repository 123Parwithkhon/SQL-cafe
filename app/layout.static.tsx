// Статический режим (GitHub Pages): сервера нет — HTML один для всех.
// Сохранённая тема ставится скриптом до отрисовки, язык — после загрузки (LangProvider).
import { RootShell, siteMetadata, siteViewport } from '@/components/RootShell';
import './globals.css';

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell lang="ru" theme="dark" user={null} applySavedTheme>
      {children}
    </RootShell>
  );
}
