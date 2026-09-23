/** Tiny controlled form fields used by every panel. */
import type { ReactNode } from 'react'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export function Text({ label, value, onChange, hint, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; multiline?: boolean; placeholder?: string }) {
  return (
    <Field label={label} hint={hint}>
      {multiline ? (
        <textarea value={value} placeholder={placeholder} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  )
}

export function Num({ label, value, onChange, min, max, step = 1, hint }: { label: string; value: number | undefined; onChange: (v: number) => void; min?: number; max?: number; step?: number; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        value={value ?? 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isNaN(n)) onChange(min !== undefined ? Math.max(min, max !== undefined ? Math.min(max, n) : n) : n)
        }}
      />
    </Field>
  )
}

export function Select<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T; options: readonly (T | { value: T; label: string })[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return (
            <option key={v} value={v}>
              {l}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <span className="color">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#888888'} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </Field>
  )
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="section">
      <header className="section__head">
        <h3>{title}</h3>
        {actions}
      </header>
      {children}
    </section>
  )
}
