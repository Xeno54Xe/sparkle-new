"use client"

type ExpirySelectorProps = {
  value: string
  onChange: (value: string) => void
}

export function ExpirySelector({ value, onChange }: ExpirySelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="options-expiry" className="text-sm font-medium text-foreground">
        Expiry
      </label>
      <input
        id="options-expiry"
        type="text"
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        pattern="\\d{4}-\\d{2}-\\d{2}"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
    </div>
  )
}
