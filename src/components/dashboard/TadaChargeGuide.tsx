"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { tadaChargeContent } from "@/lib/dashboard/tada-charge-content";

const Icon = ({ name }: { name: string }) => <i className={`ms ${name}`} aria-hidden="true" />;

export function TadaChargeGuide() {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const { say, steps, feedback, stages, excluded, faqs } = tadaChargeContent(ko);
  return <div className="dashboard-content tada-charge-guide">
    <header className="tada-charge-hero">
      <div className="tada-charge-hero-copy">
        <span className="tada-charge-eyebrow">Tada Charge <span>{say("Coming soon", "도입 예정")}</span></span>
        <h1>{say("What is Tada Charge?", "타다 충전이란?")}</h1>
        <p className="tada-charge-headline">{say("Good trades add up.", "좋은 거래가 쌓일수록,")}<br />{ko ? <strong><span>타다</span>가 <span>충전</span>돼요!</strong> : <strong>So does your <span>Tada Charge</span>!</strong>}</p>
        <p>{say("Care and kept promises help make you a neighbour people enjoy trading with.", "서로 배려하고 약속을 지키는 좋은 이웃 활동이 타다 충전으로 이어져요.")}</p>
      </div>
      <div className="tada-charge-hero-art">
        <Image className="tada-charge-hero-scene" src="/images/tada-charge-hero-v2.png" alt={say("Tada Charge mascot pointing to a green 20 percent starting meter", "초록색 20% 시작 게이지를 가리키는 타다 충전 마스코트")} width={1536} height={1024} priority />
        <span className="tada-charge-speech"><Icon name="ms-forum" />{say("Good neighbours help Tada grow!", "좋은 이웃이 될수록 타다가 더 충전돼요!")}</span>
      </div>
    </header>

    <section className="tada-charge-section" aria-labelledby="charge-how"><h2 id="charge-how">{say("How Charge grows", "이렇게 충전돼요")}</h2><p>{say("Finish a trade, share your experience, and watch good interactions add up.", "거래를 마치고 서로 평가하면 타다가 충전돼요.")}</p><div className="tada-charge-steps">{steps.map((step, index) => <div className="tada-charge-step-group" key={step.title}><article className="ui-panel tada-charge-step"><span className="tada-charge-step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div><span className="tada-charge-step-illustration" aria-hidden="true">{step.illustration}</span></article>{index < 2 ? <Icon name="ms-arrow-forward" /> : null}</div>)}</div></section>

    <section className="tada-charge-section" aria-labelledby="charge-feedback"><h2 id="charge-feedback">{say("Feedback shapes your Charge", "평가가 충전도에 반영돼요")}</h2><p>{say("Your neighbours’ experiences can move your Charge up or down.", "이웃의 평가에 따라 타다 충전도가 오르거나 내릴 수 있어요.")}</p><div className="ui-panel tada-charge-ratings">{feedback.map((item) => <article className={`tada-charge-rating is-${item.tone}`} key={item.title}><span className="tada-charge-rating-face" aria-hidden="true">{item.face}</span><div><h3>{item.title}</h3><strong>{item.value}</strong><p>{item.body}</p></div></article>)}</div><div className="tada-charge-note"><Icon name="ms-info" /><p><strong>{say("A positive review starts at +2%; the increase gets smaller as Charge rises.", "좋은 평가의 기본 상승 폭은 +2%이며, 충전도가 높을수록 상승 폭은 점점 줄어들어요.")}</strong><br />{say("The final rules will be announced before launch.", "실제 반영 기준은 기능 도입 전에 확정해 안내할게요.")}</p></div></section>

    <section className="tada-charge-section" aria-labelledby="charge-stages"><h2 id="charge-stages">{say("Grow together", "충전도는 이렇게 올라가요")}</h2><p>{say("Every good experience adds a little more Charge.", "좋은 이웃 경험이 쌓일수록 타다가 조금씩 더 충전돼요.")}</p><div className="tada-charge-stages">{stages.map((stage) => <article className="ui-panel tada-charge-stage" key={stage.title}><span className={`tada-charge-stage-illustration${stage.fruitful ? " is-fruitful" : ""}`} aria-hidden="true">{stage.illustration}</span><h3>{stage.title}</h3><strong>{stage.range}</strong><p>{stage.body}</p></article>)}</div><div className="tada-charge-track" role="img" aria-label={say("Charge growth line from zero to one hundred percent", "0퍼센트부터 100퍼센트까지의 충전도 성장선")}><span><small>0%</small></span><span><small>20%</small></span><span><small>50%</small></span><span><small>70%</small></span><span><small>90%</small></span><span><small>100%</small></span></div></section>

    <section className="tada-charge-section" aria-labelledby="charge-excluded"><h2 id="charge-excluded">{say("These don’t add Charge", "이건 충전 점수가 아니에요")}</h2><p>{say("These actions do not raise your Charge by themselves.", "아래 활동은 타다 충전도에 반영되지 않아요.")}</p><div className="tada-charge-excluded">{excluded.map((item) => <article className="ui-panel tada-charge-exclusion" key={item.title}><Icon name={item.icon} /><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div></section>

    <section className="tada-charge-section" aria-labelledby="charge-new"><h2 id="charge-new">{say("New neighbours belong here too", "새 이웃도 안심이에요")}</h2><p>{say("You can start safely without a trade history.", "거래 경험이 적은 새로운 이웃도 안전하게 시작할 수 있어요.")}</p><div className="tada-charge-new-neighbours"><article className="ui-panel"><Icon name="ms-person-add" /><div><h3>{say("0–2 reviews: New neighbour", "평가 0–2개: 새 이웃")}</h3><p>{say("Before feedback from three different people, others will see ‘New neighbour’.", "서로 다른 이웃 3명에게 평가받기 전에는 외부에 ‘새 이웃’으로 표시해요.")}</p></div></article><article className="ui-panel"><Icon name="ms-groups" /><div><h3>{say("3 reviewers: Charge visible", "서로 다른 평가자 3명 이상: 충전도 공개")}</h3><p>{say("Once enough verified experiences build up, Charge can be shown to others.", "검증된 평가가 쌓이면 충전도가 공개돼요.")}</p></div></article><article className="ui-panel tada-charge-caution"><Icon name="ms-lock" /><div><h3>{say("A guide, not a guarantee", "충전도는 참고 지표예요")}</h3><p>{say("Charge reflects reported experiences. It does not guarantee identity, safety or a trade outcome.", "타다 충전도는 실제 이용 경험을 바탕으로 한 참고 지표이며, 인증이나 거래 결과를 보장하지 않아요.")}</p></div></article></div></section>

    <section className="tada-charge-section tada-charge-faq" aria-labelledby="charge-faq"><h2 id="charge-faq">{say("Frequently asked questions", "자주 묻는 질문")}</h2>{faqs.map((item) => <details className="ui-panel" key={item.q}><summary>{item.q}<Icon name="ms-expand-more" /></summary><p>{item.a}</p></details>)}</section>
    <div className="tada-charge-cta"><div><h2>{say("Start with a good neighbourly trade.", "지금, 좋은 이웃과 함께 시작해요.")}</h2><p>{say("Warm experiences will help Tada Charge grow when the feature launches.", "따뜻한 거래와 좋은 경험이 쌓일수록 타다가 더 충전돼요.")}</p></div><Link className="ui-button ui-button--secondary" href="/market/dashboard/my-page">{say("Check my Charge", "내 충전도 확인하기")} <Icon name="ms-arrow-forward" /></Link></div>
    <p className="tada-charge-pending">{say("Reputation based Tada Charge is coming soon. The percentage currently shown on My Page measures profile setup progress.", "평판형 타다 충전은 도입 예정입니다. 현재 마이페이지에 표시되는 수치는 프로필 설정 진행률입니다.")}</p>
  </div>;
}
