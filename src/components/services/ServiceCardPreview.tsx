"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ServiceCardSaveButton } from "@/components/services/ServiceCardSaveButton";
import { drawServiceCard, preferredServiceCardFormat, serviceCardFormatLabel, serviceCardFormats, serviceCardSizes, type ServiceCardContent, type ServiceCardFormat } from "@/lib/media/service-card-image";

type ServiceCardPreviewProps = {
  content: ServiceCardContent;
  className?: string;
};

/** The provider's card, drawn once and used twice: this canvas is the preview,
 *  and saving hands the very same canvas to `toBlob`. See
 *  `lib/media/service-card-image` for the artwork itself. */
export function ServiceCardPreview({ content, className = "" }: ServiceCardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Server and client must agree on the first render, so the phone's portrait
  // default is applied after mount rather than guessed during it.
  const [format, setFormat] = useState<ServiceCardFormat>("card");
  const [status, setStatus] = useState("");
  const { isKorean } = content;

  useEffect(() => { setFormat(preferredServiceCardFormat()); }, []);

  // Redrawing on every keystroke would reload the photo each time; a short
  // settle keeps the preview live without thrashing the canvas.
  const contentKey = JSON.stringify(content);
  const drawPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (canvas) await drawServiceCard(canvas, content, format);
    // `content` is tracked through contentKey so a new object with identical
    // values does not force a redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, format]);

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(() => { if (isCurrent) void drawPreview(); }, 220);
    return () => { isCurrent = false; window.clearTimeout(timer); };
  }, [drawPreview]);

  const { width, height } = serviceCardSizes[format];

  return (
    <section className={`service-card-preview ${className}`.trim()} aria-labelledby="service-card-preview-title">
      <header>
        <div>
          <p className="service-profile-eyebrow">{isKorean ? "미리보기" : "Preview"}</p>
          <h2 id="service-card-preview-title">{isKorean ? "저장용 업체 카드" : "Saveable provider card"}</h2>
        </div>
        <div className="service-card-preview-formats" role="group" aria-label={isKorean ? "카드 형식" : "Card format"}>
          {serviceCardFormats.map((option) => (
            <button key={option} type="button" className={option === format ? "is-selected" : ""} aria-pressed={option === format} onClick={() => setFormat(option)}>
              {serviceCardFormatLabel(option, isKorean)}
            </button>
          ))}
        </div>
      </header>

      <div className="service-card-preview-stage" style={{ aspectRatio: `${width} / ${height}` }}>
        <canvas ref={canvasRef} width={width} height={height} role="img" aria-label={`${content.businessName || (isKorean ? "업체" : "Provider")} ${serviceCardFormatLabel(format, isKorean)}`} />
      </div>

      <p className="service-card-preview-hint">
        {isKorean
          ? "화면에 보이는 그대로 저장됩니다. 휴대폰에서는 공유 메뉴를 통해 앨범에 바로 담을 수 있습니다."
          : "What you see is exactly what gets saved. On a phone the share sheet drops it straight into your album."}
      </p>

      <ServiceCardSaveButton
        className="ui-button ui-button--primary ui-button--block"
        content={content}
        format={format}
        canvas={canvasRef.current}
        onResult={(result) => setStatus(
          result === "failed" ? (isKorean ? "이미지를 만들지 못했습니다. 사진을 다시 올린 뒤 시도해 주세요." : "The image could not be created. Re-upload the photo and try again.")
            : result === "shared" ? (isKorean ? "저장 메뉴에서 ‘이미지 저장’을 선택하면 앨범에 담깁니다." : "Choose “Save image” in the share sheet to keep it in your album.")
              : result === "downloaded" ? (isKorean ? "이미지를 저장했습니다." : "Image saved.")
                : "",
        )}
      >
        <><i className="ms ms-badge" aria-hidden="true" /> {isKorean ? "이미지 저장" : "Save image"}</>
      </ServiceCardSaveButton>

      {status ? <p className="service-card-preview-status" role="status">{status}</p> : null}
    </section>
  );
}
