/**
 * Shared policy for text that users publish on Tada.
 * Keep this high-confidence list aligned with the database trigger migration.
 */
const prohibitedContentPatterns = [
  /\b(?:firearm|gun|rifle|shotgun|handgun|pistol|ammunition|ammo|weapon|taser)\b/i,
  /(?:총기|권총|소총|산탄총|탄약|무기|전기충격기)/,
  /\b(?:prescription\s*(?:medicine|medication|drug)|rx\s*(?:medicine|medication|drug)|antibiotic(?:s)?|opioid(?:s)?)\b/i,
  /(?:처방약|처방전\s*약|항생제|마약성\s*진통제)/,
  /\b(?:tobacco|cigarette(?:s)?|cigar(?:s)?|vape(?:s)?|e-?cig(?:arette)?|nicotine)\b/i,
  /(?:담배|전자담배|액상|니코틴)/,
  /\b(?:alcohol|beer|wine|spirits?|liquor|whisky|whiskey|vodka|booze|grog)\b/i,
  /(?:^|[^가-힣])술(?:$|[^가-힣])|(?:맥주|와인|위스키|보드카|주류|소주|막걸리|양주)/,
  /\b(?:recreational\s+drug|cannabis|marijuana|weed|cocaine|mdma|ecstasy|meth(?:amphetamine)?|heroin|fentanyl|molly|shrooms?|ketamine|ket|lsd)\b/i,
  /(?:대마|마리화나|코카인|엑스터시|필로폰|필로|헤로인|펜타닐|케타민|물뽕|야바|마약)/,
  /\b(?:investment\s+(?:product|scheme)|financial\s+product|loan\s+offer|crypto(?:currency)?\s+(?:investment|scheme)|forex)\b/i,
  /(?:금융상품|투자상품|대출\s*상품|가상화폐\s*투자|외환\s*투자)/,
  /\b(?:gambling|casino|sports\s*bet(?:ting)?|bookmaker|pokies)\b/i,
  /(?:도박|카지노|스포츠\s*베팅|포키즈)/,
  /\b(?:sexual\s+service|escort\s+service|prostitution|sex\s*work)\b/i,
  /(?:성매매|성인\s*서비스|출장안마)/,
  /\b(?:counterfeit|fake\s+(?:designer|brand)|replica\s+(?:designer|brand)|knock-?off)\b/i,
  /(?:짝퉁|위조품|가품)/,
  /\b(?:recalled\s+(?:product|item)|unsafe\s+(?:product|item)|safety\s+recall)\b/i,
  /(?:리콜\s*(?:제품|상품)?|안전\s*리콜|불량\s*제품)/,
  /\b(?:stolen\s+(?:goods?|item|property)|hot\s+goods)\b/i,
  /(?:도난품|장물)/,
];

export const prohibitedPublicContentMessage = "This content cannot be published on Tada because it contains prohibited or unsafe material.";
export const prohibitedServiceContentMessage = "This service cannot be listed on Tada because it contains prohibited or unsafe content.";

export function containsProhibitedPublicContent(...values: Array<string | null | undefined>) {
  const content = values.filter((value): value is string => typeof value === "string").join(" ");
  return prohibitedContentPatterns.some((pattern) => pattern.test(content));
}
