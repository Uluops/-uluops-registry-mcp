/**
 * Compact schema digest
 *
 * Condenses a full JSON Schema document (ADL/CDL/WDL/PDL) into a digest that
 * preserves everything needed to author a valid definition — field names,
 * types, required flags, complete enums, conditional requirements, and
 * structure — while dropping the keywords that only matter for exact
 * validation ($id, patterns, length/range bounds, examples, format,
 * additionalProperties).
 *
 * Two shape choices keep it small *and* readable as emitted (the MCP layer
 * pretty-prints with 2-space indent, so deeply-nested object forms inflate
 * badly):
 *   1. Leaf fields collapse to a single signature STRING — "req · string ·
 *      <desc>" — so indentation has almost nothing to inflate.
 *   2. $defs stay flat; refs become "→name" pointers rather than being inlined
 *      (the source schema is already ref-based, so inlining would only
 *      duplicate structure).
 *
 * Roughly 40–60% smaller than the full schema as emitted. For exact validation
 * constraints, callers request format:'full'.
 */

type Json = unknown;
type JsonObject = Record<string, Json>;

const MAX_DESC = 100;

/** Clip a description to its first sentence, capped in length. */
function firstSentence(desc: string): string | undefined {
  const trimmed = desc.trim();
  if (!trimmed) return undefined;
  const idx = trimmed.indexOf('. ');
  let s = idx === -1 ? trimmed : trimmed.slice(0, idx);
  s = s.replace(/\.$/, '');
  return s.length > MAX_DESC ? `${s.slice(0, MAX_DESC - 1)}…` : s;
}

function isObject(v: Json): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const COMPOSITE_ARRAY_KEYS = ['oneOf', 'anyOf', 'allOf'] as const;
const COMPOSITE_NODE_KEYS = ['if', 'then', 'else', 'not'] as const;

/** Does this node carry structure that forces an object (vs. string) form? */
function hasStructure(obj: JsonObject): boolean {
  if (isObject(obj.properties) && Object.keys(obj.properties).length > 0) return true;
  if (Array.isArray(obj.required) && obj.required.length > 0) return true;
  for (const k of COMPOSITE_ARRAY_KEYS) if (Array.isArray(obj[k])) return true;
  for (const k of COMPOSITE_NODE_KEYS) if (obj[k] !== undefined) return true;
  return false;
}

/** Build the inline scalar part of a signature: "string", "string enum[a|b]", "const=…". */
function scalarSignature(obj: JsonObject): string {
  const parts: string[] = [];
  const t = obj.type;
  if (Array.isArray(t)) parts.push(t.join('|'));
  else if (typeof t === 'string') parts.push(t);

  if (obj.const !== undefined) parts.push(`const=${JSON.stringify(obj.const)}`);
  if (Array.isArray(obj.enum)) parts.push(`enum[${obj.enum.map((e) => String(e)).join('|')}]`);

  return parts.length > 0 ? parts.join(' ') : 'any';
}

/**
 * Compact a schema node.
 *
 * Returns a STRING for leaves/refs/scalar-arrays (the signature), or an OBJECT
 * for nodes that carry properties, required lists, or composite keywords.
 */
function compactNode(node: Json): Json {
  // Boolean schemas: `false` forbids the field, `true` allows anything.
  if (node === false) return 'forbidden';
  if (node === true) return 'any';
  if (!isObject(node)) return node;

  // A $ref collapses to a bare pointer.
  if (typeof node.$ref === 'string') {
    const name = node.$ref.split('/').pop() ?? node.$ref;
    return `→${name}`;
  }

  const desc = typeof node.description === 'string' ? firstSentence(node.description) : undefined;

  // ---- Array: "array[itemsig]" when items is a leaf/ref, else { array_of }. ----
  if (node.type === 'array' && node.items !== undefined) {
    const itemSig = compactNode(node.items);
    if (typeof itemSig === 'string') {
      const base = `array[${itemSig}]`;
      return desc !== undefined ? `${base} · ${desc}` : base;
    }
    const out: JsonObject = { array_of: itemSig };
    if (desc !== undefined) out._d = desc;
    return out;
  }

  // ---- Structured node (object / composite / pure-required constraint). ----
  if (hasStructure(node)) {
    const out: JsonObject = {};
    if (desc !== undefined) out._d = desc;

    const required = new Set<string>(
      Array.isArray(node.required) ? node.required.filter((r): r is string => typeof r === 'string') : [],
    );

    const propKeys = isObject(node.properties) ? Object.keys(node.properties) : [];
    if (propKeys.length > 0) {
      const props: JsonObject = {};
      for (const [key, value] of Object.entries(node.properties as JsonObject)) {
        const child = compactNode(value);
        if (typeof child === 'string') {
          props[key] = required.has(key) ? `req · ${child}` : child;
        } else if (isObject(child)) {
          props[key] = required.has(key) ? { _req: 1, ...child } : child;
        } else {
          props[key] = child;
        }
      }
      out.props = props;
    }

    // Required names not represented in `props` (pure constraint nodes, or a
    // `then` clause that requires a field while only forbidding others).
    const orphanRequired = [...required].filter((r) => !propKeys.includes(r));
    if (orphanRequired.length > 0) {
      out.require = orphanRequired;
    }

    for (const k of COMPOSITE_ARRAY_KEYS) {
      if (Array.isArray(node[k])) out[k] = (node[k] as Json[]).map(compactNode);
    }
    for (const k of COMPOSITE_NODE_KEYS) {
      if (node[k] !== undefined) out[k] = compactNode(node[k]);
    }
    return out;
  }

  // ---- Leaf: single signature string. ----
  const sig = scalarSignature(node);
  return desc !== undefined ? `${sig} · ${desc}` : sig;
}

const LEGEND =
  'Compact schema digest (format:compact). How to read it: ' +
  'each field is a signature string "[req ·] <type> [enum[a|b|c]] [· description]". ' +
  '"→name" is a pointer — resolve it in `defs`. "array[X]" is an array of X. ' +
  'Structured fields are objects with `props`; `_req:1` marks a required object field, ' +
  '`require:[…]` lists conditionally-required fields, `oneOf`/`anyOf`/`allOf`/`if`/`then` ' +
  'carry conditional schema. Dropped vs. the full schema: patterns, length/range bounds, ' +
  "examples, format, additionalProperties. Call get_language with format:'full' for those.";

/**
 * Compact a full JSON Schema document into `{ legend, root, defs }`.
 *
 * `root` is the top-level schema (minus `$defs`); `defs` is the flat map of
 * compacted definitions that `root` and its descendants point into via "→name".
 */
export function compactSchemaContent(content: Record<string, unknown>): Record<string, unknown> {
  const top = { ...(content as JsonObject) };
  const rawDefs = (top.$defs ?? top.definitions ?? {}) as JsonObject;
  delete top.$defs;
  delete top.definitions;

  const defs: JsonObject = {};
  for (const [name, body] of Object.entries(rawDefs)) {
    defs[name] = compactNode(body);
  }

  return {
    legend: LEGEND,
    root: compactNode(top),
    defs,
  };
}
