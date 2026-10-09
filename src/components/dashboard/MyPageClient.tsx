"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { JourneyCard, type ActiveJourneyItem } from "@/components/dashboard/ActiveJourneyCarousel";
import { MyPageDiscoverPanel } from "@/components/dashboard/MyPageDiscoverPanel";

type MyPageData = {
  name: string; avatar: string | null; location: string; joined: string;
  profileComplete: boolean; phoneVerified: boolean; unavailable: boolean;
  unread: number | null; sales: number | null; serviceCount: number | null; postCount: number | null;
  savedCount: number | null; savedSearchCount: number | null; activeListingCount: number | null; activeReservationCount: number | null;
  journeys: ActiveJourneyItem[];
  services: { id: string; provider_name: string; status: string; updated_at: string }[];
  posts: { id: string; title: string; view_count: number; updated_at: string }[];
  activity: { id: string; type: string; title: string; body: string; href: string; created_at: string }[];
};
type Area = "all" | "market" | "services" | "community";
const profileHref = "/market/dashboard/profile";
const inboxHref = "/market/dashboard/messages";
const notificationsHref = "/market/dashboard/notifications";

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="ui-panel my-page-panel"><header className="my-page-heading"><h2>{title}</h2>{action}</header>{children}</section>;
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="my-page-link" href={href}>{children}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link>;
}

export function MyPageClient({ data }: { data: MyPageData | null }) {
  const { locale, t } = useLanguage();
  const ko = locale === "ko";
  const [filter, setFilter] = useState<Area>("all");
  const [showChargeDetails, setShowChargeDetails] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const say = (en: string, kr: string) => ko ? kr : en;
  const countLabel = (value: number | null, unit: string) => value === null ? "—" : ko ? `${value}${unit}` : `${value} ${unit}`;
  if (!data) return <div className="dashboard-content my-page-content"><h1>{t("myPage")}</h1><p role="alert">{say("We couldn't load your activity. Please try again.", "활동 정보를 불러오지 못했습니다. 다시 시도해 주세요.")}</p><Button onClick={() => window.location.reload()}>{say("Try again", "다시 시도")}</Button></div>;
  const checks = [
    { label: say("Profile complete", "프로필 작성"), done: data.profileComplete },
    { label: say("Phone verified", "전화번호 인증"), done: data.phoneVerified },
    { label: say("Location set", "지역 설정"), done: Boolean(data.location) },
  ];
  const charge = Math.round(checks.filter((check) => check.done).length / checks.length * 100);
  const counts = { all: data.journeys.length + data.services.length + data.posts.length, market: data.journeys.length, services: data.services.length, community: data.posts.length };
  const isGettingStarted = counts.all === 0 || checks.some((check) => !check.done);
  const labels = { all: say("All", "전체"), market: say("Market", "마켓"), services: say("Services", "서비스"), community: say("Community", "커뮤니티") };
  const offers = data.journeys.reduce((sum, item) => sum + (item.role === "selling" ? item.newOfferCount : 0), 0);
  const pendingServices = data.services.filter((service) => service.status === "pending");
  const attention = [
    offers ? { area: "market" as const, icon: "ms-handshake", title: say(`${offers} offers to review`, `확인할 제안 ${offers}건`), description: say("Review offers and keep your trade moving.", "제안을 검토하고 거래를 이어가세요."), href: inboxHref, action: say("Review offers", "제안 검토") } : null,
    !offers && data.unread ? { area: "market" as const, icon: "ms-chat", title: say(`${data.unread} unread messages`, `읽지 않은 메시지 ${data.unread}개`), description: say("A neighbour is waiting to hear from you.", "이웃이 답장을 기다리고 있어요."), href: inboxHref, action: say("Open messages", "메시지 보기") } : null,
    pendingServices.length ? { area: "services" as const, icon: "ms-work", title: say(`${pendingServices.length} services under review`, `서비스 ${pendingServices.length}개 검토 중`), description: say("We’ll let you know when your listing is ready.", "등록이 준비되면 알려드릴게요."), href: `/services/${pendingServices[0].id}/edit`, action: say("View service", "서비스 보기") } : null,
    data.activeReservationCount ? { area: "market" as const, icon: "ms-event-available", title: say(`${data.activeReservationCount} active pickups`, `진행 중인 예약 ${data.activeReservationCount}건`), description: say("Check pickup times and the latest status.", "수령 시간과 최신 상태를 확인하세요."), href: "/market/dashboard/reservations", action: say("View pickups", "예약 보기") } : null,
    checks.some((check) => !check.done) ? { area: "market" as const, icon: "ms-account-circle", title: say("Finish setting up your profile", "프로필 설정을 완료해 주세요"), description: say("A complete profile helps neighbours recognise and trust you.", "완성된 프로필은 이웃이 나를 더 쉽게 알아보고 신뢰하는 데 도움이 됩니다."), href: profileHref, action: say("Complete profile", "프로필 완성") } : null,
  ].filter((item): item is { area: "market" | "services"; icon: string; title: string; description: string; href: string; action: string } => Boolean(item)).slice(0, 3);
  const progress: { key: string; area: Area; content: ReactNode }[] = [
    ...data.journeys.map((item) => ({ key: `market-${item.role}-${item.id}`, area: "market" as const, content: <JourneyCard item={item} /> })),
    ...data.services.map((service) => ({ key: `service-${service.id}`, area: "services" as const, content: <article className="ui-panel my-page-work is-services"><span className="my-page-tag">{labels.services}</span><i className="ms ms-work my-page-work-icon" aria-hidden="true" /><h3>{service.provider_name}</h3><p>{service.status === "published" ? say("Published", "공개 중") : service.status === "pending" ? say("Under review", "검토 중") : say("Hidden", "비공개")}</p><ActionLink href={`/services/${service.id}/edit`}>{say("Manage service", "서비스 관리")}</ActionLink></article> })),
    ...data.posts.map((post) => ({ key: `post-${post.id}`, area: "community" as const, content: <article className="ui-panel my-page-work is-community"><span className="my-page-tag">{labels.community}</span><i className="ms ms-forum my-page-work-icon" aria-hidden="true" /><h3>{post.title}</h3><p><i className="ms ms-visibility" aria-hidden="true" /> {post.view_count} {say("views", "조회")}</p><ActionLink href={`/community/${post.id}`}>{say("View post", "게시글 보기")}</ActionLink></article> })),
  ].filter((item) => filter === "all" || item.area === filter);
  const libraryShortcuts = [
    { icon: "ms-favorite", title: say("Saved items", "저장한 항목"), value: data.savedCount, unit: say("saved", "개 저장"), href: "/market/wishlist", description: say("Items, services and posts to revisit.", "나중에 다시 볼 상품·서비스·게시글") },
    { icon: "ms-search", title: say("Saved searches", "저장한 검색"), value: data.savedSearchCount, unit: say("alerts", "개 알림"), href: "/market/dashboard/keywords", description: say("Get notified when a local match appears.", "원하는 항목이 올라오면 알려드려요.") },
  ];
  const manageShortcuts = [
    { icon: "ms-list-alt", title: say("My listings", "내 등록물"), value: data.activeListingCount, unit: say("active", "개 진행 중"), href: "/market/dashboard/listings", description: say("Manage your market and service listings.", "마켓과 서비스 등록물을 관리하세요.") },
    { icon: "ms-event-available", title: say("Pickups & reservations", "예약 및 수령"), value: data.activeReservationCount, unit: say("active", "건 진행 중"), href: "/market/dashboard/reservations", description: say("Keep upcoming handovers on track.", "예정된 수령과 예약을 확인하세요.") },
  ];
  return <div className="dashboard-content my-page-content">
    <header className="my-page-title"><h1>{t("myPage")}</h1><p>{say("Your neighbourhood life, in one place.", "나의 동네 생활을 한눈에.")}</p></header>
    {data.unavailable ? <p className="my-page-notice" role="status">{say("Some activity couldn't be loaded. Refresh to try again.", "일부 활동 정보를 불러오지 못했습니다. 새로고침해 주세요.")}</p> : null}
    <div className="my-page-layout"><div className="my-page-main">
      <section className="ui-panel my-page-profile" aria-label={say("Your profile", "내 프로필")}>
        <div className="my-page-identity"><Link href={profileHref} aria-label={say("Edit profile photo", "프로필 사진 수정")} className="my-page-avatar-link"><Avatar src={data.avatar} name={data.name} className="my-page-avatar" /><span><i className="ms ms-photo-camera" aria-hidden="true" /></span></Link><div><div className="my-page-name"><h2>{data.name}</h2><span className="ui-pill ui-pill--warning">{say("Member", "회원")}</span></div><p><i className="ms ms-location-on" aria-hidden="true" /> {data.location || say("Set your location", "지역을 설정해 주세요")}</p><p><i className="ms ms-calendar-today" aria-hidden="true" /> {say("Joined", "가입")} {new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { month: "long", year: "numeric" }).format(new Date(data.joined))}</p><p>{say("Good people, great deals, better community.", "좋은 이웃, 기분 좋은 거래, 함께하는 동네.")}</p><Link className="ui-button ui-button--secondary ui-button--sm" href={profileHref}>{say("Edit profile", "프로필 수정")}</Link></div></div>
        <div className="my-page-charge"><h2>My Tada Charge</h2><div className="my-page-charge-content"><div className="my-page-ring" style={{ "--charge": `${charge}%` } as CSSProperties} role="img" aria-label={say(`Profile setup ${charge}% complete`, `프로필 설정 ${charge}% 완료`)}><span><i className="ms ms-bolt" aria-hidden="true" /><strong>{charge}%</strong></span></div><div><ul>{checks.map((check) => <li key={check.label}><i className={`ms ${check.done ? "ms-check-circle" : "ms-circle ms--outline"}`} aria-hidden="true" />{check.label}</li>)}</ul><Button variant="ghost" size="sm" aria-expanded={showChargeDetails} aria-controls="charge-details" onClick={() => setShowChargeDetails(!showChargeDetails)}>{say("View details", "자세히 보기")} <i className="ms ms-arrow-forward" aria-hidden="true" /></Button></div></div>{showChargeDetails ? <p id="charge-details">{say("Each completed step contributes equally to your profile setup score. This is not a trust rating or identity verification.", "세 가지 설정의 완료 여부를 같은 비중으로 계산합니다. 신뢰 점수나 신원 인증을 의미하지 않습니다.")} <Link href={profileHref}>{say("Complete your profile", "프로필 완성하기")}</Link></p> : null}</div>
      </section>
      <Panel title={say("Needs your attention", "지금 확인할 일")} action={<ActionLink href={notificationsHref}>{say("View notifications", "알림 보기")}</ActionLink>}><div className="my-page-today">{attention.map((item) => <article className={`ui-panel my-page-task is-${item.area}`} key={item.href}><i className={`ms ${item.icon} my-page-task-icon`} aria-hidden="true" /><div><span className="my-page-tag">{labels[item.area]}</span><h3>{item.title}</h3><p>{item.description}</p><ActionLink href={item.href}>{item.action}</ActionLink></div></article>)}</div>{!attention.length ? <div className="my-page-all-caught-up"><i className="ms ms-check-circle" aria-hidden="true" /><div><strong>{say("You’re all caught up", "지금은 확인할 일이 없어요")}</strong><p>{say("New offers, messages and updates will appear here.", "새 제안, 메시지, 중요한 업데이트가 여기에 표시됩니다.")}</p></div></div> : null}</Panel>
      <Panel title={say("In progress & my posts", "진행 중인 활동과 내 글")}><div className="my-page-filters" aria-label={say("Filter activity", "활동 필터")}>{(Object.keys(labels) as Area[]).map((area) => <Button key={area} variant={filter === area ? "primary" : "ghost"} size="sm" pill aria-pressed={filter === area} onClick={() => { setFilter(area); setShowAll(false); }}>{labels[area]} ({counts[area]})</Button>)}</div><div className="my-page-progress">{(showAll ? progress : progress.slice(0, 4)).map((item) => <div className="my-page-progress-item" key={item.key}>{item.content}</div>)}</div>{!progress.length ? <p className="my-page-empty">{say("No activity in this section yet. Explore your neighbourhood to get started.", "아직 이 영역의 활동이 없습니다. 우리 동네를 둘러보며 시작해 보세요.")} <Link href={filter === "services" ? "/services" : filter === "community" ? "/community" : "/market"}>{say("Explore", "둘러보기")}</Link></p> : null}{progress.length > 4 ? <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>{showAll ? say("Show less", "간략히 보기") : say(`Show all ${progress.length}`, `${progress.length}개 모두 보기`)}</Button> : null}<p className="my-page-footnote">{say("A snapshot of your recent activity. Up to 6 services and 6 community posts are shown.", "최근 활동 요약입니다. 서비스와 커뮤니티 글은 각각 최대 6개씩 표시됩니다.")}</p></Panel>
      <Panel title={say("Recent activity", "최근 활동")} action={<ActionLink href={notificationsHref}>{say("View all", "전체 보기")}</ActionLink>}><div className="my-page-activity">{data.activity.map((item) => <Link href={item.href.startsWith("/") && !item.href.startsWith("//") ? item.href : notificationsHref} key={item.id}><i className={`ms ${item.type === "wishlist" ? "ms-favorite" : item.type === "message" ? "ms-chat" : "ms-notifications"}`} aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.body}</p><time dateTime={item.created_at}>{new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { day: "numeric", month: "short" }).format(new Date(item.created_at))}</time></div></Link>)}</div>{!data.activity.length ? <p className="my-page-empty">{say("Your latest marketplace updates will appear here.", "마켓의 새로운 소식이 여기에 표시됩니다.")}</p> : null}</Panel>
    </div><aside className="my-page-rail" aria-label={say("Your Tada shortcuts", "나의 타다 바로가기")}>{isGettingStarted ? <MyPageDiscoverPanel /> : null}<Panel title={say("Saved for later", "나중에 볼 항목")}><div className="my-page-shortcuts">{libraryShortcuts.map((shortcut) => <Link className="my-page-shortcut" href={shortcut.href} key={shortcut.href}><i className={`ms ${shortcut.icon}`} aria-hidden="true" /><div><strong>{shortcut.title}</strong><span>{countLabel(shortcut.value, shortcut.unit)}</span><small>{shortcut.description}</small></div><i className="ms ms-arrow-forward" aria-hidden="true" /></Link>)}</div></Panel><Panel title={say("Manage my activity", "내 활동 관리")}><div className="my-page-shortcuts">{manageShortcuts.map((shortcut) => <Link className="my-page-shortcut" href={shortcut.href} key={shortcut.href}><i className={`ms ${shortcut.icon}`} aria-hidden="true" /><div><strong>{shortcut.title}</strong><span>{countLabel(shortcut.value, shortcut.unit)}</span><small>{shortcut.description}</small></div><i className="ms ms-arrow-forward" aria-hidden="true" /></Link>)}</div></Panel><Panel title={say("Start something new", "새로 시작하기")}><div className="my-page-create-actions"><Link className="ui-button ui-button--secondary ui-button--sm" href="/market/create"><i className="ms ms-add" aria-hidden="true" /> {say("List an item", "상품 등록")}</Link><Link className="ui-button ui-button--secondary ui-button--sm" href="/services/create"><i className="ms ms-work" aria-hidden="true" /> {say("List a service", "서비스 등록")}</Link><Link className="ui-button ui-button--secondary ui-button--sm" href="/community/create"><i className="ms ms-forum" aria-hidden="true" /> {say("Write a post", "글쓰기")}</Link></div></Panel><Panel title={say("Your contribution", "나의 동네 활동")}><div className="my-page-impact">{[[data.sales, say("Completed sales", "완료한 판매")], [data.serviceCount, say("Services listed", "등록한 서비스")], [data.postCount, say("Community posts", "커뮤니티 글")]].map(([value, label]) => <div key={label}><strong>{value ?? "—"}</strong><span>{label}</span></div>)}</div><p className="my-page-footnote">{say("Small actions make a stronger community.", "작은 활동이 더 좋은 동네를 만듭니다.")}</p></Panel></aside></div>
  </div>;
}
