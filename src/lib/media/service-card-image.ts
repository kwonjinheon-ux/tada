/* The one drawing of a service provider's card.
 *
 * The preview a provider sees while filling the form, the business-card image
 * they save, and the listing thumbnail are the same artwork: the preview is a
 * <canvas> drawn by this module, and saving is that same canvas handed to
 * `toBlob`. Nothing can drift between what is shown and what is exported,
 * which is exactly what an HTML preview beside a canvas exporter could not
 * promise.
 *
 * Two formats share the visual language because they do different jobs:
 * `card` is a landscape business card, made to be saved and handed on, and
 * `thumbnail` is the 16:10 cover that matches the media box on the services
 * directory card. Colours come from the design tokens at draw time, so the
 * export follows a palette change like every other surface. */

export type ServiceCardFormat = "card" | "cardPortrait" | "thumbnail";

export type ServiceCardContent = {
  businessName: string;
  serviceName: string;
  categoryLabel: string;
  description: string;
  location: string;
  streetAddress: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  priceLabel: string | null;
  /** Object URL while composing, signed storage URL once published. */
  logo: string | null;
  photo: string | null;
  isKorean: boolean;
};

export const serviceCardFormats: readonly ServiceCardFormat[] = ["card", "cardPortrait", "thumbnail"] as const;

/** Business-card proportions (91×55mm) and the directory card's 16:10 media
 *  box. Both are sized so the export stays sharp when printed or shared. */
export const serviceCardSizes: Record<ServiceCardFormat, { width: number; height: number }> = {
  card: { width: 1080, height: 660 },
  cardPortrait: { width: 900, height: 1480 },
  thumbnail: { width: 1200, height: 750 },
};

/** A phone saves a portrait card: it fills the screen it will be looked at on,
 *  and a landscape card in a photo album is a letterbox with two grey bands. */
export function preferredServiceCardFormat(): ServiceCardFormat {
  if (typeof window === "undefined") return "card";
  return window.matchMedia("(max-width: 767.98px), (pointer: coarse)").matches ? "cardPortrait" : "card";
}

export function serviceCardFormatLabel(format: ServiceCardFormat, isKorean: boolean) {
  if (format === "card") return isKorean ? "명함 가로" : "Card";
  if (format === "cardPortrait") return isKorean ? "명함 세로" : "Tall card";
  return isKorean ? "썸네일" : "Thumbnail";
}

const FONT_STACK = '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT_STACK}`;

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image failed to load"));
    image.src = source;
  });
}

/** Never let a missing or blocked photo take the whole card down with it. */
async function loadOptionalImage(source: string | null) {
  if (!source) return null;
  try {
    return await loadImage(source);
  } catch {
    return null;
  }
}

/** `object-fit: cover` for the 2D context. */
function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  context.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

function clipRoundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();
}

/** One line, cut with an ellipsis rather than allowed to run off the card. */
function truncate(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let text = value;
  while (text.length > 1 && context.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
  return `${text}…`;
}

/** Wraps on spaces, then on characters — Korean copy carries no spaces to
 *  break at, so a word-only wrapper would overflow every Korean card. */
function wrapLines(context: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of value.trim().split(/\s+/).filter(Boolean)) {
    if (lines.length >= maxLines) break;
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) { current = candidate; continue; }
    pushCurrent();
    if (context.measureText(word).width <= maxWidth) { current = word; continue; }
    // A single run too wide to fit — break it character by character.
    for (const character of word) {
      const nextRun = current + character;
      if (context.measureText(nextRun).width <= maxWidth) { current = nextRun; continue; }
      pushCurrent();
      if (lines.length >= maxLines) break;
      current = character;
    }
  }
  pushCurrent();

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = truncate(context, `${kept[maxLines - 1]}…`, maxWidth);
    return kept;
  }
  return lines;
}

function drawLines(context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

/** The initial that stands in for a logo nobody uploaded. */
function initial(value: string) {
  return (value.trim()[0] ?? "T").toUpperCase();
}

function drawLogo(context: CanvasRenderingContext2D, logo: HTMLImageElement | null, name: string, x: number, y: number, size: number, ring: string, fallbackFill: string, fallbackInk: string, disc: string) {
  context.save();
  clipRoundRect(context, x, y, size, size, size / 2);
  // The disc is painted first whatever happens next: most business logos are
  // transparent PNGs, and without it the photo behind shows through the mark.
  context.fillStyle = logo ? disc : fallbackFill;
  context.fillRect(x, y, size, size);
  if (logo) {
    // Contained, not cropped — a wide wordmark is a perfectly ordinary logo and
    // a cover crop would slice the middle out of it.
    const inset = size * 0.16;
    const box = size - inset * 2;
    const scale = Math.min(box / logo.width, box / logo.height);
    const drawnWidth = logo.width * scale;
    const drawnHeight = logo.height * scale;
    context.drawImage(logo, x + (size - drawnWidth) / 2, y + (size - drawnHeight) / 2, drawnWidth, drawnHeight);
  } else {
    context.fillStyle = fallbackInk;
    context.font = font(700, size * 0.42);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initial(name), x + size / 2, y + size / 2 + size * 0.02);
    context.textAlign = "left";
    context.textBaseline = "top";
  }
  context.restore();

  context.save();
  context.strokeStyle = ring;
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(x + 1.5, y + 1.5, size - 3, size - 3, (size - 3) / 2);
  context.stroke();
  context.restore();
}

/** Stands in for the representative photo. A provider filling the form has not
 *  uploaded one yet, and an empty accent block would read as a broken export;
 *  a monogram reads as a finished card that a photo will later replace. */
function drawBrandPanel(context: CanvasRenderingContext2D, palette: Palette, name: string, width: number, height: number) {
  const shortest = Math.min(width, height);
  context.fillStyle = palette.primary;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.14;
  context.fillStyle = palette.onPrimary;
  context.beginPath();
  context.arc(width / 2, height / 2, shortest * 0.36, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.globalAlpha = 0.94;
  context.fillStyle = palette.onPrimary;
  context.font = font(700, shortest * 0.34);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(initial(name), width / 2, height / 2);
  context.restore();
  context.textAlign = "left";
  context.textBaseline = "top";
}

type Palette = {
  surface: string;
  sunken: string;
  ink: string;
  muted: string;
  primary: string;
  primarySoft: string;
  line: string;
  onPrimary: string;
};

function readPalette(): Palette {
  return {
    surface: token("--color-surface"),
    sunken: token("--color-surface-sunken"),
    ink: token("--color-ink"),
    muted: token("--color-muted"),
    primary: token("--color-primary"),
    primarySoft: token("--color-primary-soft"),
    line: token("--color-line-soft"),
    onPrimary: token("--color-on-primary"),
  };
}

/* --- Business card ------------------------------------------------------ */

function drawBusinessCard(context: CanvasRenderingContext2D, content: ServiceCardContent, palette: Palette, photo: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const { width, height } = serviceCardSizes.card;
  const mediaWidth = 408;
  const padding = 52;
  const panelX = mediaWidth + padding;
  const panelWidth = width - panelX - padding;

  context.fillStyle = palette.surface;
  context.fillRect(0, 0, width, height);

  // Media panel. Without a photo it becomes a brand panel rather than a hole,
  // so a provider still gets a finished card before uploading anything.
  context.save();
  clipRoundRect(context, 0, 0, mediaWidth, height, 0);
  if (photo) {
    drawCover(context, photo, 0, 0, mediaWidth, height);
    // Scrims at both ends: the wordmark sits at the top and the price at the
    // bottom, and a bright photo would swallow either without them.
    const scrim = context.createLinearGradient(0, 0, 0, height);
    scrim.addColorStop(0, "rgba(0, 0, 0, 0.52)");
    scrim.addColorStop(0.32, "rgba(0, 0, 0, 0.08)");
    scrim.addColorStop(0.62, "rgba(0, 0, 0, 0.14)");
    scrim.addColorStop(1, "rgba(0, 0, 0, 0.68)");
    context.fillStyle = scrim;
    context.fillRect(0, 0, mediaWidth, height);
  } else {
    drawBrandPanel(context, palette, content.businessName, mediaWidth, height);
  }
  context.restore();

  context.textAlign = "left";
  context.textBaseline = "top";

  // The wordmark sits on the photo, which is the one place on the card where
  // it cannot collide with the provider's own type.
  context.fillStyle = palette.onPrimary;
  context.font = font(700, 30);
  context.fillText("tada", padding, padding);
  context.font = font(600, 20);
  context.globalAlpha = 0.82;
  context.fillText(content.isKorean ? "지역 전문가" : "Local experts", padding, padding + 38);
  context.globalAlpha = 1;

  if (content.priceLabel) {
    context.font = font(600, 24);
    const label = truncate(context, content.priceLabel, mediaWidth - padding * 2);
    context.fillStyle = palette.onPrimary;
    context.globalAlpha = 0.9;
    context.fillText(content.isKorean ? "요금" : "Pricing", padding, height - padding - 62);
    context.globalAlpha = 1;
    context.font = font(700, 34);
    context.fillText(label, padding, height - padding - 34);
  }

  // Identity.
  let y = padding;
  drawLogo(context, logo, content.businessName, panelX, y, 92, palette.line, palette.primarySoft, palette.primary, palette.surface);
  y += 92 + 20;

  context.fillStyle = palette.ink;
  context.font = font(700, 46);
  y = drawLines(context, wrapLines(context, content.businessName || (content.isKorean ? "업체명" : "Business name"), panelWidth, 2), panelX, y, 54) + 4;

  context.fillStyle = palette.primary;
  context.font = font(600, 24);
  context.fillText(truncate(context, content.categoryLabel, panelWidth), panelX, y);
  // The service name is deliberately left off the business card: it repeats
  // the business name on most listings and the four contact rows need the
  // height more. The thumbnail still carries it.
  y += 46;
  context.strokeStyle = palette.line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(panelX, y);
  context.lineTo(panelX + panelWidth, y);
  context.stroke();
  y += 28;

  // Contact block. Rows are dropped rather than shown empty, so a card with
  // three details is as finished as one with five.
  const rows: Array<[string, string]> = [];
  if (content.phone) rows.push([content.isKorean ? "전화" : "Phone", content.phone]);
  if (content.email) rows.push([content.isKorean ? "이메일" : "Email", content.email]);
  if (content.website) rows.push([content.isKorean ? "웹사이트" : "Website", content.website]);
  const place = [content.streetAddress, content.location].filter(Boolean).join(", ");
  if (place) rows.push([content.isKorean ? "위치" : "Location", place]);

  const footerTop = height - padding - 34;
  for (const [label, value] of rows) {
    if (y + 46 > footerTop) break;
    context.fillStyle = palette.muted;
    context.font = font(600, 18);
    context.fillText(label.toUpperCase(), panelX, y);
    context.fillStyle = palette.ink;
    context.font = font(600, 25);
    context.fillText(truncate(context, value, panelWidth), panelX, y + 21);
    y += 56;
  }

  context.fillStyle = palette.muted;
  context.font = font(500, 20);
  context.fillText(truncate(context, content.isKorean ? "Tada에서 더 많은 지역 전문가를 만나보세요" : "Find more local experts on Tada", panelWidth), panelX, height - padding - 22);
}

/* --- Portrait business card --------------------------------------------- */

/** The same card stood on its end. A phone saves this one: it fills the screen
 *  it will be looked at on, and the extra height buys room for the provider's
 *  own description, which the landscape card has to leave out. */
function drawPortraitCard(context: CanvasRenderingContext2D, content: ServiceCardContent, palette: Palette, photo: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const { width, height } = serviceCardSizes.cardPortrait;
  const padding = 56;
  const contentWidth = width - padding * 2;
  const mediaHeight = 660;
  const logoSize = 124;

  context.fillStyle = palette.surface;
  context.fillRect(0, 0, width, height);

  context.save();
  clipRoundRect(context, 0, 0, width, mediaHeight, 0);
  if (photo) {
    drawCover(context, photo, 0, 0, width, mediaHeight);
    const scrim = context.createLinearGradient(0, 0, 0, mediaHeight);
    scrim.addColorStop(0, "rgba(0, 0, 0, 0.48)");
    scrim.addColorStop(0.3, "rgba(0, 0, 0, 0.06)");
    scrim.addColorStop(0.6, "rgba(0, 0, 0, 0.16)");
    scrim.addColorStop(1, "rgba(0, 0, 0, 0.62)");
    context.fillStyle = scrim;
    context.fillRect(0, 0, width, mediaHeight);
  } else {
    drawBrandPanel(context, palette, content.businessName, width, mediaHeight);
  }
  context.restore();

  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = palette.onPrimary;
  context.font = font(700, 34);
  context.fillText("tada", padding, padding);
  context.font = font(600, 22);
  context.globalAlpha = 0.82;
  context.fillText(content.isKorean ? "지역 전문가" : "Local experts", padding, padding + 42);
  context.globalAlpha = 1;

  if (content.priceLabel) {
    context.font = font(600, 24);
    context.globalAlpha = 0.9;
    context.fillText(content.isKorean ? "요금" : "Pricing", padding, mediaHeight - logoSize / 2 - 96);
    context.globalAlpha = 1;
    context.font = font(700, 38);
    context.fillText(truncate(context, content.priceLabel, contentWidth), padding, mediaHeight - logoSize / 2 - 64);
  }

  // The logo straddles the photo edge, which is what ties the two halves of a
  // portrait card together — landscape gets that from the vertical split.
  // A hairline ring, not a white one: half this disc sits on the white panel
  // below the photo and a white ring makes it read as a cut-off half circle.
  drawLogo(context, logo, content.businessName, padding, mediaHeight - logoSize / 2, logoSize, palette.line, palette.primarySoft, palette.primary, palette.surface);

  let y = mediaHeight + logoSize / 2 + 32;

  context.fillStyle = palette.ink;
  context.font = font(700, 54);
  y = drawLines(context, wrapLines(context, content.businessName || (content.isKorean ? "업체명" : "Business name"), contentWidth, 2), padding, y, 64) + 6;

  context.fillStyle = palette.primary;
  context.font = font(600, 28);
  context.fillText(truncate(context, content.categoryLabel, contentWidth), padding, y);
  y += 44;

  if (content.description) {
    context.fillStyle = palette.muted;
    context.font = font(400, 26);
    y = drawLines(context, wrapLines(context, content.description, contentWidth, 3), padding, y, 38) + 10;
  }

  y += 14;
  context.strokeStyle = palette.line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(padding, y);
  context.lineTo(width - padding, y);
  context.stroke();
  y += 34;

  const rows: Array<[string, string]> = [];
  if (content.phone) rows.push([content.isKorean ? "전화" : "Phone", content.phone]);
  if (content.email) rows.push([content.isKorean ? "이메일" : "Email", content.email]);
  if (content.website) rows.push([content.isKorean ? "웹사이트" : "Website", content.website]);
  const place = [content.streetAddress, content.location].filter(Boolean).join(", ");
  if (place) rows.push([content.isKorean ? "위치" : "Location", place]);

  const footerTop = height - padding - 40;
  for (const [label, value] of rows) {
    if (y + 52 > footerTop) break;
    context.fillStyle = palette.muted;
    context.font = font(600, 20);
    context.fillText(label.toUpperCase(), padding, y);
    context.fillStyle = palette.ink;
    context.font = font(600, 28);
    context.fillText(truncate(context, value, contentWidth), padding, y + 24);
    y += 68;
  }

  context.fillStyle = palette.muted;
  context.font = font(500, 22);
  context.fillText(truncate(context, content.isKorean ? "Tada에서 더 많은 지역 전문가를 만나보세요" : "Find more local experts on Tada", contentWidth), padding, height - padding - 24);
}

/* --- Listing thumbnail -------------------------------------------------- */

function drawThumbnail(context: CanvasRenderingContext2D, content: ServiceCardContent, palette: Palette, photo: HTMLImageElement | null, logo: HTMLImageElement | null) {
  const { width, height } = serviceCardSizes.thumbnail;
  const padding = 56;

  if (photo) drawCover(context, photo, 0, 0, width, height);
  else drawBrandPanel(context, palette, content.businessName, width, height);

  // Both ends again: the wordmark rides the top of the photo and vanished into
  // a bright kitchen without a scrim above it.
  const scrim = context.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, "rgba(0, 0, 0, 0.46)");
  scrim.addColorStop(0.24, "rgba(0, 0, 0, 0.04)");
  scrim.addColorStop(0.52, "rgba(0, 0, 0, 0.12)");
  scrim.addColorStop(1, "rgba(0, 0, 0, 0.82)");
  context.fillStyle = scrim;
  context.fillRect(0, 0, width, height);

  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = palette.onPrimary;
  context.font = font(700, 32);
  context.fillText("tada", padding, padding);

  // Category pill, top right.
  context.font = font(600, 22);
  const pillLabel = truncate(context, content.categoryLabel, 320);
  const pillWidth = context.measureText(pillLabel).width + 40;
  context.save();
  context.globalAlpha = 0.92;
  context.fillStyle = palette.surface;
  context.beginPath();
  context.roundRect(width - padding - pillWidth, padding - 6, pillWidth, 46, 23);
  context.fill();
  context.restore();
  context.fillStyle = palette.ink;
  context.fillText(pillLabel, width - padding - pillWidth + 20, padding + 6);

  // Identity, bottom left, on the scrim.
  const logoSize = 96;
  const bottom = height - padding;
  drawLogo(context, logo, content.businessName, padding, bottom - logoSize, logoSize, "rgba(255, 255, 255, 0.72)", palette.surface, palette.primary, palette.surface);

  const textX = padding + logoSize + 24;
  const textWidth = width - textX - padding;
  context.fillStyle = palette.onPrimary;
  context.font = font(700, 52);
  context.fillText(truncate(context, content.businessName || (content.isKorean ? "업체명" : "Business name"), textWidth), textX, bottom - logoSize + 4);

  const meta = [content.location, content.priceLabel].filter(Boolean).join("  ·  ");
  context.font = font(500, 28);
  context.globalAlpha = 0.86;
  context.fillText(truncate(context, meta || content.serviceName, textWidth), textX, bottom - 34);
  context.globalAlpha = 1;
}

/* --- Entry points ------------------------------------------------------- */

/** Draws `content` into `canvas` at the format's export size. The canvas is
 *  displayed scaled down by CSS, so one drawing serves both preview and file. */
export async function drawServiceCard(canvas: HTMLCanvasElement, content: ServiceCardContent, format: ServiceCardFormat) {
  const { width, height } = serviceCardSizes[format];
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;

  // Without this the first draw measures fallback metrics and every line wraps
  // in the wrong place.
  await document.fonts?.ready;
  const [photo, logo] = await Promise.all([loadOptionalImage(content.photo), loadOptionalImage(content.logo)]);
  const palette = readPalette();

  context.clearRect(0, 0, width, height);
  if (format === "card") drawBusinessCard(context, content, palette, photo, logo);
  else if (format === "cardPortrait") drawPortraitCard(context, content, palette, photo, logo);
  else drawThumbnail(context, content, palette, photo, logo);
}

export function serviceCardFileName(businessName: string, format: ServiceCardFormat) {
  const slug = businessName.replace(/[^a-z0-9가-힣_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${slug || "tada-service"}-${format}.png`;
}

/** A PNG of what the canvas already shows. Returns null when the canvas was
 *  tainted by a photo the browser would not let us read back. */
export async function serviceCardFile(canvas: HTMLCanvasElement, businessName: string, format: ServiceCardFormat) {
  const name = serviceCardFileName(businessName, format);
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? new File([blob], name, { type: "image/png" }) : null;
  } catch {
    return null;
  }
}

/** The same drawing, off-screen, for callers with nothing on show — the save
 *  button on a directory card renders the card only to hand it over. */
export async function renderServiceCardFile(content: ServiceCardContent, format: ServiceCardFormat) {
  const canvas = document.createElement("canvas");
  await drawServiceCard(canvas, content, format);
  return serviceCardFile(canvas, content.businessName, format);
}

export type ServiceCardSaveResult = "shared" | "downloaded" | "cancelled" | "failed";

/** Phones and tablets get the share sheet, which is the only route a web page
 *  has into the photo album. A mouse gets a straight download instead, because
 *  a share dialog on a desktop is a detour, not a save. */
export async function saveServiceCardFile(file: File | null, title: string): Promise<ServiceCardSaveResult> {
  if (!file) return "failed";

  // `canShare` without `share` is a real combination in the wild, so both are
  // checked before the sheet is treated as available.
  const wantsShareSheet = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (wantsShareSheet && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      // A dismissed sheet is a choice; anything else falls through to a
      // download, including Safari refusing a share whose activation expired
      // while the photo was loading.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
