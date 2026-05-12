'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import FeedbackModal from './FeedbackModal'

export default function FeedbackFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Send feedback"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}
