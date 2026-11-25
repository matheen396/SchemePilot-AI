import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'SchemePilot | Find support that fits',
  description: 'Search public-benefit program records with semantic retrieval and source-grounded answers.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
