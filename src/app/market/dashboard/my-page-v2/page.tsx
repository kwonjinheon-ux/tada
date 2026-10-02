import { MyPage } from "@/components/dashboard/MyPage";

/** Keeps the former My page experience available while the current page evolves. */
export default function MyPageV2Route() {
  return <MyPage version="v2" />;
}
