'use client'

export default function TicketsError({ reset }: { reset: () => void }) {
  return (
    <div className="p-6">
      <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">Failed to load tickets.</p>
      <button onClick={reset} className="text-sm text-slate-700 dark:text-slate-300 underline">
        Try again
      </button>
    </div>
  )
}
