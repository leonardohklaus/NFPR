import { useState, useEffect } from "react"

/**
 * Banker-style currency input.
 * Digits enter from the right (like an ATM), always keeping fixed decimal places.
 * Selects all text on focus.
 */
export default function CurrencyInput({
  value,
  onChange,
  onBlur,
  decimalScale = 2,
  disabled = false,
  readOnly = false,
  className = "",
}) {
  const divisor = 10 ** decimalScale

  const toCents = (v) => Math.round((parseFloat(v) || 0) * divisor)

  const [cents, setCents] = useState(() => toCents(value))

  // Sync when external value changes (form reset, calcularDeSacas, etc.)
  useEffect(() => {
    setCents(toCents(value))
  }, [value, divisor]) // eslint-disable-line react-hooks/exhaustive-deps

  const display = (cents / divisor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimalScale,
    maximumFractionDigits: decimalScale,
  })

  const handleKeyDown = (e) => {
    if (readOnly || disabled) return
    if (e.key === "Tab" || e.key === "Enter") return
    e.preventDefault()

    let next = cents
    if (e.key >= "0" && e.key <= "9") {
      next = cents * 10 + parseInt(e.key)
    } else if (e.key === "Backspace") {
      next = Math.floor(cents / 10)
    } else if (e.key === "Delete" || e.key === "Escape") {
      next = 0
    } else {
      return
    }

    setCents(next)
    onChange?.(next / divisor)
  }

  return (
    <input
      type="text"
      value={display}
      onKeyDown={handleKeyDown}
      onFocus={(e) => e.target.select()}
      onBlur={onBlur}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      onChange={() => {}} // fully controlled via keyDown
    />
  )
}
