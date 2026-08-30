"use client";

import { useState } from "react";
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
  const [serviceRows, setServiceRows] = useState([0]);
  if (!category) return null;

  const fields = serviceDetailFields(category, locale);
  const isKorean = locale === "ko";

  return (
    <div className="service-category-details" aria-live="polite">
      <div className="service-category-details-heading">
        <i className="ms ms-tune" aria-hidden="true" />
        <div>
          <strong>{isKorean ? "서비스 상세 및 가격" : "Service details & price"}</strong>
          <p>{isKorean ? "선택한 서비스에 필요한 항목을 모두 입력해 주세요." : "Complete the required details for this service category."}</p>
        </div>
      </div>
      <div className="service-price-table">
        <div className="service-price-table-head">{fields.map((field) => <span key={field.key}>{field.label}</span>)}<span>{isKorean ? "작업" : "Actions"}</span></div>
        {serviceRows.map((rowIndex) => <div className="service-price-row" key={rowIndex}>{fields.map((field) => {
          const isPrimary = rowIndex === 0;
          const name = isPrimary ? `service-detail-${field.key}` : `additional-service-${rowIndex}-${field.key}`;
          if (field.input === "select") return <SelectMenu key={field.key} id={name} name={name} label={field.label} placeholder={isKorean ? "선택" : "Select"} options={field.options ?? []} value={isPrimary ? values[field.key] ?? "" : ""} onChange={(value) => { if (isPrimary) onValueChange(field.key, value); }} required={isPrimary} />;
          return <label key={field.key}>{field.label}<input id={name} name={name} type={field.input} required={isPrimary} min={field.min} step={field.step} inputMode={field.input === "number" ? "decimal" : undefined} placeholder={field.placeholder} /></label>;
        })}<div className="service-price-actions"><button type="button" aria-label={isKorean ? "서비스 복제" : "Duplicate service"} onClick={() => setServiceRows((current) => [...current, current.length])}><i className="ms ms-content-copy" aria-hidden="true" /></button>{rowIndex > 0 ? <button type="button" aria-label={isKorean ? "서비스 삭제" : "Remove service"} onClick={() => setServiceRows((current) => current.filter((item) => item !== rowIndex))}><i className="ms ms-delete" aria-hidden="true" /></button> : null}</div></div>)}
      </div>
      <button className="service-additional-service-button" type="button" onClick={() => setServiceRows((current) => [...current, current.length])}><i className="ms ms-add" aria-hidden="true" /> {isKorean ? "서비스 추가" : "Add another service"}</button>
    </div>
  );
}
