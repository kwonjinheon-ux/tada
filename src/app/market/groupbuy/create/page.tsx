import { GroupBuyCreateClient } from "@/components/groupbuy/GroupBuyCreateClient";
import { GroupBuyShell } from "@/components/groupbuy/GroupBuyShell";

export const metadata = { title: "Start a group buy | Tada" };

export default function GroupBuyCreateRoute() {
  return <GroupBuyShell><GroupBuyCreateClient /></GroupBuyShell>;
}
