import { z } from "zod";
import { AD_PLACEMENTS, AD_PROVIDERS, AD_SERVING_MODES } from "@/lib/advertising/types";

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "Use an https:// URL.");
export const advertisingInputSchema = z.object({
  provider: z.enum(AD_PROVIDERS), name: z.string().trim().min(2).max(120), sponsorName: z.string().trim().max(120).nullable().optional(),
  campaignName: z.string().trim().max(120).nullable().optional(), placement: z.enum(AD_PLACEMENTS), priority: z.number().int().min(0).max(9999).default(0),
  frequencyLevel: z.number().int().min(1).max(5).default(1), adsenseClientId: z.string().trim().max(120).nullable().optional(), adsenseSlotId: z.string().trim().max(120).nullable().optional(),
  adsenseFormat: z.string().trim().max(40).nullable().optional(), desktopImageUrl: httpsUrl.nullable().optional(), mobileImageUrl: httpsUrl.nullable().optional(),
  destinationUrl: httpsUrl.nullable().optional(), altText: z.string().trim().max(240).nullable().optional(), showOnDesktop: z.boolean().default(true), showOnMobile: z.boolean().default(false),
  allowResponsiveFallback: z.boolean().default(false), openInNewTab: z.boolean().default(true), dailyImpressionCap: z.number().int().positive().nullable().optional(), totalImpressionCap: z.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional(), isActive: z.boolean().default(false), adminNotes: z.string().trim().max(5000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.provider === "adsense" && (!value.adsenseClientId || !value.adsenseSlotId)) ctx.addIssue({ code: "custom", message: "AdSense client ID and slot ID are required.", path: ["adsenseSlotId"] });
  if (value.provider === "sponsor") {
    if (!value.sponsorName || !value.desktopImageUrl || !value.destinationUrl || !value.altText) ctx.addIssue({ code: "custom", message: "Sponsor name, desktop image, destination URL and alt text are required.", path: ["sponsorName"] });
    if (value.showOnMobile && !value.mobileImageUrl && !value.allowResponsiveFallback) ctx.addIssue({ code: "custom", message: "Add a mobile image or explicitly allow responsive fallback.", path: ["mobileImageUrl"] });
  }
  if (value.startsAt && value.endsAt && new Date(value.startsAt) > new Date(value.endsAt)) ctx.addIssue({ code: "custom", message: "End date must be after the start date.", path: ["endsAt"] });
});
export const placementSettingsSchema = z.object({ placement: z.enum(AD_PLACEMENTS), servingMode: z.enum(AD_SERVING_MODES), sponsorPercentage: z.number().int().min(0).max(100), adsensePercentage: z.number().int().min(0).max(100), desktopFeedInterval: z.number().int().min(1).max(48), mobileFeedInterval: z.number().int().min(1).max(48), isEnabled: z.boolean() }).superRefine((value, ctx) => { if (value.servingMode === "weighted_mix" && value.sponsorPercentage + value.adsensePercentage !== 100) ctx.addIssue({ code: "custom", message: "Sponsor and AdSense percentages must total 100.", path: ["adsensePercentage"] }); });
