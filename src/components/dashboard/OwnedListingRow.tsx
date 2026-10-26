"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { OwnedListingActions } from "@/components/dashboard/OwnedListingActions";
import { servicesCategoryLabels, type ServiceCategoryId } from "@/data/services";
import { formatMarketPrice } from "@/lib/market/format-price";

export type OwnedListingItem = {
  id: string;
  kind: "market" | "bargain" | "services";
  title: string;
  status: string;
  image: string;
  createdAt: string;
  priceCents?: number;
  categorySlug?: string;
  location?: string;
  reviewCount?: number;
  canEdit: boolean;
  canDelete: boolean;
  canRelist?: boolean;
  canMarkSold?: boolean;
};

const statusKo: Record<string, string> = { published: "판매 중", pending: "검토 중", sold: "거래 완료", archived: "보관됨", hidden: "비공개" };
const serviceStatusKo: Record<string, string> = { published: "공개 중", pending: "검토 중", hidden: "비공개", archived: "보관됨" };
const statusEn: Record<string, string> = { published: "Live", pending: "Under review", sold: "Completed", archived: "Archived", hidden: "Hidden" };

export function OwnedListingRow({ item }: { item: OwnedListingItem }) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const isService = item.kind === "services";
  const category = isService ? servicesCategoryLabels(locale)[item.categorySlug as ServiceCategoryId] ?? item.categorySlug : null;
  const kindLabel = item.kind === "market" ? ko ? "마켓" : "Market" : item.kind === "bargain" ? ko ? "알뜰거래" : "Bargain" : ko ? "서비스" : "Service";
  const statusLabel = ko ? (isService ? serviceStatusKo[item.status] : statusKo[item.status]) ?? item.status : statusEn[item.status] ?? item.status;
  const href = isService ? `/services/${item.id}` : `/market/${item.id}`;
  const date = new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.createdAt));

  return <article className={`listing-row owned-listing-row is-${item.kind}`}>
    <Link className="listing-row-media" href={href} aria-label={ko ? `${item.title} 상세 보기` : `View ${item.title}`}><img src={item.image} alt="" loading="lazy" /></Link>
    <div className="listing-row-body">
      <div className="owned-listing-badges"><span className="owned-listing-kind"><i className={`ms ${isService ? "ms-build" : item.kind === "bargain" ? "ms-sell" : "ms-shopping-bag"}`} aria-hidden="true" />{kindLabel}</span><span className={`owned-listing-status is-${item.status}`}>{statusLabel}</span></div>
      <h2><Link href={href}>{item.title}{!item.canEdit ? <i className="ms ms-chevron-right owned-listing-detail-cue" aria-hidden="true" /> : null}</Link></h2>
      {isService ? <p className="owned-listing-detail">{[category, item.location].filter(Boolean).join(" · ")}</p> : <strong className="listing-row-price">{formatMarketPrice(item.priceCents ?? 0)}</strong>}
      <small className="listing-row-meta">{ko ? "등록일" : "Listed"} {date}</small>
      {isService && (item.reviewCount ?? 0) > 0 ? <Link className="owned-listing-reviews" href={`${href}#reviews`}>{ko ? `후기 ${item.reviewCount}개 보기` : `View ${item.reviewCount} reviews`}</Link> : null}
    </div>
    <OwnedListingActions id={item.id} title={item.title} kind={item.kind} canEdit={item.canEdit} canDelete={item.canDelete} canRelist={item.canRelist} canMarkSold={item.canMarkSold} />
  </article>;
}
