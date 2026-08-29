"use client";

import { SelectMenu } from "@/components/ui/SelectMenu";
import { serviceDetailFields, type ServiceCategoryId } from "@/data/services";

const serviceLanguageOptions = ["English", "Korean", "Mandarin", "Hindi", "Japanese", "Spanish", "Samoan", "Tongan"] as const;

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
  if (!category) return null;

  const fields = serviceDetailFields(category, locale);
  const isKorean = locale === "ko";

  return (
    <div className="service-category-details" aria-live="polite">
      <div className="service-category-details-heading">
        <i className="ms ms-tune" aria-hidden="true" />
        <div>
          <strong>{isKorean ? "서비스 상세 및 가격" : "Service details & pricing"}</strong>
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
      <fieldset className="service-language-field">
        <legend>{isKorean ? "제공 가능 언어" : "Languages spoken"}</legend>
        <p>{isKorean ? "고객과 대화할 수 있는 언어를 선택해 주세요. 최대 5개까지 선택할 수 있어요." : "Choose up to five languages you can use with customers."}</p>
        <div>
          {serviceLanguageOptions.map((language) => (
            <label key={language}>
              <input type="checkbox" name="service-language" value={language} defaultChecked={language === "English"} />
              <span>{language === "Korean" ? "한국어" : language}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="service-address-privacy-field">
        <legend>{isKorean ? "주소 공개 설정" : "Address visibility"}</legend>
        <label>
          <input type="checkbox" name="show-exact-address" defaultChecked />
          <span>{isKorean ? "상세 주소를 서비스 페이지와 길찾기에 표시합니다" : "Show the street address and directions on the service page"}</span>
        </label>
        <p>{isKorean ? "끄면 고객에게 활동 지역과 세부 지역만 표시됩니다." : "When off, customers see only your service area and suburb."}</p>
      </fieldset>
    </div>
  );
}
