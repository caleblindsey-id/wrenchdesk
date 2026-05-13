'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Pencil } from 'lucide-react'

interface VendorSearchResult {
  code: number
  name: string
}

interface VendorPickerProps {
  vendor?: string | null
  vendorCode?: string | number | null
  onChange: (next: { vendor: string; vendor_code: string }) => void
  disabled?: boolean
  placeholder?: string
}

export default function VendorPicker({
  vendor,
  vendorCode,
  onChange,
  disabled = false,
  placeholder = 'Search Synergy vendor name or code',
}: VendorPickerProps) {
  const [search, setSearch] = useState(vendor ?? '')
  const [results, setResults] = useState<VendorSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [editing, setEditing] = useState(!vendor)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const hasSynergyMatch = !!vendorCode

  // Debounced vendor search — fires asynchronously so setState inside the
  // callback doesn't trigger the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (!editing) return
    const q = search.trim()
    if (!q) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/vendors/search?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const json = await res.json()
          setResults((json.results as VendorSearchResult[]) ?? [])
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      }
      setOpen(true)
      setSearching(false)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, editing])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectMatch(v: VendorSearchResult) {
    onChange({ vendor: v.name, vendor_code: String(v.code) })
    setSearch(v.name)
    setOpen(false)
    setEditing(false)
  }

  function startEditing() {
    setEditing(true)
    setSearch(vendor ?? '')
    setTimeout(() => {
      const el = containerRef.current?.querySelector('input')
      if (el) (el as HTMLInputElement).focus()
    }, 0)
  }

  if (!editing && vendor) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400 shrink-0">Vendor:</span>
          <span className="font-medium text-gray-900 dark:text-white">{vendor}</span>
          {hasSynergyMatch ? (
            <span
              title={`Synergy vendor code ${vendorCode}`}
              className="inline-flex items-center gap-0.5 text-green-700 dark:text-green-400"
            >
              <Check className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">synergy</span>
            </span>
          ) : (
            <span
              title="Legacy free-text vendor — re-pick to link to Synergy"
              className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400"
            >
              legacy
            </span>
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={startEditing}
            title="Change vendor"
            className="p-1 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Vendor</label>
      <input
        type="text"
        value={search}
        onChange={e => {
          const v = e.target.value
          setSearch(v)
          if (!v.trim()) {
            setResults([])
            setOpen(false)
          } else {
            setOpen(true)
          }
        }}
        onFocus={() => { if (search.trim()) setOpen(true) }}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-500 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {searching && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Searching…</div>
          )}
          {!searching && results.length === 0 && search.trim() && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              No Synergy match. Vendor must exist in Synergy — add it there first.
            </div>
          )}
          {!searching && results.map(v => (
            <button
              key={v.code}
              type="button"
              onClick={() => selectMatch(v)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <span className="text-gray-900 dark:text-white">{v.name}</span>
              <span className="text-gray-500 dark:text-gray-400 font-mono"> — {v.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
