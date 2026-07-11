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
  {
    id: "canon-ae-1",
    title: "Canon AE-1 Program Vintage Kit",
    price: "$320",
    location: "Brooklyn, NY",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Vintage Canon camera on books",
    badge: "Newly Listed",
    status: "available",
  },
  {
    id: "herman-miller",
    title: "Herman Miller Aeron Chair",
    price: "$850",
    location: "Austin, TX",
    image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Ergonomic office chair in modern office",
    status: "sold",
  },
  {
    id: "gibson-les-paul",
    title: "Gibson Les Paul Standard",
    price: "$1,200",
    location: "Nashville, TN",
    image: "https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Red electric guitar in a living room",
    status: "available",
  },
  {
    id: "sony-headphones",
    title: "Sony WH-1000XM5 Headphones",
    price: "$280",
    location: "Chicago, IL",
    image: "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=700&q=80",
    imageAlt: "White wireless headphones on a desk",
    status: "available",
  },
  {
    id: "dji-mavic",
    title: "DJI Mavic 3 Pro Cine",
    price: "$1,150",
    location: "Portland, OR",
    image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Drone flying above forest",
    status: "pending",
  },
  {
    id: "mechanical-keyboard",
    title: "Custom Mechanical Keyboard",
    price: "$210",
    location: "Seattle, WA",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Custom mechanical keyboard",
    status: "available",
  },
];

export const quickCategories = ["All", "Smartphones", "Computers", "Laptops", "Tablets", "Audio", "Cameras"];

