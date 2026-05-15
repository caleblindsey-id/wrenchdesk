import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeOrValue, safeOr, safeOrRaw } from './safe-or'

// sanitizeOrValue — character-class coverage.

test('sanitizeOrValue strips commas', () => {
  assert.equal(sanitizeOrValue('foo,bar'), 'foobar')
})

test('sanitizeOrValue strips parens', () => {
  assert.equal(sanitizeOrValue('foo(bar)baz'), 'foobarbaz')
})

test('sanitizeOrValue strips ilike wildcards (* and %)', () => {
  // % and * are PostgREST/ilike wildcards. A user typing them shouldn't get
  // a magic match-everything query.
  assert.equal(sanitizeOrValue('a*b%c'), 'abc')
})

test('sanitizeOrValue strips all five chars in one pass', () => {
  assert.equal(sanitizeOrValue('a,b(c)d*e%f'), 'abcdef')
})

test('sanitizeOrValue leaves safe characters alone', () => {
  assert.equal(sanitizeOrValue("O'Brien & Sons #4"), "O'Brien & Sons #4")
})

// safeOr — composition.

test('safeOr builds a single-clause filter', () => {
  const filter = safeOr([{ column: 'name', op: 'ilike', value: 'foo' }])
  assert.equal(filter, 'name.ilike.foo')
})

test('safeOr joins multiple clauses with commas', () => {
  const filter = safeOr([
    { column: 'name', op: 'ilike', value: 'foo' },
    { column: 'account_number', op: 'ilike', value: 'bar' },
  ])
  assert.equal(filter, 'name.ilike.foo,account_number.ilike.bar')
})

test('safeOr blocks comma injection on the value', () => {
  // Without sanitization this would inject a second clause:
  //   name.ilike.foo,is_active.is.true
  // After sanitize: the comma is gone, so the whole thing collapses into
  // a single literal value the column will never match (dots/underscores
  // are fine inside a value — they aren't filter syntax in `.or()`).
  const filter = safeOr([
    { column: 'name', op: 'ilike', value: 'foo,is_active.is.true' },
  ])
  assert.equal(filter, 'name.ilike.foois_active.is.true')
  // Critical assertion: no comma remains, so PostgREST sees ONE clause.
  assert.equal(filter.split(',').length, 1)
})

test('safeOr blocks paren-based grouping injection', () => {
  const filter = safeOr([
    { column: 'name', op: 'ilike', value: 'foo),or(is_admin.eq.true' },
  ])
  // No comma, no parens — PostgREST cannot open a new group.
  assert.equal(filter, 'name.ilike.foooris_admin.eq.true')
  assert.equal(filter.includes('('), false)
  assert.equal(filter.includes(')'), false)
  assert.equal(filter.split(',').length, 1)
})

// safeOrRaw — bypass when caller already sanitized + wants control over wildcards.

test('safeOrRaw passes raw through (caller-sanitized usage)', () => {
  // Typical call site sanitizes once, then wraps with ilike wildcards.
  const q = sanitizeOrValue('foo')
  const filter = safeOrRaw([
    { column: 'name', op: 'ilike', raw: `%${q}%` },
    { column: 'account_number', op: 'ilike', raw: `%${q}%` },
  ])
  assert.equal(filter, 'name.ilike.%foo%,account_number.ilike.%foo%')
})
