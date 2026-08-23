"use client";

import { useEffect, useRef, useState } from "react";

export type SelectMenuOption = { label: string; value: string };

export function SelectMenu({ id, name, label, icon, placeholder, options, value, onChange, className = "", disabled = false, hideLabel = false, required = false }: { id: string; name: string; label: string; icon?: string; placeholder: string; options: readonly SelectMenuOption[]; value: string; onChange: (value: string) => void; className?: string; disabled?: boolean; hideLabel?: boolean; required?: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    document.addEventListener("click", closeOnOutsideClick); document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("click", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);
  const selectValue = (nextValue: string) => { onChange(nextValue); setIsOpen(false); };
  return <div className={`post-field ${hideLabel ? "is-label-hidden" : ""} ${className}`}>
    <label className={hideLabel ? "sr-only" : undefined} htmlFor={id}>{label}</label>
    <div ref={wrapperRef} className={`post-select-wrap is-enhanced ${icon ? "has-leading-icon" : ""} ${isOpen ? "is-open" : ""}`}>
      {icon ? <i className={`fa-solid ${icon}`} aria-hidden="true" /> : null}
      <select id={id} name={name} value={value} disabled={disabled} required={required} onChange={(event) => selectValue(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <button className="post-select-trigger" type="button" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={`${id}-menu`} onClick={() => setIsOpen((current) => !current)}><span>{selected?.label ?? placeholder}</span></button>
      <div className="post-select-menu" id={`${id}-menu`} role="listbox"><button className="post-select-option" type="button" role="option" aria-selected={!value} onClick={() => selectValue("")}>{placeholder}</button>{options.map((option) => <button className="post-select-option" key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => selectValue(option.value)}>{option.label}</button>)}</div>
    </div>
  </div>;
}
