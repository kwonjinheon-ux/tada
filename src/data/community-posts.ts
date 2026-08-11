export type CommunityPostType = "event" | "question" | "recommendation" | "free" | "notice" | "housing";

export const communityPostTypes: Record<CommunityPostType, { label: string; icon: string }> = {
  event: { label: "Event", icon: "fa-calendar-day" },
  question: { label: "Question", icon: "fa-circle-question" },
  recommendation: { label: "Recommendation", icon: "fa-thumbs-up" },
  free: { label: "Free", icon: "fa-gift" },
  notice: { label: "Notice", icon: "fa-triangle-exclamation" },
  housing: { label: "Housing", icon: "fa-house-chimney" },
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
};

export const communityPosts: CommunityPost[] = [
  { id: "playgroup-meetup", type: "event", title: "Playgroup meetup — Hamilton Central", excerpt: "Join us for a relaxed morning of play, snacks and coffee!", location: "Hamilton Central", eventDate: "Sat, 24 May · 10:00 AM", responseCount: 12 },
  { id: "korean-tutor", type: "question", title: "Looking for a Korean tutor", excerpt: "Hi! I'm looking for a patient Korean tutor for conversational practice.", location: "Flagstaff, Hamilton", responseCount: 3 },
  { id: "best-mechanic", type: "recommendation", title: "Best mechanic in Hamilton?", excerpt: "After a reliable mechanic who's honest and does quality work. Thanks!", location: "Hamilton", responseCount: 12 },
  { id: "free-moving-boxes", type: "free", title: "Free moving boxes — come and take", excerpt: "Various sizes available. Pickup in Flagstaff.", location: "Flagstaff, Hamilton", timeAgo: "2h ago" },
  { id: "lost-cat", type: "notice", title: "Lost cat in Flagstaff", excerpt: "Fluffy went missing near Te Rapa Rd on 18 May. Please keep an eye out!", location: "Flagstaff, Hamilton", timeAgo: "1d ago" },
  { id: "weekend-football", type: "event", title: "Weekend football meetup", excerpt: "Casual game this Saturday. All skill levels welcome!", location: "Swarbrick Park, Hamilton", eventDate: "Sat, 24 May · 3:00 PM" },
  { id: "flatmate-wanted", type: "housing", title: "Flatmate wanted", excerpt: "Double room available in 3-bedroom house. $200/week, bills included.", location: "Hamilton East", timeAgo: "3h ago" },
  { id: "babysitter-recommendation", type: "recommendation", title: "Babysitter recommendation", excerpt: "Looking for a kind and reliable babysitter for weekday evenings.", location: "Flagstaff, Hamilton", timeAgo: "2h ago" },
];
