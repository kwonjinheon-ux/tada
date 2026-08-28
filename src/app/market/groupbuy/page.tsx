import { GroupBuyBrowseClient } from "@/components/groupbuy/GroupBuyBrowseClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";

export const metadata = { title: "Group Buy | Tada" };

export default function GroupBuyRoute() {
  return <GroupBuyShell><GroupBuyBrowseClient /></GroupBuyShell>;
}
