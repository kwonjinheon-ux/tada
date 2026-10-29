"use client";

import { ProfileSettingsEditor } from "@/components/dashboard/ProfileSettingsEditor";
import type { SupportedLocale } from "@/components/LanguageProvider";

export type ProfileVisibility = "public" | "members" | "interested_users" | "trade_partners" | "private";
export type Profile = { display_name: string; phone: string | null; location_mode: "manual" | "current"; region_city: string | null; region_suburb: string | null; main_location: string | null; sub_location: string | null; locality: string | null; raw_suburb: string | null; region: string | null; latitude: number | null; longitude: number | null; preferred_locale: SupportedLocale; profile_visibility: ProfileVisibility };
export type ProfileSettingsProps = { email: string; emailVerified: boolean; initialVerifiedPhone: string; completedPurchaseCount: number | null; completedSaleCount: number | null; avatarPath?: string | null; avatarUrl?: string | null; memberSince?: string | null; initialProfile: Profile; initialDescriptionTextSizeStep: number; userId?: string; hasPassword?: boolean; authProvider?: string | null; initialPendingEmail?: string | null; profileVisibilityAvailable?: boolean };

export function ProfileSettingsForm(props: ProfileSettingsProps) {
  return <ProfileSettingsEditor {...props} />;
}
