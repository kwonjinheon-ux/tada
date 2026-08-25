type BargainSaleCoverPreviewProps = {
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  type: "moving-sale" | "garage-sale";
  date: string;
  location: string;
  description?: string;
};

export function BargainSaleCoverPreview({ imageUrl, imageAlt, title, type, date, location, description }: BargainSaleCoverPreviewProps) {
  const typeLabel = type === "moving-sale" ? "Moving sale" : "Garage sale";
  return <aside className="bargain-sale-cover-preview" aria-label="Event page cover preview">
    <div className="bargain-sale-cover-preview-frame">
      {imageUrl ? <img src={imageUrl} alt={imageAlt ?? "Sale cover preview"} /> : <div className="bargain-sale-cover-preview-placeholder"><i className="ms ms-home" aria-hidden="true" /></div>}
      <div className="bargain-sale-cover-preview-shade" />
      <div className="bargain-sale-cover-preview-copy">
        <span>{typeLabel}</span>
        <strong>{title || "Your sale title"}</strong>
        <small>{[date, location].filter(Boolean).join(" · ") || "Date and location will appear here"}</small>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  </aside>;
}
