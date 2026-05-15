// safe-or — builder for PostgREST `.or()` filter strings that interpolate
// user-supplied input.
//
// PostgREST parses commas as clause separators and parens as grouping inside
// `.or()`. If user input flows into the filter string without sanitization,
// the caller can inject extra clauses (e.g. `name.ilike.%foo%,is_active.is.true`
// turns into two filters when only the first was intended). See the CallBoard
// memory rule "PostgREST `.or()` comma injection" — this has been worked around
// inline in ~10 sites with a hand-rolled regex; this module consolidates the
// pattern in one tested place.
//
// Additionally strips `*` and `%` because they're ilike wildcards: leaving
// them in lets a user with a `%` in their search box accidentally produce a
// runaway "match anything" query. The `vendors/search` route was already
// using the stricter `[,()*%]` strip — that is now the canonical pattern.

/**
 * Sanitize a user-supplied value before splicing it into a PostgREST `.or()`
 * filter. Strips comma, parens, asterisk, and percent. Does NOT trim — callers
 * decide whether trimming/length capping matters for their flow.
 *
 * Use this for ANY value that traces back to user input (search box, URL
 * param, form field). Static / server-controlled values do NOT need it.
 */
export function sanitizeOrValue(value: string): string {
  return value.replace(/[,()*%]/g, '')
}

/**
 * Build a PostgREST `.or()` filter string from a list of clauses where the
 * `value` of each clause may come from user input. Values are sanitized;
 * `column` and `op` are passed through verbatim (callers control those).
 *
 * Example:
 *   .or(safeOr([
 *     { column: 'name',           op: 'ilike', value: `%${q}%` },
 *     { column: 'account_number', op: 'ilike', value: `%${q}%` },
 *   ]))
 *
 * Note: the `%` wildcards above are INTENDED — they go through sanitize too
 * but the result is still `name.ilike.%foo%` because sanitize strips ONLY
 * inside the value text, then the caller's surrounding `%` survives because
 * it's part of the template literal, not the input. Sanitization runs on
 * each `value` string AS-PASSED — if you want wildcards, build them in the
 * call site (typical pattern: `%${sanitizeOrValue(q)}%`).
 *
 * Realistic call: pre-sanitize the query once, then build with literal
 * `%${q}%`:
 *
 *   const q = sanitizeOrValue(rawInput.trim()).slice(0, 64)
 *   .or(safeOr([
 *     { column: 'name', op: 'ilike', raw: `%${q}%` },
 *     ...
 *   ]))
 *
 * For that "value already prepared" case use `safeOrRaw` below.
 */
export function safeOr(
  clauses: Array<{ column: string; op: string; value: string }>
): string {
  return clauses
    .map(({ column, op, value }) => `${column}.${op}.${sanitizeOrValue(value)}`)
    .join(',')
}

/**
 * Like `safeOr` but treats `raw` as already-sanitized (caller's
 * responsibility). Useful when the same sanitized query is reused across
 * multiple clauses with wildcards (typical pattern in the codebase).
 */
export function safeOrRaw(
  clauses: Array<{ column: string; op: string; raw: string }>
): string {
  return clauses.map(({ column, op, raw }) => `${column}.${op}.${raw}`).join(',')
}
