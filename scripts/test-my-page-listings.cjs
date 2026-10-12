// Offline regression coverage for My Page's owner-scoped listing query.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const output = ts.transpileModule(fs.readFileSync('src/lib/market/active-journey.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(output, {
  exports: exportsObject,
  require: (name) => {
    if (name === 'server-only') return {};
    if (name.endsWith('format-price')) return { formatMarketPrice: (cents) => `$${cents / 100}` };
    if (name.endsWith('storage-image')) return { getSignedStorageImages: async (_bucket, paths) => new Map(paths.map((path) => [path, `signed:${path}`])) };
    throw new Error(`Unexpected dependency ${name}`);
  },
});

function database(fail = false) {
  const calls = [];
  const row = (id, owner, status, created_at = '2026-10-01') => ({ id, owner_id: owner, status, created_at, title: id, price_cents: 18000 });
  const tables = {
    market_listings: [row('mine', 'owner', 'published'), row('pending', 'owner', 'pending'), row('other-user', 'other', 'published'), row('sold', 'owner', 'sold'), row('archived', 'owner', 'archived')],
    bargain_listings: [row('garage-sale', 'owner', 'published', '2026-10-02')],
    market_listing_photos: [{ listing_id: 'mine', storage_path: 'photo', display_order: 0 }],
    bargain_listing_photos: [],
  };
  return { calls, from(table) {
    calls.push(table);
    let rows = tables[table];
    assert.ok(rows, `Unexpected table ${table}`);
    const query = {
      select: () => query,
      eq: (key, value) => { rows = rows.filter((row) => row[key] === value); return query; },
      in: (key, values) => { rows = rows.filter((row) => values.includes(row[key])); return query; },
      order: (key, options) => { rows = [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (options?.ascending === false ? -1 : 1)); return query; },
      limit: (limit) => { rows = rows.slice(0, limit); return query; },
      then: (resolve) => Promise.resolve(fail ? { data: null, error: new Error('Unavailable') } : { data: rows, error: null }).then(resolve),
    };
    return query;
  } };
}

(async () => {
  const db = database();
  const result = await exportsObject.getListedJourneys(db, 'owner');
  assert.deepEqual(Array.from(result.items, (item) => item.id), ['garage-sale', 'mine', 'pending']);
  assert.equal(result.unavailable, false);
  const listing = result.items.find((item) => item.id === 'mine');
  assert.equal(listing.newOfferCount, 0);
  assert.equal(listing.listingPriceLabel, '$180');
  assert.equal(listing.imageUrl, 'signed:photo');
  assert.equal(listing.reviewHref, '/market/dashboard/listings');
  assert.equal(db.calls.includes('market_trade_offers'), false, 'Listings must not depend on offers');
  const failed = await exportsObject.getListedJourneys(database(true), 'owner');
  assert.equal(failed.unavailable, true);
  assert.equal(failed.items.length, 0);
  console.log('PASS: offer-free listings, ownership, status filtering, both market types, images, prices and query failure reporting');
})().catch((error) => { console.error(error); process.exitCode = 1; });
