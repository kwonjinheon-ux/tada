import { PageContainer } from "@/components/layout/PageContainer";

export type ComingSoonProps = {
  kicker: string;
  title: string;
  description: string;
};

export function ComingSoon({ kicker, title, description }: ComingSoonProps) {
  return (
    <PageContainer>
      <p className="jobs-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p className="jobs-intro">{description}</p>
    </PageContainer>
  );
}
