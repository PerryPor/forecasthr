import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ForecastHR — Restauration Hôtelière',
  description: 'Outil de forecast F&B pour l\'hôtellerie de luxe',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
