/**
 * What Tada Charge is, in one place.
 *
 * Two pages explain it — the original guide and the V2 rewrite — and they say
 * the same things about the steps, the feedback tones, the stages and what does
 * not count. Only the arrangement differs, so the wording lives here and each
 * page decides how much of it to show and in what order.
 */
export type ChargeCard = { icon: string; title: string; body: string };
export type ChargeStep = ChargeCard & { illustration: string };
export type ChargeFeedback = ChargeCard & { face: string; tone: "positive" | "neutral" | "negative"; value: string };
export type ChargeStage = ChargeStep & { range: string; fruitful?: boolean };
export type ChargeQuestion = { q: string; a: string };

export function tadaChargeContent(ko: boolean) {
  const say = (en: string, kr: string) => (ko ? kr : en);

  const steps: ChargeStep[] = [
    { icon: "ms-handshake", illustration: "🛍️", title: say("Complete a trade", "거래를 마쳐요"), body: say("Keep your agreement with a neighbour and finish the trade.", "마켓에서 서로 약속을 지키고 거래를 완료해요.") },
    { icon: "ms-forum", illustration: "💬", title: say("Share your experience", "서로 평가해요"), body: say("Both people share how the trade went.", "거래가 끝나면 서로의 거래 경험을 평가해요.") },
    { icon: "ms-bolt", illustration: "⚡", title: say("Build your Charge", "타다가 충전돼요"), body: say("Good feedback helps your Charge grow.", "좋은 평가가 쌓일수록 타다 충전도가 올라가요.") },
  ];

  const feedback: ChargeFeedback[] = [
    { icon: "ms-thumb-up", face: "🙂", tone: "positive", title: say("Great", "좋았어요"), value: say("Base +2%", "기본 +2%"), body: say("Friendly, punctual and accurate.", "친절했어요, 약속을 잘 지켰어요, 설명이 정확했어요.") },
    { icon: "ms-more-horiz", face: "😐", tone: "neutral", title: say("Okay", "보통이었어요"), value: say("No change", "변화 없음"), body: say("The trade went as expected.", "큰 문제가 없었어요.") },
    { icon: "ms-info", face: "🙁", tone: "negative", title: say("Could be better", "아쉬웠어요"), value: say("May decrease", "하락할 수 있어요"), body: say("Confirmed problems may affect Charge after review.", "확인된 문제는 검토 후 반영될 수 있어요.") },
  ];

  const stages: ChargeStage[] = [
    { icon: "ms-bolt", illustration: "🚀", title: say("Just joined", "가입 직후"), range: "20%", body: say("Everyone starts together.", "모두 같은 출발선에서 시작해요.") },
    { icon: "ms-check-circle", illustration: "🌱", title: say("A good start", "좋은 시작"), range: "20–49%", body: say("Good feedback adds up.", "좋은 평가가 모이면 점점 올라가요.") },
    { icon: "ms-groups", illustration: "🌳", title: say("A steady neighbour", "든든한 이웃"), range: "50–69%", body: say("Trust grows with experience.", "꾸준한 좋은 거래로 충전돼요.") },
    { icon: "ms-verified", illustration: "🌲", title: say("A trusted neighbour", "믿을 수 있는 이웃"), range: "70–89%", body: say("Many good experiences have built up.", "많은 좋은 경험이 쌓였어요.") },
    { icon: "ms-favorite", illustration: "🌳", fruitful: true, title: say("A warm neighbour", "따뜻한 이웃"), range: "90–100%", body: say("A long history of positive experiences.", "오랫동안 좋은 이웃으로 활동하고 있어요.") },
  ];

  const excluded: ChargeCard[] = [
    { icon: "ms-photo-camera", title: say("Profile photo", "프로필 사진 등록"), body: say("Helps neighbours recognise you.", "프로필을 꾸미는 데 도움이 돼요.") },
    { icon: "ms-call", title: say("Phone verification", "전화번호 인증"), body: say("Confirms your contact method separately.", "안전한 이용을 위한 별도 인증이에요.") },
    { icon: "ms-edit", title: say("Listing items or services", "상품·서비스 등록"), body: say("The number of listings does not raise Charge.", "등록 수는 충전도와 관련이 없어요.") },
    { icon: "ms-forum", title: say("Likes and comments", "좋아요·댓글 작성"), body: say("Activity alone does not raise Charge.", "커뮤니티 활동 역시 반영되지 않아요.") },
  ];

  const faqs: ChargeQuestion[] = [
    { q: say("Who can leave feedback?", "누가 평가할 수 있나요?"), a: say("The plan is to allow the other person in a completed trade to share feedback. Services will be considered once completed service relationships can be verified.", "완료된 거래의 상대방이 평가할 수 있도록 준비 중이에요. 서비스 평가는 실제 이용 관계를 확인할 수 있게 된 뒤 검토할 예정이에요.") },
    { q: say("Can my Charge go down?", "충전도가 내려갈 수도 있나요?"), a: say("A confirmed problem may affect it. A report alone will not automatically lower Charge.", "확인된 문제는 영향을 줄 수 있어요. 신고만으로 자동 감점하지 않아요.") },
    { q: say("Will verifying my phone raise Charge?", "전화번호를 인증하면 충전도가 올라가나요?"), a: say("No. Verification checks account information; Charge reflects feedback from real experiences.", "아니요. 인증은 계정 정보를 확인하는 절차이고, 충전도는 실제 거래 경험의 평가를 바탕으로 해요.") },
    { q: say("Who can see my Charge?", "누가 제 충전도를 볼 수 있나요?"), a: say("The proposed rule shows ‘New neighbour’ to others until three different people have left verified feedback. You can still see your own progress.", "서로 다른 이웃 3명의 평가가 쌓이기 전에는 외부에 ‘새 이웃’으로 표시하는 방안을 준비 중이에요. 본인은 자신의 진행 상황을 볼 수 있어요.") },
  ];

  return { say, steps, feedback, stages, excluded, faqs };
}
