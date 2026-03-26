// Generates src/data/element-attrs.ts from @webref/idl/html.idl
// Run: node scripts/generate-element-attrs.mjs

import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const idlText = readFileSync(resolve(__dirname, "../node_modules/@webref/idl/html.idl"), "utf-8")

// IDL property name → HTML attribute name overrides
// (some HTML attrs don't follow simple camelCase→kebab-case)
const idlToHtmlAttr = {
  allowFullscreen: "allowfullscreen",
  noModule: "nomodule",
  crossOrigin: "crossorigin",
  referrerPolicy: "referrerpolicy",
  fetchPriority: "fetchpriority",
  frameBorder: "frameborder",
  longDesc: "longdesc",
  marginHeight: "marginheight",
  marginWidth: "marginwidth",
}

// Obsolete attributes to skip entirely
const obsoleteAttrs = new Set([
  "align", "scrolling", "frameborder", "longdesc", "marginheight", "marginwidth",
  "charset", "event", "htmlFor", "html-for",
])

/**
 * Extract attribute names from all interface/partial interface blocks for a given interface name.
 * Returns HTML attribute names.
 */
function extractAttributes(interfaceName) {
  const attrs = []
  const interfacePattern = new RegExp(
    `(?:partial\\s+)?interface\\s+${interfaceName}[^{]*\\{([^}]+)\\}`,
    "g"
  )
  let match
  while ((match = interfacePattern.exec(idlText)) !== null) {
    const block = match[1]
    // Match: [optional extended attrs] attribute <type> <name>;
    const attrPattern = /\battribute\b[^;]*?\s(\w+)\s*;/g
    let attrMatch
    while ((attrMatch = attrPattern.exec(block)) !== null) {
      const camel = attrMatch[1]
      // Skip readonly properties (contentDocument, contentWindow, etc.)
      if (camel.startsWith("content") || camel === "text") continue
      // Map to HTML attribute name
      const htmlAttr = idlToHtmlAttr[camel] ?? camel.replace(/([A-Z])/g, (c) => "-" + c.toLowerCase())
      if (obsoleteAttrs.has(htmlAttr)) continue
      attrs.push(htmlAttr)
    }
  }
  return [...new Set(attrs)]
}

const iframeAttrs = extractAttributes("HTMLIFrameElement")
const scriptAttrs = extractAttributes("HTMLScriptElement")

console.log("iframe attrs from IDL:", iframeAttrs)
console.log("script attrs from IDL:", scriptAttrs)

// Descriptions written for each attribute (IDL gives names, we add descriptions)
const iframeDescriptions = {
  src: "URL of the page to embed",
  srcdoc: "Inline HTML to embed, overriding src",
  name: "Targetable name for the browsing context (used with window.open or form targets)",
  sandbox: "Space-separated tokens restricting iframe capabilities (e.g. allow-scripts allow-same-origin allow-forms)",
  allow: "Permissions Policy for the iframe (e.g. camera; microphone; fullscreen)",
  allowfullscreen: "Allows the iframe to enter fullscreen mode via requestFullscreen()",
  width: "Width of the iframe in CSS pixels",
  height: "Height of the iframe in CSS pixels",
  referrerpolicy: "Controls how much referrer info is sent: no-referrer, origin, strict-origin, same-origin, unsafe-url",
  loading: "Lazy-load: eager (default) loads immediately, lazy defers until near the viewport",
}

const scriptDescriptions = {
  src: "URL of the external script to load",
  type: 'MIME type, or "module" (ES module), "importmap", or "speculationrules"',
  async: "Fetch and execute the script asynchronously, without blocking parsing (classic scripts only)",
  defer: "Defer execution until after the document has fully parsed (classic scripts only)",
  nomodule: "Prevents execution in browsers that support ES modules — use for legacy fallback scripts",
  crossorigin: "Enable CORS: anonymous (send no credentials) or use-credentials",
  integrity: "Subresource Integrity hash (e.g. sha384-…) to verify the fetched script",
  referrerpolicy: "Controls referrer sent when fetching: no-referrer, origin, strict-origin, same-origin, unsafe-url",
  fetchpriority: "Hint the browser's fetch priority: high, low, or auto (default)",
  blocking: 'Mark as render-blocking: set to "render" to block page rendering until the script executes',
}

// Valid tokens for space-separated token-list attributes (DOMTokenList)
// These live in HTML spec prose, not IDL, so we define them here
const attrTokens = {
  sandbox: [
    "allow-downloads",
    "allow-forms",
    "allow-modals",
    "allow-orientation-lock",
    "allow-pointer-lock",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-presentation",
    "allow-same-origin",
    "allow-scripts",
    "allow-storage-access-by-user-activation",
    "allow-top-navigation",
    "allow-top-navigation-by-user-activation",
    "allow-top-navigation-to-custom-protocols",
  ],
}

// Fixed option sets for attributes with a small enumerated set of values
// → rendered as <select> instead of <input>
const attrOptions = {
  // iframe
  loading: ["eager", "lazy"],
  referrerpolicy: [
    "no-referrer",
    "no-referrer-when-downgrade",
    "origin",
    "origin-when-cross-origin",
    "same-origin",
    "strict-origin",
    "strict-origin-when-cross-origin",
    "unsafe-url",
  ],
  // script (referrerpolicy same values)
  crossorigin: ["anonymous", "use-credentials"],
  fetchpriority: ["auto", "high", "low"],
  type: ["", "module", "importmap", "speculationrules"],
}

function buildAttrList(attrs, descriptions, skip = []) {
  return attrs
    .filter((a) => !skip.includes(a))
    .map((name) => ({
      name,
      description: descriptions[name] ?? `Sets the ${name} attribute`,
      ...(attrTokens[name] ? { tokens: attrTokens[name] } : {}),
      ...(attrOptions[name] ? { options: attrOptions[name] } : {}),
    }))
}

// src, width, height are handled by dedicated inputs in IframeRenderer
const iframeAttrList = buildAttrList(iframeAttrs, iframeDescriptions, ["src", "width", "height"])

// src is the main script URL input in ScriptIframeRenderer
const scriptAttrList = buildAttrList(scriptAttrs, scriptDescriptions, ["src", "text"])

const output = `// AUTO-GENERATED by scripts/generate-element-attrs.mjs
// Source: @webref/idl html.idl — do not edit by hand
// Re-run: node scripts/generate-element-attrs.mjs

export interface AttrInfo {
  name: string
  description: string
  /** Valid tokens for space-separated token-list attributes (rendered as chip picker) */
  tokens?: string[]
  /** Fixed enumerated values (rendered as select) */
  options?: string[]
}

export const iframeAttributes: AttrInfo[] = ${JSON.stringify(iframeAttrList, null, 2)}

export const scriptAttributes: AttrInfo[] = ${JSON.stringify(scriptAttrList, null, 2)}
`

const outPath = resolve(__dirname, "../src/data/element-attrs.ts")
writeFileSync(outPath, output)
console.log("Written to", outPath)
