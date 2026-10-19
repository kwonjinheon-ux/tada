"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { JourneyCard, ProgressStepper, type ActiveJourneyItem } from "@/components/dashboard/ActiveJourneyCarousel";
import { MyPageDiscoverPanel } from "@/components/dashboard/MyPageDiscoverPanel";
import { SavedServiceCard, type SavedServiceSummary } from "@/components/dashboard/AccountPagePatterns";

type MyPageData = {
  name: string; avatar: string | null; location: string; joined: string;
  profileComplete: boolean; phoneVerified: boolean; unavailable: boolean;
  unread: number | null; sales: number | null; serviceCount: number | null; postCount: number | null;
  savedServiceCount: number | null; savedServices: SavedServiceSummary[];
  savedCount: number | null; savedSearchCount: number | null; activeListingCount: number | null; activeReservationCount: number | null;
  journeys: ActiveJourneyItem[];
  services: { id: string; provider_name: string; status: string; updated_at: string; imageUrl?: string | null }[];
  posts: { id: string; title: string; view_count: number; updated_at: string; imageUrl?: string | null }[];
  activity: { id: string; type: string; title: string; body: string; href: string; created_at: string }[];
};
type Area = "all" | "market" | "services" | "community";
const profileHref = "/market/dashboard/profile";
const inboxHref = "/market/dashboard/messages";
const notificationsHref = "/market/dashboard/notifications";

function Panel({ title, children, action, filters, className = "" }: { title: ReactNode; children: ReactNode; action?: ReactNode; filters?: ReactNode; className?: string }) {
  return <section className={`ui-panel my-page-panel ${className}`}><header className="my-page-heading"><h2>{title}</h2>{filters}{action}</header>{children}</section>;
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="my-page-link" href={href}>{children}<i className="ms ms-arrow-forward" aria-hidden="true" /></Link>;
}

export function MyPageClient({ data }: { data: MyPageData | null }) {
  const { locale, t } = useLanguage();
  const ko = locale === "ko";
  const [filter, setFilter] = useState<Area>("all");
  const [showAll, setShowAll] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "message" | "notification">("all");
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
  const labels = { all: say("All", "전체"), market: say("Market", "마켓"), services: say("Services", "서비스"), community: say("Community", "커뮤니티") };
  const offers = data.journeys.reduce((sum, item) => sum + (item.role === "selling" ? item.newOfferCount : 0), 0);
  const pendingServices = data.services.filter((service) => service.status === "pending");
  const attention = [
    offers ? { area: "market" as const, icon: "ms-handshake", title: say(`${offers} offers to review`, `확인할 제안 ${offers}건`), description: say("Review offers and keep your trade moving.", "제안을 검토하고 거래를 이어가세요."), href: inboxHref, action: say("Review offers", "제안 검토") } : null,
    data.unread ? { area: "account" as const, icon: "ms-chat", title: say("New messages", "새 문의 도착"), description: say(`${data.unread} unread messages are waiting for you.`, `확인하지 않은 문의 ${data.unread}건이 있어요.`), href: inboxHref, action: say("Open messages", "메시지 보기") } : null,
    pendingServices.length ? { area: "services" as const, icon: "ms-work", title: say(`${pendingServices.length} services under review`, `서비스 ${pendingServices.length}개 검토 중`), description: say("We’ll let you know when your listing is ready.", "등록이 준비되면 알려드릴게요."), href: `/services/${pendingServices[0].id}/edit`, action: say("View service", "서비스 보기") } : null,
    data.activeReservationCount ? { area: "market" as const, icon: "ms-event-available", title: say("Check your reservations", "예약 확인 필요"), description: say(`${data.activeReservationCount} active reservations to check.`, `진행 중인 예약 ${data.activeReservationCount}건이 있어요.`), href: "/market/dashboard/reservations", action: say("View pickups", "예약 보기") } : null,
    checks.some((check) => !check.done) ? { area: "account" as const, icon: data.phoneVerified ? "ms-account-circle" : "ms-call", title: data.phoneVerified ? say("Complete your profile", "프로필 작성 필요") : say("Verify your phone", "전화번호 인증 필요"), description: say("Help neighbours recognise and trust you.", "더 안전한 거래를 위해 내 정보를 확인해 주세요."), href: profileHref, action: say("Complete profile", "프로필 완성") } : null,
  ].filter((item): item is { area: "market" | "services" | "account"; icon: string; title: string; description: string; href: string; action: string } => Boolean(item)).slice(0, 3);
  const progress: { key: string; area: Area; content: ReactNode }[] = [
    ...data.journeys.map((item) => ({ key: `market-${item.role}-${item.id}`, area: "market" as const, content: <JourneyCard item={item} sectionLabel={`${labels.market} · ${item.role === "buying" ? say("Buying", "구매 중") : say("Selling", "판매 중")}`} /> })),
    ...data.services.map((service) => ({ key: `service-${service.id}`, area: "services" as const, content: <article className="ui-panel my-page-work is-services"><span className="my-page-tag">{labels.services}</span>{service.imageUrl ? <img className="my-page-work-image" src={service.imageUrl} alt="" /> : <i className="ms ms-build my-page-work-icon" aria-hidden="true" />}<h3>{service.provider_name}</h3><p>{service.status === "published" ? say("Published", "공개 중") : service.status === "pending" ? say("Under review", "검토 중") : say("Hidden", "비공개")}</p><ProgressStepper steps={[say("Listed", "등록"), say("Review", "검토"), say("Published", "공개")]} currentIndex={service.status === "published" ? 2 : service.status === "pending" ? 1 : 0} ariaLabel={say(`Service is ${service.status}`, `서비스는 현재 ${service.status === "published" ? "공개" : service.status === "pending" ? "검토" : "등록"} 단계`)} /><ActionLink href={`/services/${service.id}/edit`}>{say("Manage service", "서비스 관리")}</ActionLink></article> })),
    ...data.posts.map((post) => ({ key: `post-${post.id}`, area: "community" as const, content: <article className="ui-panel my-page-work is-community"><span className="my-page-tag">{labels.community}</span>{post.imageUrl ? <img className="my-page-work-image" src={post.imageUrl} alt="" /> : <i className="ms ms-forum my-page-work-icon" aria-hidden="true" />}<h3>{post.title}</h3><p><i className="ms ms-visibility" aria-hidden="true" /> {post.view_count} {say("views", "조회")}</p><ActionLink href={`/community/${post.id}`}>{say("View post", "게시글 보기")}</ActionLink></article> })),
  ].filter((item) => filter === "all" || item.area === filter);
  // Keep a representative first row instead of letting many market listings
  // hide all service and community activity. Each tab still lists its own items.
  const featured = filter === "all" ? [
    ...progress.filter((item) => item.area === "market").slice(0, 2),
    ...progress.filter((item) => item.area === "services").slice(0, 1),
    ...progress.filter((item) => item.area === "community").slice(0, 1),
  ] : progress.slice(0, 4);
  const featuredKeys = new Set(featured.map((item) => item.key));
  const preview = [...featured, ...progress.filter((item) => !featuredKeys.has(item.key))].slice(0, 4);
  const libraryShortcuts = [
    { icon: "ms-favorite", title: say("All saved items", "전체 찜 목록"), value: data.savedCount, unit: say("saved", "개 저장"), href: "/market/wishlist", description: say("Saved listings, posts and services.", "저장한 상품·글·서비스 전체") },
    { icon: "ms-search", title: say("Keyword alerts", "키워드 알림"), value: data.savedSearchCount, unit: say("alerts", "개 알림"), href: "/market/dashboard/keywords", description: say("Get notified when a local match appears.", "원하는 항목이 올라오면 알려드려요.") },
  ];
  const manageShortcuts = [
    { icon: "ms-list-alt", title: say("My items & services", "내 상품·서비스"), value: data.activeListingCount, unit: say("active", "개 진행 중"), href: "/market/dashboard/listings", description: say("Manage your market and service listings.", "등록한 상품과 서비스를 관리하세요.") },
    { icon: "ms-event-available", title: say("Pickups & reservations", "예약 및 수령"), value: data.activeReservationCount, unit: say("active", "건 진행 중"), href: "/market/dashboard/reservations", description: say("Keep upcoming handovers on track.", "예정된 수령과 예약을 확인하세요.") },
  ];
  const savedForLaterPanel = <Panel title={say("Saved & alerts", "나의 찜 & 알림")}><div className="my-page-shortcuts">{libraryShortcuts.map((shortcut) => <Link className="my-page-shortcut" href={shortcut.href} key={shortcut.href}><i className={`ms ${shortcut.icon}`} aria-hidden="true" /><div><strong>{shortcut.title}</strong><span>{countLabel(shortcut.value, shortcut.unit)}</span><small>{shortcut.description}</small></div><i className="ms ms-arrow-forward" aria-hidden="true" /></Link>)}</div></Panel>;
  const manageActivityPanel = <Panel title={say("My listings & reservations", "내 등록·예약")}><div className="my-page-shortcuts">{manageShortcuts.map((shortcut) => <Link className="my-page-shortcut" href={shortcut.href} key={shortcut.href}><i className={`ms ${shortcut.icon}`} aria-hidden="true" /><div><strong>{shortcut.title}</strong><span>{countLabel(shortcut.value, shortcut.unit)}</span><small>{shortcut.description}</small></div><i className="ms ms-arrow-forward" aria-hidden="true" /></Link>)}</div></Panel>;
  const contributionPanel = <Panel title={say("Your Tada footprint", "나의 타다 발자국")}><div className="my-page-impact">{[[data.sales, say("Completed sales", "완료한 판매")], [data.serviceCount, say("Services listed", "등록한 서비스")], [data.postCount, say("Community posts", "커뮤니티 글")]].map(([value, label]) => <div key={label}><strong>{value ?? "—"}</strong><span>{label}</span></div>)}</div><p className="my-page-footnote">{say("Small actions make a stronger community.", "작은 활동이 더 좋은 동네를 만듭니다.")}</p></Panel>;
  return <div className="dashboard-content my-page-content my-page-domain-preview my-page-reference">
    <header className="my-page-title"><h1>{t("myPage")}</h1><p>{say("Your neighbourhood life, in one place.", "나의 동네 생활을 한눈에.")}</p></header>
    <nav className="my-page-mobile-shortcuts" aria-label={say("Quick actions", "빠른 이동")}>
      <Link href={inboxHref}><i className="ms ms-chat" aria-hidden="true" /><span>{say("Messages", "메시지")}</span>{data.unread ? <strong>{data.unread}</strong> : null}</Link>
      <Link href="/market/wishlist"><i className="ms ms-favorite" aria-hidden="true" /><span>{say("Saved", "찜 목록")}</span></Link>
      <Link href="/market/dashboard/listings"><i className="ms ms-list-alt" aria-hidden="true" /><span>{say("My listings", "내 등록")}</span></Link>
    </nav>
    {data.unavailable ? <p className="my-page-notice" role="status">{say("Some activity couldn't be loaded. Refresh to try again.", "일부 활동 정보를 불러오지 못했습니다. 새로고침해 주세요.")}</p> : null}
    <div className="my-page-layout"><div className="my-page-main">
      <section className="ui-panel my-page-profile" aria-label={say("Your profile", "내 프로필")}>
        <div className="my-page-identity">
          <Link href={profileHref} aria-label={say("Edit profile photo", "프로필 사진 수정")} className="my-page-avatar-link"><Avatar src={data.avatar} name={data.name} className="my-page-avatar" /><span><i className="ms ms-photo-camera" aria-hidden="true" /></span></Link>
          <div>
            <div className="my-page-name"><h2>{data.name}</h2><span className="ui-pill ui-pill--warning">{say("Member", "회원")}</span></div>
            <p><i className="ms ms-location-on" aria-hidden="true" /> {data.location || say("Set your location", "지역을 설정해 주세요")}</p>
            <p className="my-page-profile-extra"><i className="ms ms-calendar-today" aria-hidden="true" /> {say("Joined", "가입")} {new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { month: "long", year: "numeric" }).format(new Date(data.joined))}</p>
            <p className="my-page-profile-extra">{say("Good people, great deals, better community.", "좋은 이웃, 기분 좋은 거래, 함께하는 동네.")}</p>
            <Link className="ui-button ui-button--secondary ui-button--sm" href={profileHref}>{say("Edit profile", "프로필 수정")}</Link>
          </div>
        </div>
        <div className="my-page-charge">
          <h2>{say("Tada charge", "타다 충전 중")}</h2>
          <div className="my-page-charge-content">
            <div className="my-page-ring" style={{ "--charge": `${charge}%` } as CSSProperties} role="img" aria-label={say(`Profile setup ${charge}% complete`, `프로필 설정 ${charge}% 완료`)}><span><i className="ms ms-bolt" aria-hidden="true" /><strong>{charge}%</strong></span></div>
            <div className="my-page-charge-summary"><p>{say("Profile setup progress", "프로필 설정 진행률")}</p><ul>{checks.map((check) => <li key={check.label}><i className={`ms ${check.done ? "ms-check-circle" : "ms-circle ms--outline"}`} aria-hidden="true" />{check.label}</li>)}</ul><Link className="ui-button ui-button--primary ui-button--sm" href="/market/dashboard/tada-charge">{say("View details", "자세히 보기")} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>
          </div>
        </div>
      </section>
      <Panel title={<>{say("Check first", "먼저 확인해요")}{attention.length > 0 ? <span className="my-page-attention-count">{attention.length}</span> : null}</>} action={<ActionLink href={notificationsHref}>{say("View notifications", "알림 보기")}</ActionLink>}><div className="my-page-today">{attention.map((item) => <article className={`ui-panel my-page-task is-${item.area}`} key={item.href}><i className={`ms ${item.icon} my-page-task-icon`} aria-hidden="true" /><div><span className="my-page-tag">{item.area === "account" ? say("My account", "내 계정") : labels[item.area]}</span><h3>{item.title}</h3><p>{item.description}</p><ActionLink href={item.href}>{item.action}</ActionLink></div></article>)}</div>{!attention.length ? <div className="my-page-all-caught-up"><i className="ms ms-check-circle" aria-hidden="true" /><div><strong>{say("You’re all caught up", "지금은 확인할 일이 없어요")}</strong><p>{say("New offers, messages and updates will appear here.", "새 제안, 메시지, 중요한 업데이트가 여기에 표시됩니다.")}</p></div></div> : null}</Panel>
      <Panel title={say("In progress", "지금 진행 중")} filters={<div className="my-page-filters" aria-label={say("Filter activity", "활동 필터")}>{(Object.keys(labels) as Area[]).map((area) => <Button key={area} variant={filter === area ? "primary" : "ghost"} size="sm" pill aria-pressed={filter === area} onClick={() => { setFilter(area); setShowAll(false); }}>{labels[area]} ({counts[area]})</Button>)}</div>}>
        <div className="my-page-progress" role="region" aria-label={say("Current activity cards; scroll sideways on mobile", "진행 중인 활동 카드, 모바일에서는 옆으로 넘겨 보세요")} tabIndex={progress.length ? 0 : -1}>{(showAll ? progress : preview).map((item) => <div className="my-page-progress-item" key={item.key}>{item.content}</div>)}</div>
        {!progress.length ? <p className="my-page-empty">{say("No activity in this section yet. Explore your neighbourhood to get started.", "아직 이 영역의 활동이 없습니다. 우리 동네를 둘러보며 시작해 보세요.")} <Link href={filter === "services" ? "/services" : filter === "community" ? "/community" : "/market"}>{say("Explore", "둘러보기")}</Link></p> : null}
        {progress.length > 4 ? <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>{showAll ? say("Show less", "간략히 보기") : say(`Show all ${progress.length}`, `${progress.length}개 모두 보기`)}</Button> : null}
        <p className="my-page-footnote">{say("A snapshot of your recent activity. Up to 6 listings per market type, 6 services and 6 posts are shown.", "최근 활동 요약입니다. 마켓 유형별 상품·서비스·커뮤니티 글은 각각 최근 6개까지 표시됩니다.")}</p>
      </Panel>
      <aside className="ui-panel my-page-mobile-ad" aria-label={say("Advertisement", "광고")}>
        <div className="my-page-mobile-ad-copy"><span>{say("Ad", "광고")}</span><strong>{say("Ideas grow with Tada", "아이디어를 타다")}</strong><p>{say("Websites · Marketing · Branding", "웹사이트 · 마케팅 · 브랜딩")}</p></div>
        <img src="/images/brand/tada-wordmark.png" width={1965} height={800} loading="lazy" alt="" />
      </aside>
      <div className="my-page-services">
        <Panel title={say("Services you've saved", "관심 있는 서비스")} action={<ActionLink href="/market/wishlist?filter=service">{say("See all", "전체 보기")}</ActionLink>}>
          {data.savedServices.length ? <div className="my-page-saved-services">{data.savedServices.map((service) => <SavedServiceCard service={service} key={service.id} />)}</div> : <div className="my-page-service-empty"><i className="ms ms-favorite ms--outline" aria-hidden="true" /><p>{say("Save local providers to find them here whenever you need them.", "마음에 드는 서비스를 저장하면 이곳에서 다시 찾을 수 있어요.")}</p><Link href="/services">{say("Explore services", "서비스 둘러보기")} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>}
          {data.savedServiceCount !== null && data.savedServiceCount > data.savedServices.length ? <p className="my-page-service-count">{say(`${data.savedServiceCount} services saved`, `저장한 서비스 ${data.savedServiceCount}개`)}</p> : null}
        </Panel>
        <Panel title={say("Services you offer", "내가 제공하는 서비스")} action={<ActionLink href="/market/dashboard/listings?category=services">{say("Manage all", "전체 관리")}</ActionLink>}>
          {data.services.length ? <div className="my-page-shortcuts my-page-offered-services">{data.services.slice(0, 3).map((service) => <Link className="my-page-shortcut my-page-offered-service" href={`/services/${service.id}/edit`} key={service.id}>
            <i className="ms ms-build" aria-hidden="true" />
            <div><strong>{service.provider_name}</strong><small>{service.status === "published" ? say("Published", "공개 중") : service.status === "pending" ? say("Under review", "검토 중") : say("Hidden", "비공개")}</small></div>
            <i className="ms ms-arrow-forward" aria-hidden="true" />
          </Link>)}</div> : <div className="my-page-service-empty"><i className="ms ms-build" aria-hidden="true" /><p>{say("Your skills can help a neighbour. Anyone can list a service.", "과외처럼 내가 할 수 있는 일도 동네에 소개할 수 있어요.")}</p><Link href="/services/create">{say("List a service", "서비스 등록하기")} <i className="ms ms-arrow-forward" aria-hidden="true" /></Link></div>}
          {data.serviceCount !== null && data.serviceCount > data.services.length ? <p className="my-page-service-count">{say(`${data.serviceCount} services listed`, `등록한 서비스 ${data.serviceCount}개`)}</p> : null}
        </Panel>
      </div>
      <Panel title={say("Updates", "새소식")} action={<ActionLink href={notificationsHref}>{say("View all", "전체 보기")}</ActionLink>} filters={<div className="my-page-filters" aria-label={say("Update filters", "새소식 필터")}>{(["all", "message", "notification"] as const).map((kind) => <Button key={kind} size="sm" variant="ghost" aria-pressed={activityFilter === kind} onClick={() => setActivityFilter(kind)}>{kind === "all" ? say("All", "전체") : kind === "message" ? say("Messages", "메시지") : say("Notifications", "알림")}</Button>)}</div>}><div className="my-page-activity">{data.activity.filter((item) => activityFilter === "all" || (activityFilter === "message" ? item.type === "message" : item.type !== "message")).map((item) => <Link href={item.href.startsWith("/") && !item.href.startsWith("//") ? item.href : notificationsHref} key={item.id}><i className={`ms ${item.type === "wishlist" ? "ms-favorite" : item.type === "message" ? "ms-chat" : "ms-notifications"}`} aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.body}</p><time dateTime={item.created_at}>{new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { day: "numeric", month: "short" }).format(new Date(item.created_at))}</time></div></Link>)}</div>{!data.activity.some((item) => activityFilter === "all" || (activityFilter === "message" ? item.type === "message" : item.type !== "message")) ? <p className="my-page-empty">{say("Your latest marketplace updates will appear here.", "마켓의 새로운 소식이 여기에 표시됩니다.")}</p> : null}</Panel>
    <div className="my-page-management">{savedForLaterPanel}{manageActivityPanel}</div></div><aside className="my-page-rail" aria-label={say("Your Tada shortcuts", "나의 타다 바로가기")}><MyPageDiscoverPanel variant="carousel" /><Panel title={say("Join in on Tada", "타다와 함께하기")}><div className="my-page-create-actions"><Link className="ui-button ui-button--secondary ui-button--sm" href="/market/create"><i className="ms ms-shopping-bag" aria-hidden="true" /> {say("List an item", "상품 올리기")}<i className="ms ms-chevron-right" aria-hidden="true" /></Link><Link className="ui-button ui-button--secondary ui-button--sm" href="/services/create"><i className="ms ms-build" aria-hidden="true" /> {say("List a service", "서비스 올리기")}<i className="ms ms-chevron-right" aria-hidden="true" /></Link><Link className="ui-button ui-button--secondary ui-button--sm" href="/community/create"><i className="ms ms-forum" aria-hidden="true" /> {say("Write a post", "동네 글쓰기")}<i className="ms ms-chevron-right" aria-hidden="true" /></Link></div></Panel>{contributionPanel}<Panel className="my-page-desktop-ad" title={say("Advertisement", "광고")}><img className="my-page-ad-image" src="/images/tada-services-banner.png" width={1536} height={1024} loading="lazy" alt={say("Tada — website creation, digital marketing, branding design and project consulting. Ideas become possibilities.", "타다 — 아이디어를 타다, 가능성이 열리다. 웹사이트 제작, 디지털 마케팅, 브랜딩 디자인, 프로젝트 컨설팅.")} /></Panel></aside></div>
  </div>;
}
