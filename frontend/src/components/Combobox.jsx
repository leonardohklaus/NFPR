import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

/**
 * Combobox com autocomplete: clique para abrir a lista completa,
 * ou comece a digitar para filtrar. Compatível com react-hook-form
 * via as props value/onChange/onBlur.
 *
 * Props:
 *   value       – valor atual (string/number)
 *   onChange    – callback(value) ao selecionar
 *   onBlur      – callback ao perder foco (para validação do RHF)
 *   options     – [{ value, label }]
 *   placeholder – texto exibido quando vazio
 *   disabled    – desabilita interação
 */
export default function Combobox({
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Selecione ou digite...',
  disabled = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const containerRef = useRef(null)

  const selectedOption = options.find(o => String(o.value) === String(value ?? ''))

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const updateDropdownPosition = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [open])

  const doSelect = (opt) => {
    onChange(opt.value)
    setQuery('')
    setOpen(false)
    setHighlighted(0)
  }

  const handleFocus = () => {
    if (disabled) return
    setQuery('')
    const idx = options.findIndex(o => String(o.value) === String(value ?? ''))
    setHighlighted(idx >= 0 ? idx : 0)
    updateDropdownPosition()
    setOpen(true)
  }

  const handleBlur = () => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false)
        setQuery('')
        onBlur?.()
      }
    }, 120)
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    setHighlighted(0)
    setOpen(true)
  }

  const handleKeyDown = (e) => {
    if (!open) { setOpen(true); return }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted(h => Math.min(h + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted(h => Math.max(h - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlighted]) doSelect(filtered[highlighted])
        break
      case 'Escape':
        setOpen(false)
        setQuery('')
        break
    }
  }

  useEffect(() => {
    if (open && highlighted >= 0 && listRef.current) {
      const item = listRef.current.children[highlighted]
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted, open])

  const displayValue = open ? query : (selectedOption?.label ?? '')

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        className={`input-field pr-8 ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
      <ChevronDown
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      />

      {open && !disabled && createPortal(
        <ul
          ref={listRef}
          style={dropdownStyle}
          className="z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
        >
          {filtered.length > 0 ? (
            filtered.map((opt, i) => (
              <li
                key={String(opt.value)}
                onMouseDown={(e) => { e.preventDefault(); doSelect(opt) }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors
                  ${i === highlighted
                    ? 'bg-verde-50 text-verde-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-gray-400 italic">Nenhum resultado</li>
          )}
        </ul>,
        document.body
      )}
    </div>
  )
}
