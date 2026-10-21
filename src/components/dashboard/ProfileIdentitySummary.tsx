"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { useLanguage } from "@/components/LanguageProvider";

/** The same identity treatment on My Page and in the profile preview. */
export function ProfileIdentitySummary({ name, avatarUrl, location, joinedAt, photoHref, onPhotoEdit, description, action, className = "" }: {
  name: string; avatarUrl?: string | null; location?: string | null; joinedAt?: string | null;
  photoHref?: string; onPhotoEdit?: () => void; description?: string; action?: ReactNode; className?: string;
}) {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const joined = joinedAt ? new Date(joinedAt) : null;
  const date = joined && !Number.isNaN(joined.getTime()) ? new Intl.DateTimeFormat(ko ? "ko-KR" : "en-NZ", { month: "long", year: "numeric" }).format(joined) : null;
  const avatar = <Avatar src={avatarUrl} name={name} className="my-page-avatar profile-identity-avatar" />;
  const camera = <i className="ms ms-photo-camera" aria-hidden="true" />;
  return <div className={`my-page-identity profile-identity ${className}`}>
    {photoHref ? <Link className="my-page-avatar-link" href={photoHref} aria-label={ko ? "프로필 사진 수정" : "Edit profile photo"}>{avatar}<span>{camera}</span></Link> : <div className="my-page-avatar-link">{avatar}{onPhotoEdit ? <IconButton className="profile-identity-camera" onClick={onPhotoEdit} aria-label={ko ? "프로필 사진 변경" : "Change profile photo"}>{camera}</IconButton> : null}</div>}
    <div className="profile-identity-copy">
      <div className="my-page-name"><h2>{name || (ko ? "타다 회원" : "Tada member")}</h2><span className="ui-pill ui-pill--warning">{ko ? "회원" : "Member"}</span></div>
      <p><i className="ms ms-location-on" aria-hidden="true" /> {location || (ko ? "지역을 설정해 주세요" : "Set your location")}</p>
      {date ? <p className="my-page-profile-extra"><i className="ms ms-calendar-today" aria-hidden="true" /> {ko ? "가입" : "Joined"} {date}</p> : null}
      {description ? <p className="my-page-profile-extra">{description}</p> : null}
      {action}
    </div>
  </div>;
}
