export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 animate-pulse" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  )
}
