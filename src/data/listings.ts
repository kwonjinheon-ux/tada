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

export const listings: Listing[] = [
  {
    id: "specialized-stumpjumper",
    title: "Specialized Stumpjumper Carbon",
    price: "$2,450",
    location: "Boulder, CO",
    image: "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Specialized mountain bike",
    badge: "Promotion",
    status: "available",
  },
  {
    id: "macbook-pro",
    title: 'MacBook Pro 16" M2 Max',
    price: "$1,899",
    location: "San Francisco, CA",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=80",
    imageAlt: "MacBook laptop on a desk",
    status: "pending",
  },
];

export const quickCategories = ["All", "Smartphones", "Computers", "Laptops", "Tablets", "Audio", "Cameras"];
