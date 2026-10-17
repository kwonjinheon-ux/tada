"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { tadaChargeContent } from "@/lib/dashboard/tada-charge-content";

const Icon = ({ name }: { name: string }) => <i className={`ms ${name}`} aria-hidden="true" />;

/**
 * The Tada Charge guide, told once.
 *
 * The original page says the same thing in several places: the hero, the steps
 * and the stages each open with "good trades add up", the feedback tones repeat
 * the third step, and half the FAQ answers a question the sections above have
 * already answered. This version keeps every rule the original states and drops
 * the repetition — the promise is made once in the hero, the tones sit under
 * the step they belong to, and the FAQ keeps only what is not explained above.
 *
 * It is built from the same content and the same styles as the original, so the
 * two pages stay in step while both are available.
 */
export function TadaChargeGuideV2() {
  const { locale } = useLanguage();
  const ko = locale === "ko";
  const { say, steps, feedback, stages, excluded, faqs } = tadaChargeContent(ko);
  // The two the sections below already answer — phone verification is in
  // "these don't add Charge", visibility is in "new neighbours" — are left out.
  const openQuestions = faqs.slice(0, 2);

  return <div className="dashboard-content tada-charge-guide tada-charge-guide-v2">
    <header className="tada-charge-hero">
      <div className="tada-charge-hero-copy">
        <span className="tada-charge-eyebrow">Tada Charge <span>{say("Coming soon", "도입 예정")}</span></span>
        <h1>{say("What is Tada Charge?", "타다 충전이란?")}</h1>
        <p className="tada-charge-headline">{say("Good trades add up.", "좋은 거래가 쌓일수록,")}<br />{ko ? <strong><span>타다</span>가 <span>충전</span>돼요!</strong> : <strong>So does your <span>Tada Charge</span>!</strong>}</p>
        <p>{say("Finish a trade, tell each other how it went, and the good experiences become your Charge.", "거래를 마치고 서로의 경험을 평가하면, 그 좋은 경험이 그대로 타다 충전도가 돼요.")}</p>
      </div>
      <div className="tada-charge-hero-art">
        <Image className="tada-charge-hero-scene" src="/images/tada-charge-hero-v2.png" alt={say("Tada Charge mascot pointing to a green 20 percent starting meter", "초록색 20% 시작 게이지를 가리키는 타다 충전 마스코트")} width={1536} height={1024} priority />
        <span className="tada-charge-speech"><Icon name="ms-forum" />{say("Good neighbours help Tada grow!", "좋은 이웃이 될수록 타다가 더 충전돼요!")}</span>
      </div>
    </header>

    {/* The three steps and what each kind of feedback does, in one place: the
        tones are the third step, not a second explanation of it. */}
    <section className="tada-charge-section" aria-labelledby="charge-v2-how">
      <h2 id="charge-v2-how">{say("Three steps", "충전되는 과정")}</h2>
      <div className="tada-charge-steps">
        {steps.map((step, index) => <div className="tada-charge-step-group" key={step.title}>
          <article className="ui-panel tada-charge-step">
            <span className="tada-charge-step-number">{index + 1}</span>
            <div><h3>{step.title}</h3><p>{step.body}</p></div>
            <span className="tada-charge-step-illustration" aria-hidden="true">{step.illustration}</span>
          </article>
          {index < steps.length - 1 ? <Icon name="ms-arrow-forward" /> : null}
        </div>)}
      </div>
      <h3 className="tada-charge-v2-subheading">{say("What each review does", "평가에 따라 이렇게 반영돼요")}</h3>
      <div className="ui-panel tada-charge-ratings">
        {feedback.map((item) => <article className={`tada-charge-rating is-${item.tone}`} key={item.title}>
          <span className="tada-charge-rating-face" aria-hidden="true">{item.face}</span>
          <div><h3>{item.title}</h3><strong>{item.value}</strong><p>{item.body}</p></div>
        </article>)}
      </div>
      <div className="tada-charge-note">
        <Icon name="ms-info" />
        <p>
          <strong>{say("A positive review starts at +2%; the increase gets smaller as Charge rises.", "좋은 평가의 기본 상승 폭은 +2%이며, 충전도가 높을수록 상승 폭은 점점 줄어들어요.")}</strong><br />
          {say("The final rules will be announced before launch.", "실제 반영 기준은 기능 도입 전에 확정해 안내할게요.")}
        </p>
      </div>
    </section>

    <section className="tada-charge-section" aria-labelledby="charge-v2-stages">
      <h2 id="charge-v2-stages">{say("Where your Charge can reach", "충전도 단계")}</h2>
      <div className="tada-charge-stages">
        {stages.map((stage) => <article className="ui-panel tada-charge-stage" key={stage.title}>
          <span className={`tada-charge-stage-illustration${stage.fruitful ? " is-fruitful" : ""}`} aria-hidden="true">{stage.illustration}</span>
          <h3>{stage.title}</h3>
          <strong>{stage.range}</strong>
          <p>{stage.body}</p>
        </article>)}
      </div>
      <div className="tada-charge-track" role="img" aria-label={say("Charge growth line from zero to one hundred percent", "0퍼센트부터 100퍼센트까지의 충전도 성장선")}>
        <span><small>0%</small></span><span><small>20%</small></span><span><small>50%</small></span><span><small>70%</small></span><span><small>90%</small></span><span><small>100%</small></span>
      </div>
    </section>

    {/* Side by side: what does not count, and what a new neighbour sees. Two
        short lists rather than two full-width sections. */}
    <div className="tada-charge-v2-columns">
      <section className="tada-charge-section" aria-labelledby="charge-v2-excluded">
        <h2 id="charge-v2-excluded">{say("These don’t add Charge", "이건 충전 점수가 아니에요")}</h2>
        <div className="tada-charge-excluded">
          {excluded.map((item) => <article className="ui-panel tada-charge-exclusion" key={item.title}>
            <Icon name={item.icon} />
            <div><h3>{item.title}</h3><p>{item.body}</p></div>
          </article>)}
        </div>
      </section>

      <section className="tada-charge-section" aria-labelledby="charge-v2-new">
        <h2 id="charge-v2-new">{say("New neighbours belong here too", "새 이웃도 안심이에요")}</h2>
        <div className="tada-charge-new-neighbours">
          <article className="ui-panel"><Icon name="ms-person-add" /><div>
            <h3>{say("0–2 reviews: New neighbour", "평가 0–2개: 새 이웃")}</h3>
            <p>{say("Before feedback from three different people, others will see ‘New neighbour’.", "서로 다른 이웃 3명에게 평가받기 전에는 외부에 ‘새 이웃’으로 표시해요.")}</p>
          </div></article>
          <article className="ui-panel"><Icon name="ms-groups" /><div>
            <h3>{say("3 reviewers: Charge visible", "서로 다른 평가자 3명 이상: 충전도 공개")}</h3>
            <p>{say("Once enough verified experiences build up, Charge can be shown to others.", "검증된 평가가 쌓이면 충전도가 공개돼요.")}</p>
          </div></article>
          <article className="ui-panel tada-charge-caution"><Icon name="ms-lock" /><div>
            <h3>{say("A guide, not a guarantee", "충전도는 참고 지표예요")}</h3>
            <p>{say("Charge reflects reported experiences. It does not guarantee identity, safety or a trade outcome.", "타다 충전도는 실제 이용 경험을 바탕으로 한 참고 지표이며, 인증이나 거래 결과를 보장하지 않아요.")}</p>
          </div></article>
        </div>
      </section>
    </div>

    <section className="tada-charge-section tada-charge-faq" aria-labelledby="charge-v2-faq">
      <h2 id="charge-v2-faq">{say("Frequently asked questions", "자주 묻는 질문")}</h2>
      {openQuestions.map((item) => <details className="ui-panel" key={item.q}><summary>{item.q}<Icon name="ms-expand-more" /></summary><p>{item.a}</p></details>)}
    </section>

    <div className="tada-charge-cta">
      <div>
        <h2>{say("Start with a good neighbourly trade.", "지금, 좋은 이웃과 함께 시작해요.")}</h2>
        <p>{say("Reputation based Charge is coming soon; the percentage on My Page today measures profile setup progress.", "평판형 타다 충전은 도입 예정이에요. 지금 마이페이지에 보이는 수치는 프로필 설정 진행률이에요.")}</p>
      </div>
      <Link className="ui-button ui-button--secondary" href="/market/dashboard/my-page">{say("Check my Charge", "내 충전도 확인하기")} <Icon name="ms-arrow-forward" /></Link>
    </div>
  </div>;
}
