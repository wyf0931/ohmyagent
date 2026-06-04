import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OhMyAgent - AI Agent Platform',
  description: 'AI Agent platform with dynamic skill injection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
