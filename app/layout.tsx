// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/providers/AuthProvider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Marketing Racks Job Order Request System',
  description: 'IT Admin Panel — Enterprise Job Order Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: 13 } }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
