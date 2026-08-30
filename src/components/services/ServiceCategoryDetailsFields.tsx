"use client";

import { useRef, useState } from "react";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { serviceDetailFields, type ServiceCategoryId } from "@/data/services";

type ServiceCategoryDetailsFieldsProps = {
  category: ServiceCategoryId | "";
  locale: string;
  values: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
};

/**
 * Service categories share the same input surface, while their field schema
 * comes from the service data module so submission and profile display stay in
 * lockstep with the form.
 */
export function ServiceCategoryDetailsFields({ category, locale, values, onValueChange }: ServiceCategoryDetailsFieldsProps) {
  const nextRowId = useRef(1);
  const [serviceRows, setServiceRows] = useState<Array<{ id: number; values: Record<string, string> }>>([{ id: 0, values }]);
  if (!category) return null;

  const fields = serviceDetailFields(category, locale);
  const isKorean = locale === "ko";
  const updateRowValue = (rowId: number, fieldKey: string, value: string) => {
    setServiceRows((current) => current.map((row) => row.id === rowId ? { ...row, values: { ...row.values, [fieldKey]: value } } : row));
    if (rowId === 0) onValueChange(fieldKey, value);
  };
  const addRow = (source?: Record<string, string>) => setServiceRows((current) => [...current, { id: nextRowId.current++, values: source ? { ...source } : {} }]);
  const removeRow = (rowId: number) => setServiceRows((current) => current.length === 1 ? current : current.filter((row) => row.id !== rowId));

  return (
    <div className="service-category-details" aria-live="polite">
      <div className={`service-price-table service-price-table--${fields.length}-fields`}>
        <div className="service-price-table-head">{fields.map((field) => <span key={field.key}>{field.label}</span>)}<span>{isKorean ? "작업" : "Actions"}</span></div>
        {serviceRows.map((row, rowIndex) => <div className="service-price-row" key={row.id}>{fields.map((field) => {
          const name = rowIndex === 0 ? `service-detail-${field.key}` : `additional-service-${row.id}-${field.key}`;
          if (field.input === "select") return <SelectMenu key={field.key} className="service-price-select" id={name} name={name} label={field.label} placeholder={isKorean ? "선택" : "Select"} options={field.options ?? []} value={row.values[field.key] ?? ""} onChange={(value) => updateRowValue(row.id, field.key, value)} required={rowIndex === 0} />;
          return <label key={field.key}>{field.label}<input id={name} name={name} type={field.input} required={rowIndex === 0} min={field.min} step={field.step} inputMode={field.input === "number" ? "decimal" : undefined} placeholder={field.placeholder} value={row.values[field.key] ?? ""} onChange={(event) => updateRowValue(row.id, field.key, event.target.value)} /></label>;
        })}<div className="service-price-actions"><button type="button" aria-label={isKorean ? "서비스 복제" : "Duplicate service"} onClick={() => addRow(row.values)}><i className="ms ms-content-copy" aria-hidden="true" /></button>{serviceRows.length > 1 ? <button type="button" aria-label={isKorean ? "서비스 삭제" : "Remove service"} onClick={() => removeRow(row.id)}><i className="ms ms-delete" aria-hidden="true" /></button> : null}</div></div>)}
      </div>
      <button className="service-additional-service-button" type="button" onClick={() => addRow()}><i className="ms ms-add" aria-hidden="true" /> {isKorean ? "서비스 추가" : "Add another service"}</button>
    </div>
  );
}
