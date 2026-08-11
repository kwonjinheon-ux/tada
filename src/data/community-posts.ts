import type { TranslationKey } from "@/components/LanguageProvider";

export type CommunityPostType = "event" | "question" | "recommendation" | "free" | "notice" | "housing";

export const communityPostTypeLabelKeys: Record<CommunityPostType, TranslationKey> = {
  event: "communityTypeEvent",
  question: "communityTypeQuestion",
  recommendation: "communityTypeRecommendation",
  free: "communityChipFree",
  notice: "communityTypeNotice",
  housing: "communityTypeHousing",
};

export type CommunityPost = {
  id: string;
  type: CommunityPostType;
  title: string;
  excerpt: string;
  location: string;
  eventDate?: string;
  responseCount?: number;
  timeAgo?: string;
  image?: string;
  imageAlt?: string;
  images?: { src: string; alt: string }[];
};

const fallbackImage = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80";

export const communityPosts: CommunityPost[] = [
  { id: "playgroup-meetup", type: "event", title: "Playgroup meetup — Hamilton Central", excerpt: "Join us for a relaxed morning of play, snacks and coffee!", location: "Hamilton Central", eventDate: "Sat, 24 May · 10:00 AM", responseCount: 12, image: fallbackImage, imageAlt: "Kids playing together" },
  { id: "korean-tutor", type: "question", title: "Looking for a Korean tutor", excerpt: "Hi! I'm looking for a patient Korean tutor for conversational practice.", location: "Flagstaff, Hamilton", responseCount: 3 },
  { id: "best-mechanic", type: "recommendation", title: "Best mechanic in Hamilton?", excerpt: "After a reliable mechanic who's honest and does quality work. Thanks!", location: "Hamilton", responseCount: 12, image: fallbackImage, imageAlt: "Mechanic working on a car" },
  { id: "free-moving-boxes", type: "free", title: "Free moving boxes — come and take", excerpt: "Various sizes available. Pickup in Flagstaff.", location: "Flagstaff, Hamilton", timeAgo: "2h ago", image: fallbackImage, imageAlt: "Stack of moving boxes" },
  { id: "lost-cat", type: "notice", title: "Lost cat in Flagstaff", excerpt: "Fluffy went missing near Te Rapa Rd on 18 May. Please keep an eye out!", location: "Flagstaff, Hamilton", timeAgo: "1d ago", image: fallbackImage, imageAlt: "A cat" },
  { id: "weekend-football", type: "event", title: "Weekend football meetup", excerpt: "Casual game this Saturday. All skill levels welcome!", location: "Swarbrick Park, Hamilton", eventDate: "Sat, 24 May · 3:00 PM" },
  { id: "flatmate-wanted", type: "housing", title: "Flatmate wanted", excerpt: "Double room available in 3-bedroom house. $200/week, bills included.", location: "Hamilton East", timeAgo: "3h ago", image: fallbackImage, imageAlt: "Bedroom available for rent" },
  { id: "babysitter-recommendation", type: "recommendation", title: "Babysitter recommendation", excerpt: "Looking for a kind and reliable babysitter for weekday evenings.", location: "Flagstaff, Hamilton", timeAgo: "2h ago" },
];
