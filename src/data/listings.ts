export type ListingStatus = "available" | "pending" | "sold";

export type Listing = {
  id: string;
  title: string;
  price: string;
  location: string;
  image: string;
  imageAlt: string;
  badge?: "Promotion" | "Newly Listed";
  status: ListingStatus;
};

export const listings: Listing[] = [];

export const quickCategories = ["All", "Smartphones", "Computers", "Laptops", "Tablets", "Audio", "Cameras"];
