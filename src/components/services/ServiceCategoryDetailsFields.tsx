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
  const [additionalServices, setAdditionalServices] = useState(0);
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
      <div className="post-location-grid service-category-details-grid">
        {fields.map((field) => {
          const name = `service-detail-${field.key}`;
          if (field.input === "select") {
            return <SelectMenu key={field.key} id={name} name={name} label={field.label} placeholder={isKorean ? "선택해 주세요" : "Select an option"} options={field.options ?? []} value={values[field.key] ?? ""} onChange={(value) => onValueChange(field.key, value)} required />;
          }

          return <div className="post-field" key={field.key}>
            <label htmlFor={name}>{field.label}</label>
            <input id={name} name={name} type={field.input} required min={field.min} step={field.step} inputMode={field.input === "number" ? "decimal" : undefined} placeholder={field.placeholder} />
          </div>;
        })}
      </div>
      {Array.from({ length: additionalServices }, (_, index) => <div className="service-additional-service" key={index}><label>{isKorean ? `추가 서비스 ${index + 2}` : `Additional service ${index + 2}`}<input placeholder={isKorean ? "서비스명" : "Service title"} /></label><label>{isKorean ? "가격 안내" : "Price guidance"}<input placeholder={isKorean ? "예: 시간당 $40부터" : "e.g. From $40 / hr"} /></label><button type="button" onClick={() => setAdditionalServices((current) => current - 1)} aria-label={isKorean ? "추가 서비스 삭제" : "Remove additional service"}><i className="ms ms-delete" aria-hidden="true" /></button></div>)}
      <button className="service-additional-service-button" type="button" onClick={() => setAdditionalServices((current) => current + 1)}><i className="ms ms-add-circle" aria-hidden="true" /> {isKorean ? "서비스 추가" : "Add another service"}</button>
    </div>
  );
}
