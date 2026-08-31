"use client";

import { useRef, useState } from "react";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { IconButton } from "@/components/ui/IconButton";
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
  const customServiceValue = "__custom_service__";
  const nextRowId = useRef(1);
  const [serviceRows, setServiceRows] = useState<Array<{ id: number; values: Record<string, string>; customFields: Record<string, boolean> }>>([{ id: 0, values, customFields: {} }]);
  if (!category) return null;

  const fields = serviceDetailFields(category, locale);
  const isKorean = locale === "ko";
  const updateRowValue = (rowId: number, fieldKey: string, value: string) => {
    setServiceRows((current) => current.map((row) => row.id === rowId ? { ...row, values: { ...row.values, [fieldKey]: value } } : row));
    if (rowId === 0) onValueChange(fieldKey, value);
  };
  const setCustomField = (rowId: number, fieldKey: string, isCustom: boolean) => {
    setServiceRows((current) => current.map((row) => row.id === rowId ? { ...row, customFields: { ...row.customFields, [fieldKey]: isCustom }, values: { ...row.values, [fieldKey]: "" } } : row));
    if (rowId === 0) onValueChange(fieldKey, "");
  };
  const addRow = () => setServiceRows((current) => [...current, { id: nextRowId.current++, values: {}, customFields: {} }]);
  const removeRow = (rowId: number) => setServiceRows((current) => current.length === 1 ? current : current.filter((row) => row.id !== rowId));

  return (
    <div className="service-category-details" aria-live="polite">
      <div className={`service-price-table service-price-table--${fields.length}-fields`}>
        <div className="service-price-table-head">{fields.map((field) => <span key={field.key}>{field.label}</span>)}<span>{isKorean ? "삭제" : "Remove"}</span></div>
        {serviceRows.map((row, rowIndex) => <div className="service-price-row" key={row.id}>{fields.map((field) => {
          const name = rowIndex === 0 ? `service-detail-${field.key}` : `additional-service-${row.id}-${field.key}`;
          const supportsCustomService = field.key === "service_type";
          const isCustomService = Boolean(row.customFields[field.key]);
          if (field.input === "select" && supportsCustomService) return <div className="service-price-custom-field" key={field.key}><SelectMenu className="service-price-select" id={`${name}-choice`} name={isCustomService ? `${name}-preset` : name} label={field.label} placeholder={isKorean ? "서비스 선택" : "Select service"} options={[...(field.options ?? []), { value: customServiceValue, label: isKorean ? "직접 입력" : "Enter a custom service" }]} value={isCustomService ? customServiceValue : row.values[field.key] ?? ""} onChange={(value) => {
            if (value === customServiceValue) {
              setCustomField(row.id, field.key, true);
              return;
            }
            setCustomField(row.id, field.key, false);
            updateRowValue(row.id, field.key, value);
          }} required={rowIndex === 0} />{isCustomService ? <label className="service-price-custom-input"><span className="sr-only">{isKorean ? "서비스 직접 입력" : "Custom service name"}</span><input id={name} name={name} type="text" required={rowIndex === 0} minLength={2} maxLength={80} placeholder={isKorean ? "제공하는 서비스명을 입력하세요" : "Enter the service you offer"} value={row.values[field.key] ?? ""} onChange={(event) => updateRowValue(row.id, field.key, event.target.value)} /></label> : null}</div>;
          if (field.input === "select") return <SelectMenu key={field.key} className="service-price-select" id={name} name={name} label={field.label} placeholder={isKorean ? "선택" : "Select"} options={field.options ?? []} value={row.values[field.key] ?? ""} onChange={(value) => updateRowValue(row.id, field.key, value)} required={rowIndex === 0} />;
          return <label key={field.key}>{field.label}<input id={name} name={name} type={field.input} required={rowIndex === 0} min={field.min} step={field.step} inputMode={field.input === "number" ? "decimal" : undefined} placeholder={field.placeholder} value={row.values[field.key] ?? ""} onChange={(event) => updateRowValue(row.id, field.key, event.target.value)} /></label>;
        })}<div className="service-price-actions">{serviceRows.length > 1 ? <IconButton type="button" aria-label={isKorean ? "서비스 삭제" : "Remove service"} onClick={() => removeRow(row.id)}><i className="ms ms-delete" aria-hidden="true" /></IconButton> : null}</div></div>)}
      </div>
      <button className="service-additional-service-button" type="button" onClick={() => addRow()}><i className="ms ms-add" aria-hidden="true" /> {isKorean ? "서비스 추가" : "Add another service"}</button>
    </div>
  );
}
