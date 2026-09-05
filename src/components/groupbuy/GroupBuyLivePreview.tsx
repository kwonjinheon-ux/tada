import { GroupBuyCard } from "@/components/groupbuy/GroupBuyCard";
import type { GroupBuy } from "@/data/groupBuy";

export function GroupBuyLivePreview({ groupBuy }: { groupBuy: GroupBuy }) {
  return (
    <div className="groupbuy-live-preview">
      <div className="groupbuy-live-preview-heading">
        <div>
          <span>Live preview</span>
          <strong>What buyers will see</strong>
        </div>
        <i className="ms ms-visibility" aria-hidden="true" />
      </div>
      <div className="groupbuy-live-preview-card">
        <GroupBuyCard groupBuy={groupBuy} isPreview />
      </div>
    </div>
  );
}
