"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type ServiceProfileBusinessCardProps = {
  businessName: string;
  categoryLabel: string;
  description: string;
  location: string;
  streetAddress: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  logo: string | null;
  image: string | null;
  isKorean: boolean;
};

const CARD_WIDTH = 720;
const CARD_HEIGHT = 1200;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function getToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawClampedText(context: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !current) current = next;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  lines.slice(0, maxLines).forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
}

export function ServiceProfileBusinessCard({
  businessName, categoryLabel, description, location, streetAddress, phone, email, website, logo, image, isKorean,
}: ServiceProfileBusinessCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const title = isKorean ? "저장용 업체 명함" : "Saveable business card";
  const helper = isKorean ? "업체 정보를 이미지로 저장해 두세요." : "Save this provider's details as an image.";
  const aboutLabel = isKorean ? "업체 소개" : "About";
  const contactLabel = isKorean ? "연락처 및 위치" : "Contact & location";
  const cardRows = [location, streetAddress, phone, email, website].filter(
    (value): value is string => Boolean(value),
  );

  const saveCard = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) return;

      const surface = getToken("--color-surface");
      const softSurface = getToken("--color-surface-soft");
      const ink = getToken("--color-ink");
      const muted = getToken("--color-muted");
      const primary = getToken("--color-primary");
      const line = getToken("--color-line");

      context.fillStyle = surface;
      context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
      context.fillStyle = primary;
      context.fillRect(0, 0, CARD_WIDTH, 18);
      context.fillStyle = softSurface;
      context.fillRect(48, 48, CARD_WIDTH - 96, 360);

      if (image) {
        try {
          const hero = await loadImage(image);
          context.save();
          context.beginPath();
          context.roundRect(48, 48, CARD_WIDTH - 96, 360, 24);
          context.clip();
          const scale = Math.max((CARD_WIDTH - 96) / hero.width, 360 / hero.height);
          const width = hero.width * scale;
          const height = hero.height * scale;
          context.drawImage(hero, 48 + ((CARD_WIDTH - 96) - width) / 2, 48 + (360 - height) / 2, width, height);
          context.restore();
        } catch { /* The visual card remains complete when a remote image blocks canvas access. */ }
      }

      context.globalAlpha = 0.46;
      context.fillStyle = ink;
      context.fillRect(48, 48, CARD_WIDTH - 96, 360);
      context.globalAlpha = 1;
      context.fillStyle = surface;
      context.font = "600 24px Inter, sans-serif";
      context.fillText("tada", 78, 90);

      if (logo) {
        try {
          const logoImage = await loadImage(logo);
          context.save();
          context.beginPath();
          context.roundRect(78, 258, 104, 104, 20);
          context.clip();
          context.drawImage(logoImage, 78, 258, 104, 104);
          context.restore();
        } catch { /* The text treatment below is the accessible visual fallback. */ }
      }

      context.fillStyle = surface;
      context.font = "700 48px Inter, sans-serif";
      drawClampedText(context, businessName, logo ? 204 : 78, 302, logo ? 390 : 540, 54, 2);
      context.font = "500 24px Inter, sans-serif";
      context.fillText(categoryLabel, logo ? 204 : 78, 370);

      context.fillStyle = ink;
      context.font = "700 30px Inter, sans-serif";
      context.fillText(isKorean ? "업체 소개" : "About", 60, 476);
      context.fillStyle = muted;
      context.font = "400 24px Inter, sans-serif";
      drawClampedText(context, description, 60, 518, CARD_WIDTH - 120, 34, 4);

      context.strokeStyle = line;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(60, 684);
      context.lineTo(CARD_WIDTH - 60, 684);
      context.stroke();
      context.fillStyle = ink;
      context.font = "700 30px Inter, sans-serif";
      context.fillText(isKorean ? "연락처 및 위치" : "Contact & location", 60, 742);
      context.font = "400 24px Inter, sans-serif";
      context.fillStyle = muted;
      const rows = [location, streetAddress, phone, email, website].filter((value): value is string => Boolean(value));
      rows.slice(0, 5).forEach((row, index) => context.fillText(row, 60, 798 + index * 56));

      context.fillStyle = softSurface;
      context.fillRect(48, 1080, CARD_WIDTH - 96, 72);
      context.fillStyle = primary;
      context.font = "600 22px Inter, sans-serif";
      context.fillText(isKorean ? "Tada에서 지역 전문가를 만나보세요" : "Find local experts on Tada", 78, 1125);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const fileName = `${businessName.replace(/[^a-z0-9가-힣_-]+/gi, "-").replace(/^-|-$/g, "") || "tada-service"}-business-card.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: businessName });
      else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="service-profile-business-card ui-card" aria-labelledby="service-business-card-title">
      <header>
        <div>
          <p className="service-profile-eyebrow">{title}</p>
          <h2 id="service-business-card-title">{isKorean ? "나만의 업체 명함" : "Your provider card"}</h2>
        </div>
      </header>
      <div className="service-profile-business-card-preview">
        <div className="service-profile-business-card-media">
          {image ? <img src={image} alt="" /> : <div className="service-profile-business-card-image-fallback"><i className="ms ms-image" aria-hidden="true" /></div>}
          <div className="service-profile-business-card-brand">
            {logo ? <img src={logo} alt="" /> : <span aria-hidden="true"><i className="ms ms-work" /></span>}
            <div>
              <strong>{businessName}</strong>
              <span>{categoryLabel}</span>
            </div>
          </div>
        </div>
        <div className="service-profile-business-card-copy">
          <div>
            <p className="service-profile-eyebrow">{aboutLabel}</p>
            <p>{description}</p>
          </div>
          <dl>
            <div>
              <dt>{contactLabel}</dt>
              {cardRows.map((row) => <dd key={row}>{row}</dd>)}
            </div>
          </dl>
          <footer>
            <strong>tada</strong>
            <span>{isKorean ? "가까운 지역 전문가" : "Local experts, nearby"}</span>
          </footer>
        </div>
      </div>
      <p>{helper}</p>
      <Button className="service-profile-business-card-save" onClick={() => void saveCard()} disabled={isSaving} block>
        <i className="ms ms-share" aria-hidden="true" /> {isSaving ? (isKorean ? "이미지 준비 중…" : "Preparing image…") : (isKorean ? "명함 이미지 저장" : "Save business card")}
      </Button>
    </section>
  );
}
