/** Tags a community body may keep. Anything else is dropped. */
const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "code", "pre"]);

/**
 * The rich-text editor is a contentEditable, and a contentEditable wraps every
 * new line in a `div`. Dropping `div` as "not allowed" removed the wrapper but
 * kept its text, so a post written across several lines rendered as one run.
 * A `div` from that editor only ever means a paragraph, so it is normalised to
 * one rather than discarded.
 */
const TAG_ALIASES = new Map([["div", "p"]]);

/** Markup that already carries its own line structure. */
const BLOCK_MARKUP = /<(?:p|br|ul|ol|li|blockquote|pre)\b/i;

/**
 * Strips a community post body down to the tags we render, in the one place
 * both the post detail page and the blog card read it from.
 */
export function sanitizePostHtml(value: string) {
  const html = value.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, rawName: string) => {
    const name = rawName.toLowerCase();
    const normalized = TAG_ALIASES.get(name) ?? name;
    if (!ALLOWED_TAGS.has(normalized)) return "";
    return tag.startsWith("</") ? `</${normalized}>` : `<${normalized}>`;
  });

  // A body typed as plain text — the editor's source mode, or a seeded post —
  // carries its line breaks as newlines, which HTML collapses. Convert them
  // only when the body brought no line structure of its own, so a formatted
  // body is not given extra breaks for the newlines between its tags.
  return BLOCK_MARKUP.test(html) ? html : html.replace(/\r?\n/g, "<br>");
}
