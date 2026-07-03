import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
};

export function FieldShell({ id, label, error, children }: BaseFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] font-medium text-red-600">{error}</span>}
    </label>
  );
}

const fieldClassName = "w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs text-[#0F1117] outline-none transition-colors placeholder:text-[#8A949E] focus:border-[#8B1E2D]/50 focus:ring-2 focus:ring-[#8B1E2D]/10 disabled:cursor-not-allowed disabled:bg-[#F2F3F5] disabled:text-[#8A949E]";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, className = "", ...props }: TextFieldProps) {
  const id = props.id ?? props.name ?? label;
  return (
    <FieldShell id={id} label={label} error={error}>
      <input {...props} id={id} className={`${fieldClassName} ${className}`} />
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export function TextAreaField({ label, error, className = "", ...props }: TextAreaFieldProps) {
  const id = props.id ?? props.name ?? label;
  return (
    <FieldShell id={id} label={label} error={error}>
      <textarea {...props} id={id} className={`${fieldClassName} min-h-20 resize-y ${className}`} />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
};

export function SelectField({ label, error, options, className = "", ...props }: SelectFieldProps) {
  const id = props.id ?? props.name ?? label;
  return (
    <FieldShell id={id} label={label} error={error}>
      <select {...props} id={id} className={`${fieldClassName} ${className}`}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}
