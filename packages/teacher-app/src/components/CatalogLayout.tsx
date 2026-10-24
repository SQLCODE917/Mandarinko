import type { ReactNode } from 'react';
import { CRTText } from './CRTText';
import '../pages/HomePage.css';

export function CatalogLayout({
  page,
  wide = false,
  children,
}: {
  page: 'dictionary' | 'grammar';
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`home-page${wide ? ' home-page-expanded' : ''}`}>
      <header className="page-header crt-screen">
        <div className="logo">
          <span className="crt-badge">国语こ</span>
          <CRTText>Mandarinko</CRTText>
        </div>
      </header>
      <nav className="page-navigation" aria-label="Main navigation">
        <a href="/" aria-current={page === 'dictionary' ? 'page' : undefined}>
          Dictionary
        </a>
        <a href="/grammar" aria-current={page === 'grammar' ? 'page' : undefined}>
          Grammar
        </a>
      </nav>
      <main className={`home-content${wide ? ' home-content-wide' : ''}`}>{children}</main>
    </div>
  );
}
