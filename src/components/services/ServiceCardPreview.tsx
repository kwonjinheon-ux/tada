"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { drawServiceCard, serviceCardFile, serviceCardFormatLabel, serviceCardFormats, serviceCardSizes, type ServiceCardContent, type ServiceCardFormat } from "@/lib/media/service-card-image";

type ServiceCardPreviewProps = {
  content: ServiceCardContent;
  className?: string;
  defaultFormat?: ServiceCardFormat;
};

/** Phones and tablets get the share sheet, which is the only route a web page
 *  has into the photo album. A mouse gets a straight download instead, because
 *  a share dialog on a desktop is a detour, not a save. */
function prefersShareSheet() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** The provider's card, drawn once and used twice: this canvas is the preview,
 *  and saving hands the very same canvas to `toBlob`. See
 *  `lib/media/service-card-image` for the artwork itself. */
export function ServiceCardPreview({ content, className = "", defaultFormat = "card" }: ServiceCardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<ServiceCardFormat>(defaultFormat);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const { isKorean } = content;

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

  const saveCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSaving) return;
    setIsSaving(true);
    setStatus("");
    try {
      const file = await serviceCardFile(canvas, content.businessName, format);
      if (!file) {
        setStatus(isKorean ? "이미지를 만들지 못했습니다. 사진을 다시 올린 뒤 시도해 주세요." : "The image could not be created. Re-upload the photo and try again.");
        return;
      }

      if (prefersShareSheet() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: content.businessName });
          setStatus(isKorean ? "저장 메뉴에서 ‘이미지 저장’을 선택하면 앨범에 담깁니다." : "Choose “Save image” in the share sheet to keep it in your album.");
          return;
        } catch (error) {
          // A dismissed share sheet is a choice, not a failure.
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(isKorean ? "이미지를 저장했습니다." : "Image saved.");
    } finally {
      setIsSaving(false);
    }
  };

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

      <Button onClick={() => void saveCard()} disabled={isSaving} block>
        <i className="ms ms-image" aria-hidden="true" />
        {isSaving ? (isKorean ? "이미지 준비 중…" : "Preparing image…") : isKorean ? "이미지 저장" : "Save image"}
      </Button>

      {status ? <p className="service-card-preview-status" role="status">{status}</p> : null}
    </section>
  );
}
