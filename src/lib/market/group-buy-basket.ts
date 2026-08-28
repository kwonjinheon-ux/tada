/** The basket travels between the item list and the order form in the URL.
 *
 *  A group buy holds no stock and takes no payment, so there is nothing to
 *  reserve while someone decides — the basket is only the shape of the request,
 *  and the query string is the least machinery that can carry it. It also means
 *  a half-filled order can be shared or reopened from history.
 *
 *  Format: `id:qty,id:qty`. Unknown ids and junk quantities are dropped rather
 *  than trusted, because this string arrives from the address bar. */
export function encodeGroupBuyBasket(quantities: Record<string, number>) {
  return Object.entries(quantities)
    .filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0)
    .map(([id, quantity]) => `${id}:${quantity}`)
    .join(",");
}

export function decodeGroupBuyBasket(value: string | undefined, allowedIds: string[]) {
  if (!value) return {} as Record<string, number>;
  const allowed = new Set(allowedIds);
  const basket: Record<string, number> = {};
  for (const entry of value.split(",")) {
    const [id, rawQuantity] = entry.split(":");
    const quantity = Number(rawQuantity);
    if (!allowed.has(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) continue;
    basket[id] = quantity;
  }
  return basket;
}
