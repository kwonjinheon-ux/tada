/**
 * Turns what a browser puts on the clipboard as `text/html` into the small,
 * clean markup a community post can hold.
 *
 * Copying from a web page, Word, Excel or Google Docs hands over a great deal
 * more than the words: stylesheets, class names, tracking attributes, wrappers
 * several levels deep. Pasted as it is, that is both unsafe and heavy against
 * the post's length limit. So the clipboard HTML is read as a document and
 * rebuilt from the few things a post can say — paragraphs, headings, lists,
 * quotes, bold, italic, underline, strikethrough, links and tables — and
 * everything else is dropped or unwrapped to its text.
 *
 * The result only ever contains the tags and attributes named here, with text
 * escaped, so it can be placed in the editor as markup. The page sanitises the
 * body again when it is shown; this is not what keeps readers safe, it is what
 * keeps the editor tidy.
 *
 * The browser's DOMParser does the reading, so this runs on the client only.
 */

/** Removed together with everything inside them. */
const DROP = new Set([
  "script", "style", "meta", "link", "head", "title", "noscript", "template", "iframe", "object", "embed",
  "svg", "canvas", "img", "picture", "video", "audio", "input", "button", "select", "textarea", "form",
  "colgroup", "col",
]);

/** Elements whose children are only structure: whitespace between them is not text. */
const STRUCTURAL = new Set(["table", "thead", "tbody", "tfoot", "tr", "ul", "ol"]);

/** Block-level children that make a plain wrapper a container rather than a paragraph. */
const BLOCK = new Set(["p", "div", "table", "ul", "ol", "li", "blockquote", "pre", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6"]);

const HEADINGS: Record<string, string> = { h1: "h2", h2: "h2", h3: "h3", h4: "h3", h5: "h3", h6: "h3" };
const KEEP_AS_IS = new Set(["p", "blockquote", "ul", "ol", "li", "pre", "code", "table", "thead", "tbody", "tfoot", "tr"]);
const MAX_SPAN = 20;

const escapeText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, "&quot;");
const safeLink = (value: string) => (/^(?:https?:\/\/|mailto:)[^\s"'<>]+$/i.test(value.trim()) ? value.trim() : "");

function span(element: Element, name: "colspan" | "rowspan") {
  const value = Number(element.getAttribute(name));
  return Number.isInteger(value) && value > 1 && value <= MAX_SPAN ? ` ${name}="${value}"` : "";
}

/** Bold, italic, underline and strikethrough that a word processor says in a style rather than a tag. */
function styleWrappers(element: HTMLElement) {
  const weight = element.style?.fontWeight ?? "";
  const decoration = `${element.style?.textDecoration ?? ""} ${element.style?.textDecorationLine ?? ""}`;
  const wrappers: string[] = [];
  if (weight === "bold" || weight === "bolder" || Number(weight) >= 600) wrappers.push("b");
  if (element.style?.fontStyle === "italic") wrappers.push("i");
  if (/underline/.test(decoration)) wrappers.push("u");
  if (/line-through/.test(decoration)) wrappers.push("s");
  return wrappers;
}

function convertChildren(parent: Node, insidePre: boolean): string {
  const structural = parent instanceof Element && STRUCTURAL.has(parent.tagName.toLowerCase());
  let out = "";
  parent.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (structural && !text.trim()) return;
      out += escapeText(insidePre ? text : text.replace(/[\s ]+/g, " "));
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) out += convertElement(node as HTMLElement, insidePre);
  });
  return out;
}

function convertElement(element: HTMLElement, insidePre: boolean): string {
  const tag = element.tagName.toLowerCase();
  if (DROP.has(tag)) return "";
  if (tag === "br") return "<br>";

  const wrap = (open: string, close: string, content: string) => (content.trim() || /<br>/.test(content) ? `${open}${content}${close}` : "");
  const inner = () => convertChildren(element, insidePre || tag === "pre");

  if (HEADINGS[tag]) { const name = HEADINGS[tag]; return wrap(`<${name}>`, `</${name}>`, inner()); }
  if (KEEP_AS_IS.has(tag)) {
    const content = inner();
    // An empty cell is still a cell: dropping it would shift the row.
    if (tag === "table" || tag === "thead" || tag === "tbody" || tag === "tfoot" || tag === "tr") return content.trim() ? `<${tag}>${content}</${tag}>` : "";
    return wrap(`<${tag}>`, `</${tag}>`, content);
  }
  if (tag === "th" || tag === "td") return `<${tag}${span(element, "colspan")}${span(element, "rowspan")}>${inner().trim()}</${tag}>`;
  if (tag === "caption") return wrap("<p><b>", "</b></p>", inner());

  if (tag === "a") {
    const href = safeLink(element.getAttribute("href") ?? "");
    const content = inner();
    return href && content.trim() ? `<a href="${escapeAttribute(href)}">${content}</a>` : content;
  }

  if (tag === "b" || tag === "strong") {
    // Google Docs wraps a whole copy in a bold tag that says font-weight: normal.
    const weight = element.style?.fontWeight ?? "";
    if (weight === "normal" || weight === "400") return inner();
    return wrap("<b>", "</b>", inner());
  }
  if (tag === "i" || tag === "em") return wrap("<i>", "</i>", inner());
  if (tag === "u") return wrap("<u>", "</u>", inner());
  if (tag === "s" || tag === "strike" || tag === "del") return wrap("<s>", "</s>", inner());

  // A plain wrapper holding blocks adds nothing; one holding only text is a paragraph.
  if (["div", "section", "article", "main", "header", "footer", "aside", "nav", "figure", "figcaption", "center"].includes(tag)) {
    const holdsBlocks = Array.from(element.children).some((child) => BLOCK.has(child.tagName.toLowerCase()));
    const content = inner();
    return holdsBlocks ? content : wrap("<p>", "</p>", content);
  }

  // Spans, fonts, Word's o:p and anything unknown: keep the words, and any
  // emphasis that was said by style rather than by tag.
  let content = inner();
  if (!content.trim()) return content;
  for (const name of styleWrappers(element).reverse()) content = `<${name}>${content}</${name}>`;
  return content;
}

/** Tags that, in a pasted piece of text, say it is HTML written out rather than prose. */
const SOURCE_TAG = /<\/?(?:table|thead|tbody|tfoot|tr|td|th|ul|ol|li|p|div|h[1-6]|br|blockquote|pre|a|b|strong|em|i|u|s|span)\b[^>]*>/i;

/**
 * Whether pasted text is HTML source: markup copied as words, from an editor, the
 * developer tools, a chat answer or a code block, where the clipboard holds the tags
 * themselves and nothing else.
 *
 * It must open with a tag and close with one, and contain a tag a post can use. A
 * sentence that only mentions a tag ("use the <b> tag to bold") is prose and stays so.
 */
export function looksLikeHtmlSource(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 7 || !trimmed.endsWith(">")) return false;
  return /^(?:<!doctype[^>]*>\s*)?<[a-z!]/i.test(trimmed) && SOURCE_TAG.test(trimmed);
}

/** The clean markup for clipboard HTML, or "" when there is no text in it. */
export function pastedHtmlToPostHtml(html: string): string {
  if (!html.trim() || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const markup = convertChildren(doc.body, false)
    // Paragraphs that held nothing but line breaks, and runs of breaks.
    .replace(/<p>(?:\s|<br>)*<\/p>/g, "")
    .replace(/(?:<br>\s*){3,}/g, "<br><br>")
    .trim();
  // Anything that is only markup — an image-only copy — has nothing to paste.
  return markup.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() ? markup : "";
}

const BLOCK_OPEN = /<(?:table|ul|ol|h[1-6]|p|div|blockquote|pre)\b[^>]*>/i;
const BLOCK_CLOSE = /<\/(?:table|ul|ol|h[1-6]|p|div|blockquote|pre)\s*>/gi;

/**
 * Markup written out in the middle of ordinary text: a line of explanation, then a
 * table, then a sign-off. Found by its first opening block tag and its last closing one,
 * so the words around it can be kept as words and the part between read as HTML.
 *
 * A mention is not markup. "Use <table> for grids" has an opening tag and nothing that
 * closes it, so it stays text.
 */
function splitEmbeddedMarkup(text: string) {
  const open = text.search(BLOCK_OPEN);
  if (open < 0) return null;
  let closeEnd = -1;
  for (const match of text.matchAll(BLOCK_CLOSE)) closeEnd = (match.index ?? 0) + match[0].length;
  if (closeEnd <= open) return null;
  return { head: text.slice(0, open), markup: text.slice(open, closeEnd), tail: text.slice(closeEnd) };
}

/** Plain words around markup, kept as a paragraph with their line breaks. */
function wordsToPostHtml(text: string) {
  const trimmed = text.trim();
  return trimmed ? `<p>${trimmed.split(/\r?\n/).map((line) => escapeText(line.trim())).join("<br>")}</p>` : "";
}

/**
 * The post markup for whatever is on the clipboard, or "" when it should paste as plain text.
 *
 * Written-out HTML comes first, whether it is the whole text or sits among other words. A
 * code block copied from a page carries its source as text and also as HTML that shows the
 * source in a box, and it is the source that was meant. Otherwise the clipboard's own HTML
 * is used, which is what copying a rendered table or article produces.
 */
export function clipboardToPostHtml(html: string, plainText: string): string {
  if (looksLikeHtmlSource(plainText)) {
    const fromSource = pastedHtmlToPostHtml(plainText);
    if (fromSource) return fromSource;
  }
  // Only when nothing was copied as rendered HTML. A page about HTML that quotes a tag
  // has the real article in its clipboard HTML, and that is the better thing to keep.
  const embedded = html ? null : splitEmbeddedMarkup(plainText);
  if (embedded) {
    const middle = pastedHtmlToPostHtml(embedded.markup);
    if (middle) return `${wordsToPostHtml(embedded.head)}${middle}${wordsToPostHtml(embedded.tail)}`;
  }
  return html ? pastedHtmlToPostHtml(html) : "";
}