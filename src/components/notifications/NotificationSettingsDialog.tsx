"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { DialogOverlay } from "@/components/ui/DialogOverlay";
import { IconButton } from "@/components/ui/IconButton";

export type NotificationPreferenceKey = "wishlist_enabled" | "keyword_enabled" | "community_enabled" | "service_reviews_enabled";
export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  wishlist_enabled: true,
  keyword_enabled: true,
  community_enabled: true,
  service_reviews_enabled: true,
};

const optionalSettings: Array<{
  key: NotificationPreferenceKey;
  icon: string;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
}> = [
  { key: "wishlist_enabled", icon: "ms-favorite", label: { ko: "찜한 상품", en: "Saved items" }, description: { ko: "가격·거래 상태 변경", en: "Price and status changes" } },
  { key: "keyword_enabled", icon: "ms-search", label: { ko: "관심 키워드", en: "Saved keywords" }, description: { ko: "일치하는 새 상품", en: "New matching listings" } },
  { key: "community_enabled", icon: "ms-chat", label: { ko: "내 글의 댓글·답글", en: "Comments and replies" }, description: { ko: "내 글의 댓글, 내 댓글의 답글", en: "Comments on your posts and replies to you" } },
  { key: "service_reviews_enabled", icon: "ms-star", label: { ko: "내 서비스 후기", en: "Service reviews" }, description: { ko: "등록한 서비스의 새 후기", en: "New reviews for your services" } },
];

export function NotificationSettingsDialog({
  ko, preferences, available, savingKey, error, onToggle, onClose,
}: {
  ko: boolean;
  preferences: NotificationPreferences;
  available: boolean;
  savingKey: NotificationPreferenceKey | null;
  error: string | null;
  onToggle: (key: NotificationPreferenceKey, enabled: boolean) => void;
  onClose: () => void;
}) {
  const lang = ko ? "ko" : "en";
  const close = () => { if (!savingKey) onClose(); };
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !savingKey) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose, savingKey]);
  return <DialogOverlay className="notification-settings-overlay" aria-labelledby="notification-settings-title" onClose={close} isDismissible={!savingKey}>
    <section className="ui-card notification-settings-dialog">
      <header className="notification-settings-header">
        <div><h2 id="notification-settings-title">{ko ? "알림 설정" : "Notification settings"}</h2><p>{ko ? "앞으로 받을 알림을 선택하세요." : "Choose the updates you want to receive."}</p></div>
        <IconButton type="button" autoFocus disabled={Boolean(savingKey)} onClick={close} aria-label={ko ? "알림 설정 닫기" : "Close notification settings"}><i className="ms ms-close" aria-hidden="true" /></IconButton>
      </header>
      <div className="notification-settings-list">
        <div className="notification-settings-row">
          <span className="notification-settings-icon is-message"><i className="ms ms-sms" aria-hidden="true" /></span>
          <span className="notification-settings-copy"><strong>{ko ? "메시지·제안·거래" : "Messages, offers and trades"}</strong><small>{ko ? "새 메시지, 가격 제안, 거래 진행 상황" : "New messages, offers and trade progress"}</small></span>
          <span className="notification-settings-required">{ko ? "항상 켜짐" : "Always on"}</span>
        </div>
        {optionalSettings.map((setting) => <label className="notification-settings-row" key={setting.key}>
          <span className={`notification-settings-icon is-${setting.key}`}><i className={`ms ${setting.icon}`} aria-hidden="true" /></span>
          <span className="notification-settings-copy"><strong>{setting.label[lang]}</strong><small>{setting.description[lang]}</small></span>
          <input
            className="notification-settings-input"
            type="checkbox"
            role="switch"
            checked={preferences[setting.key]}
            disabled={!available || savingKey !== null}
            onChange={(event) => onToggle(setting.key, event.target.checked)}
            aria-label={setting.label[lang]}
          />
          <span className="notification-settings-track" aria-hidden="true" />
        </label>)}
      </div>
      {!available ? <p className="notification-settings-error" role="alert">{ko ? "설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." : "Settings are unavailable. Please try again later."}</p> : null}
      {error ? <p className="notification-settings-error" role="alert">{error}</p> : null}
      <p className="notification-settings-note"><i className="ms ms-info" aria-hidden="true" />{ko ? "알림을 꺼도 기존 알림은 그대로 보관됩니다." : "Turning off a category keeps your existing notifications."}</p>
      <p className="notification-settings-dismiss-hint">{ko ? "팝업 바깥을 누르면 닫힙니다." : "Tap outside to close this dialog."}</p>
      <Button variant="secondary" block disabled={Boolean(savingKey)} onClick={close}>{ko ? "닫기" : "Close"}</Button>
    </section>
  </DialogOverlay>;
}
