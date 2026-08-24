import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-6 space-y-5">
        <div className="text-8xl font-black text-slate-200 font-display">404</div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Page not found</h2>
          <p className="text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        </div>
        <Link href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors">
          <Home size={14} /> Back to Home
        </Link>
      </div>
    </div>
  )
}
