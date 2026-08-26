"use client";

const SELECT_CLASS =
  "h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function EnumSelect({
  id,
  value,
  onChange,
  options,
  allowBlank = false,
  className,
  disabled,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowBlank?: boolean;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const showStale = value !== "" && !options.includes(value);
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? SELECT_CLASS}
    >
      {allowBlank && <option value="">—</option>}
      {showStale && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
