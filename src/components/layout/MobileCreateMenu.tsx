"use client";

import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { DialogOverlay } from "@/components/ui/DialogOverlay";

export type CreateMenuSection = "market" | "community" | "services";

type CreateMenuProps = {
  id: string;
  ko: boolean;
  /** The section the visitor is in, so its row reads as the likely choice. */
  current: CreateMenuSection;
  hrefs: Record<CreateMenuSection, string>;
  onClose: () => void;
};

const entries: { section: CreateMenuSection; icon: AppIconName; title: [string, string]; hint: [string, string] }[] = [
  { section: "market", icon: "market", title: ["Sell an item", "물건 팔기"], hint: ["Secondhand · garage sales · moving sales", "중고 거래 · 차고 세일 · 이사 세일"] },
  { section: "community", icon: "community", title: ["Write a post", "글쓰기"], hint: ["Discussion · Q&A · recommendations", "자유게시판 · 질문답변 · 추천"] },
  { section: "services", icon: "services", title: ["List a service", "서비스 등록"], hint: ["Tell your area about your business or skills", "내 업체나 재능을 동네에 알리기"] },
];

/** The phone dock's "create" menu: one place to start a listing, a post or a
 *  service. It rises out of the dock's centre button, on the shared dialog
 *  backdrop, so tapping beside it closes it like every other popup. The dock
 *  stays above the backdrop and its centre button turns into the close control. */
export function MobileCreateMenu({ id, ko, current, hrefs, onClose }: CreateMenuProps) {
  return <DialogOverlay className="mobile-create-menu-dialog" aria-label={ko ? "등록 메뉴" : "Create menu"} onClose={onClose}>
    <nav className="mobile-create-menu menu-motion" id={id} aria-label={ko ? "등록 메뉴" : "Create menu"}>
      {entries.map((entry) => <Link key={entry.section} className={`mobile-create-menu-item is-${entry.section} ${entry.section === current ? "is-current" : ""}`} href={hrefs[entry.section]} onClick={onClose}>
        <span className="mobile-create-menu-icon"><AppIcon name={entry.icon} /></span>
        <span className="mobile-create-menu-text"><strong>{entry.title[ko ? 1 : 0]}</strong><small>{entry.hint[ko ? 1 : 0]}</small></span>
      </Link>)}
    </nav>
  </DialogOverlay>;
}
