"use client";

import { Button } from "@/components/ui/Button";

export type BargainSalePhoto = {
  id: string;
  url: string;
  name?: string;
};

export type BargainSaleItemDraft = {
  photoId: string;
  title: string;
  category: string;
  price: string;
  description: string;
};

const itemCategories = ["Furniture", "Clothing", "Kitchen", "Toys", "Media", "Collectibles", "Electronics", "Other"];

export function BargainSaleItemsEditor({ photos, items, onChange, onAddItem, onRemoveItem, onGenerateDescriptions, isGeneratingDescriptions, generationProgress, generationError }: {
  photos: BargainSalePhoto[];
  items: BargainSaleItemDraft[];
  onChange: (photoId: string, field: "title" | "category" | "price" | "description", value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (photoId: string) => void;
  onGenerateDescriptions: () => void;
  isGeneratingDescriptions: boolean;
  generationProgress: number;
  generationError: string | null;
}) {
  if (!photos.length) return <section className="bargain-sale-items bargain-sale-items-empty" aria-label="Itemized inventory"><div><strong>Itemized inventory</strong><p>Add photos to create individual listing slots.</p></div><Button className="bargain-sale-add-item" variant="secondary" size="sm" onClick={onAddItem}><i className="fa-solid fa-plus" aria-hidden="true" /> Add your first item</Button></section>;

  return <section className="bargain-sale-items" aria-label="Individual sale item details">
    <div className="bargain-sale-items-heading">
      <div><strong>Itemized inventory</strong><p>Upload photos to create listing slots, then add details for every item.</p></div>
      <Button className="bargain-sale-add-item" variant="secondary" size="sm" onClick={onAddItem}><i className="fa-solid fa-plus" aria-hidden="true" /> Add another item</Button>
      <span>{photos.length} of 10 items</span>
    </div>
    <section className="post-ai-generator bargain-item-ai-generator" aria-label="AI item descriptions">
      <div className="post-ai-action-row">
        {isGeneratingDescriptions ? (
          <div className="post-ai-progress" role="progressbar" aria-label="Generating item descriptions" aria-valuemin={0} aria-valuemax={100} aria-valuenow={generationProgress}>
            <span className="post-ai-progress-fill" style={{ width: `${generationProgress}%` }} />
            <span className="post-ai-progress-label">Writing item descriptions {generationProgress}%</span>
          </div>
        ) : (
          <button className="post-ai-generate-button" type="button" onClick={onGenerateDescriptions}>
            <span className="post-ai-gpt-mark" aria-hidden="true">GPT</span>
            <span>Generate item descriptions with ChatGPT</span>
          </button>
        )}
      </div>
      {generationError ? <p className="post-ai-error" role="alert">{generationError}</p> : null}
    </section>
    <div className="bargain-sale-items-grid">
      {photos.map((photo, index) => {
        const item = items.find((candidate) => candidate.photoId === photo.id) ?? { photoId: photo.id, title: "", category: "", price: "", description: "" };
        return <article className="bargain-sale-item" key={photo.id}>
          <img src={photo.url} alt={photo.name ?? `Sale item ${index + 1}`} />
          <div className="bargain-sale-item-fields">
            <div className="bargain-sale-item-topline"><strong>Item {index + 1}</strong><button type="button" onClick={() => onRemoveItem(photo.id)} aria-label={`Remove item ${index + 1}`}><i className="fa-solid fa-trash-can" aria-hidden="true" /> Remove</button></div>
            <div className="bargain-sale-item-meta"><label>Item title<input type="text" value={item.title} onChange={(event) => onChange(photo.id, "title", event.target.value)} placeholder="e.g. Oak dining table" required /></label><label>Category<select value={item.category} onChange={(event) => onChange(photo.id, "category", event.target.value)} required><option value="">Select category</option>{itemCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
            <label>Price (NZD)<div className="post-price-input"><span>$</span><input type="text" inputMode="decimal" value={item.price} onChange={(event) => onChange(photo.id, "price", event.target.value)} placeholder="0.00" required /></div></label>
            <label>Description<textarea value={item.description} onChange={(event) => onChange(photo.id, "description", event.target.value)} placeholder="Describe this item" maxLength={1_000} required /></label>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
