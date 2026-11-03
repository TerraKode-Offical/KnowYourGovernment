import sanitizeHtmlLib from "sanitize-html";

/**
 * Sanitize HTML content from external APIs before rendering.
 * Strips scripts, event handlers, and dangerous attributes while
 * preserving safe markup (paragraphs, links, lists, emphasis).
 *
 * Uses `sanitize-html` (pure-JS htmlparser2) instead of DOMPurify
 * to avoid jsdom/parse5 ESM/CJS compatibility issues in Vercel
 * serverless functions.
 */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      "p", "br", "strong", "em", "b", "i", "u",
      "ul", "ol", "li", "a", "blockquote",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "span", "div", "sup", "sub", "pre", "code",
      "table", "thead", "tbody", "tr", "td", "th",
    ],
    allowedAttributes: {
      a: ["href", "rel", "class", "title"],
      "*": ["class"],
    },
    // Explicitly restrict URI schemes so javascript:/data: links can never
    // pass through, even for attributes added to the allowlist later (S-3).
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    disallowedTagsMode: "discard",
  });
}
