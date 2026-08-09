"use client";

export type BargainSalePhoto = {
  id: string;
  url: string;
  name?: string;
};

export type BargainSaleItemDraft = {
  photoId: string;
  price: string;
  description: string;
};

export function BargainSaleItemsEditor({ photos, items, onChange }: {
  photos: BargainSalePhoto[];
  items: BargainSaleItemDraft[];
  onChange: (photoId: string, field: "price" | "description", value: string) => void;
}) {
  if (!photos.length) return <p className="bargain-sale-items-empty">Add photos to enter a price and description for every sale item.</p>;

  return <section className="bargain-sale-items" aria-label="Individual sale item details">
    <div className="bargain-sale-items-heading">
      <div><strong>Individual item details</strong><p>Set a price and short description for each photo.</p></div>
      <span>{photos.length} of 10 items</span>
    </div>
    <div className="bargain-sale-items-grid">
      {photos.map((photo, index) => {
        const item = items.find((candidate) => candidate.photoId === photo.id) ?? { photoId: photo.id, price: "", description: "" };
        return <article className="bargain-sale-item" key={photo.id}>
          <img src={photo.url} alt={photo.name ?? `Sale item ${index + 1}`} />
          <div className="bargain-sale-item-fields">
            <strong>Item {index + 1}</strong>
            <label>Price (NZD)<div className="post-price-input"><span>$</span><input type="text" inputMode="decimal" value={item.price} onChange={(event) => onChange(photo.id, "price", event.target.value)} placeholder="0.00" required /></div></label>
            <label>Description<textarea value={item.description} onChange={(event) => onChange(photo.id, "description", event.target.value)} placeholder="Describe this item" maxLength={1_000} required /></label>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
