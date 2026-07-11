import { SiteHeader } from "@/components/layout/site-header";
import { PostAdForm } from "@/features/listings/components/post-ad-form";
import "./post-ad.css";

export const metadata = { title: "Post an item" };
export default function PostAdRoute() { return <><SiteHeader /><main className="page-shell" style={{ paddingBlock: "40px 64px" }}><PostAdForm /></main></>; }
