import type { AdPlacement } from "@/lib/advertising/types";

const placementLabels: Record<AdPlacement, string> = {
  market_top: "Marketplace header",
  market_feed: "Marketplace results feed",
  market_sidebar: "Marketplace sidebar",
  search_feed: "Search results feed",
  product_detail_middle: "Listing detail content",
  product_detail_bottom: "Listing detail footer",
};

export function AdPlacementPreview({ placement }: { placement: AdPlacement }) {
  const isSidebar = placement === "market_sidebar";
  const isDetail = placement === "product_detail_middle" || placement === "product_detail_bottom";

  return (
    <figure className={`ad-placement-preview is-${placement}`} aria-label={`Preview: ${placementLabels[placement]}`}>
      <div className="ad-placement-preview-window" aria-hidden="true">
        <span className="ad-placement-preview-bar" />
        {isSidebar ? <>
          <div className="ad-placement-preview-sidebar"><span /><span /><span /></div>
          <div className="ad-placement-preview-sidebar-ad">Ad</div>
          <div className="ad-placement-preview-lines"><span /><span /><span /></div>
        </> : <>
          <div className="ad-placement-preview-top-ad">Ad</div>
          <div className="ad-placement-preview-content"><span /><span /><span /></div>
          <div className="ad-placement-preview-feed-ad">Ad</div>
          {isDetail ? <div className="ad-placement-preview-detail"><span /><span /><span /><span /></div> : <div className="ad-placement-preview-grid"><span /><span /><span /><span /></div>}
        </>}
      </div>
      <figcaption>{placementLabels[placement]}</figcaption>
    </figure>
  );
}
