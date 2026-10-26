/**
 * What a community body keeps, in the one place both the post detail page and
 * the blog card read it from.
 *
 * The list is the editor's toolbar: every button it offers has to survive the
 * trip through here, or the writer formats a post and publishes a flat one.
 * Heading, Subheading, Strikethrough, Insert link and the colour swatches all
 * used to be dropped silently, which is the whole reason this list is written
 * against the markup `document.execCommand` actually produces — `<strike>`
 * rather than `<s>`, `<font color>` rather than a styled span, `<b>` and `<i>`
 * rather than their semantic twins.
 *
 * A table has no toolbar button, but it arrives by paste, from a page, a
 * spreadsheet or another post. Its cells keep a span when they have one, and
 * nothing else about how it looked.
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "h2", "h3", "blockquote",
  "strong", "b", "em", "i", "u", "s", "a", "span",
  "ul", "ol", "li", "code", "pre",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
]);

/**
 * Markup that means the same thing under another name.
 *
 * A contentEditable wraps every new line in a `div`; dropping it as "not
 * allowed" removed the wrapper but kept its text, so a post written across
 * several lines rendered as one run. `h1` belongs to the post's own title, so
 * a pasted one steps down rather than competing with it.
 */
const TAG_ALIASES = new Map([
  ["div", "p"],
  ["h1", "h2"],
  ["h4", "h3"],
  ["h5", "h3"],
  ["h6", "h3"],
  ["strike", "s"],
  ["del", "s"],
  ["font", "span"],
]);

/** Markup that already carries its own line structure. */
const BLOCK_MARKUP = /<(?:p|br|ul|ol|li|blockquote|pre|h2|h3|table)\b/i;

/** Links a post may point at. Anything else keeps its text and loses the link. */
const SAFE_HREF = /^(?:https?:\/\/|mailto:)[^\s"'<>]+$/i;

/** How many columns or rows a cell covers. Anything that is not a small count is ignored. */
const MAX_CELL_SPAN = 20;

/** Colours the swatches produce, and nothing that could close the attribute. */
const SAFE_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;

function attributeValue(attributes: string, name: string) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(attributes);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function cellSpan(attributes: string, name: "colspan" | "rowspan") {
  const value = Number(attributeValue(attributes, name));
  return Number.isInteger(value) && value > 1 && value <= MAX_CELL_SPAN ? ` ${name}="${value}"` : "";
}

/** The colour of a `font color` or of a span's inline `color:`, if it is one. */
function textColour(attributes: string) {
  const direct = attributeValue(attributes, "color");
  if (SAFE_COLOR.test(direct)) return direct;
  const declaration = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(attributeValue(attributes, "style"));
  const value = declaration?.[1].trim() ?? "";
  return SAFE_COLOR.test(value) ? value : "";
}

export function sanitizePostHtml(value: string) {
  // Everything from `<` to the next `>` is one tag, however it is spelled. The
  // older pattern asked for whitespace before any attributes, so `<img/src=x
  // onerror=…>` matched nothing and was copied into the page untouched — and
  // the editor's source mode lets anyone write exactly that. Attributes are
  // never passed through; the few that are kept are re-emitted from a value
  // that has been matched against a pattern of its own.
  const html = value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(\/?)([a-z][a-z0-9]*)([^>]*)>/gi, (_tag, closing: string, rawName: string, attributes: string) => {
      const name = rawName.toLowerCase();
      const normalized = TAG_ALIASES.get(name) ?? name;
      if (!ALLOWED_TAGS.has(normalized)) return "";
      if (closing) return `</${normalized}>`;
      if (normalized === "a") {
        const href = attributeValue(attributes, "href");
        // A link nobody can follow is still worth reading, so only the anchor
        // goes and its text stays.
        return SAFE_HREF.test(href) ? `<a href="${href}" target="_blank" rel="nofollow noopener noreferrer">` : "";
      }
      if (normalized === "td" || normalized === "th") return `<${normalized}${cellSpan(attributes, "colspan")}${cellSpan(attributes, "rowspan")}>`;
      if (normalized === "span") {
        const colour = textColour(attributes);
        return colour ? `<span style="color: ${colour}">` : "<span>";
      }
      return `<${normalized}>`;
    });

  // A body typed as plain text — the editor's source mode, or a seeded post —
  // carries its line breaks as newlines, which HTML collapses. Convert them
  // only when the body brought no line structure of its own, so a formatted
  // body is not given extra breaks for the newlines between its tags.
  return BLOCK_MARKUP.test(html) ? html : html.replace(/\r?\n/g, "<br>");
}
