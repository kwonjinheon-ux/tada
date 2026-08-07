/**
 * When an AI draft is posted without the seller answering its "Confirm before
 * posting" points, those points are carried into the listing description so the
 * buyer can see what has not been verified and ask about it.
 *
 * They live inside the description rather than a column of their own so nothing
 * about the listing pipeline has to change. The heading is deliberately plain
 * English: the listing detail page pulls the block out and styles it, and
 * anywhere else it leaks (search snippets, message previews) it still reads as
 * an ordinary sentence rather than a stray marker.
 */
export const UNCONFIRMED_DETAILS_HEADING = "Ask the seller to confirm:";

const BULLET = "• ";

export function appendUnconfirmedDetails(description: string, points: string[]) {
  const cleaned = points.map((point) => point.trim()).filter(Boolean);
  if (!cleaned.length) return description;
  const block = [UNCONFIRMED_DETAILS_HEADING, ...cleaned.map((point) => `${BULLET}${point}`)].join("\n");
  return `${description.trimEnd()}\n\n${block}`;
}

/**
 * Splits a rendered description into its prose paragraphs and the unconfirmed
 * points, so the caller can style the two differently.
 */
export function splitUnconfirmedDetails(paragraphs: string[]) {
  const index = paragraphs.findIndex((paragraph) => paragraph.trimStart().startsWith(UNCONFIRMED_DETAILS_HEADING));
  if (index === -1) return { paragraphs, unconfirmed: [] as string[] };
  const block = paragraphs[index]
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^\s*[•-]\s*/, "").trim())
    .filter(Boolean);
  return { paragraphs: paragraphs.filter((_, position) => position !== index), unconfirmed: block };
}
