# Parts Search on Ticket Completion

**Date:** 2026-03-26
**Status:** Design approved, pending implementation

---

## Context

Technicians currently enter parts manually on the ticket completion form — typing a description and price by hand. The products table already has ~2,607 items synced from Synergy with item numbers, descriptions, and list prices. Techs should be able to search and select products from this database to auto-fill price, while retaining the ability to manually enter non-stock items.

---

## Design

### Part Row Behavior

Each part row has a **search-or-type** description field:

1. **Search mode**: As the tech types (300ms debounce), query products by number + description. Show a dropdown with up to 25 matches formatted as `[number] — [description] — $[price]`.
2. **Select from DB**: Auto-fills description as `[number] - [description]`, sets unit price from the product record, stores `synergy_product_id`. Price input becomes **read-only** (showing the list price).
3. **Manual entry**: If the tech types a description without selecting from the dropdown, price remains editable. `synergy_product_id` stays `null`. This handles non-stock items.
4. **Clear selection**: An "x" button on a selected product clears it, returning to manual mode so the tech can search again or type freely.

### State Shape Change

**Current:**
```typescript
{ description: string; quantity: number; unitPrice: number }
```

**New:**
```typescript
{
  description: string
  quantity: number
  unitPrice: number
  synergyProductId: number | null  // links to products.synergy_id
  isFromDb: boolean                // controls price field editability
}
```

### Product Search Query

Direct Supabase client query (same pattern as customer search in CreateTicketModal):

```typescript
const { data } = await supabase
  .from('products')
  .select('id, synergy_id, number, description, unit_price')
  .or(`number.ilike.%${q}%,description.ilike.%${q}%`)
  .order('number')
  .limit(25)
```

No API route needed — query runs client-side via Supabase JS client.

### Completion Payload

`handleComplete()` maps parts to `PartUsed[]`:

```typescript
const partsUsed: PartUsed[] = parts.map((p) => ({
  synergy_product_id: p.synergyProductId ? Number(p.synergyProductId) : null,
  description: p.description,
  quantity: p.quantity,
  unit_price: p.unitPrice,
}))
```

This already matches the `PartUsed` interface. The billing PDF already resolves `synergy_product_id` to product details when present.

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/tickets/[id]/TicketActions.tsx` | Replace parts description input with debounced search combobox; add `synergyProductId`/`isFromDb` to parts state; make price read-only when DB product selected; update `handleComplete()` mapping |

**No other files change.** No new API routes, no new components, no backend changes. The `PartUsed` type, products table, and billing PDF already support `synergy_product_id`.

---

## Verification

1. Open a ticket as a tech (or manager)
2. Click "+ Add Part", type a product number or description
3. Confirm dropdown shows matching products with prices
4. Select a product — confirm description and price auto-fill, price is read-only
5. Click "x" to clear — confirm price becomes editable again
6. Add a manual part (don't select from dropdown) — confirm price is editable
7. Complete the ticket — confirm parts save correctly with `synergy_product_id` populated for DB items
8. Check billing PDF — confirm DB-linked parts show product details correctly
