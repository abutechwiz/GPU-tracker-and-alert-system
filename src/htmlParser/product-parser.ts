import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { ParsedProduct, ParserSelectors } from '../common/types';

const DEFAULT_OUT_OF_STOCK_TEXT = [
  'out of stock',
  'sold out',
  'unavailable',
  'not available',
  'notify me when available',
  'notify when available',
];

const DEFAULT_IN_STOCK_TEXT = [
  'in stock',
  'available',
  'add to cart',
  'buy now',
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  '₹': 'INR',
  rs: 'INR',
  inr: 'INR',
  $: 'USD',
  usd: 'USD',
  '€': 'EUR',
  eur: 'EUR',
  '£': 'GBP',
  gbp: 'GBP',
};

/**
 * Converts a human formatted price ("₹1,59,999.00", "$1,599.99", "1.599,99 €")
 * into a number. Returns null when no number can be found.
 */
export function parsePrice(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const match = String(text).match(/\d[\d.,\s]*/);
  if (!match) return null;
  let raw = match[0].replace(/\s/g, '').replace(/[.,]$/, '');

  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    // Whichever separator comes last is the decimal separator.
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    raw = raw.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma !== -1) {
    // "1599,99" -> decimal comma; "1,599" / "1,59,999" -> grouping.
    raw =
      /,\d{2}$/.test(raw) && raw.split(',').length === 2
        ? raw.replace(',', '.')
        : raw.replace(/,/g, '');
  } else if (lastDot !== -1 && raw.split('.').length > 2) {
    // "1.599.000" -> grouping dots.
    raw = raw.replace(/\./g, '');
  }

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function detectCurrency(text: string | null | undefined): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (
      symbol.length === 1
        ? lower.includes(symbol)
        : new RegExp(`\\b${symbol}\\b`).test(lower)
    ) {
      return code;
    }
  }
  return null;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Classifies an availability string. Out-of-stock phrases win over in-stock ones. */
export function classifyAvailability(
  text: string | null | undefined,
  inStockText: string[] = DEFAULT_IN_STOCK_TEXT,
  outOfStockText: string[] = DEFAULT_OUT_OF_STOCK_TEXT,
): boolean | null {
  if (!text) return null;
  const value = normalize(text);
  if (!value) return null;
  // schema.org values such as "https://schema.org/InStock"
  if (/(outofstock|soldout|discontinued)$/.test(value)) return false;
  if (/(instock|limitedavailability|onlineonly|preorder|presale)$/.test(value))
    return true;
  if (outOfStockText.some((t) => value.includes(t.toLowerCase()))) return false;
  if (inStockText.some((t) => value.includes(t.toLowerCase()))) return true;
  return null;
}

type JsonObject = Record<string, unknown>;

/** JSON-LD scalars may be strings or numbers; anything else is ignored. */
function scalar(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : null;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasType(node: JsonObject, type: string): boolean {
  return asArray(node['@type'] as string | string[]).some(
    (t) => typeof t === 'string' && t.toLowerCase() === type.toLowerCase(),
  );
}

function findJsonLdProducts($: CheerioAPI): JsonObject[] {
  const products: JsonObject[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const obj = node as JsonObject;
    if (hasType(obj, 'Product') || hasType(obj, 'ProductGroup'))
      products.push(obj);
    if (obj['@graph']) visit(obj['@graph']);
    if (obj.mainEntity) visit(obj.mainEntity);
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    try {
      visit(JSON.parse(text));
    } catch {
      // Ignore malformed JSON-LD blocks; many sites ship invalid ones.
    }
  });
  return products;
}

function fromJsonLd($: CheerioAPI): Partial<ParsedProduct> {
  const product = findJsonLdProducts($)[0];
  if (!product) return {};

  const offers = asArray(product.offers as JsonObject | JsonObject[]).flatMap(
    (o) => (o && Array.isArray(o.offers) ? (o.offers as JsonObject[]) : [o]),
  );
  const aggregate = asArray(product.offers as JsonObject | JsonObject[])[0];

  const prices = offers
    .map((o) => parsePrice(scalar(o?.price) ?? scalar(o?.lowPrice)))
    .filter((p): p is number => p !== null);
  const aggregateLow = aggregate
    ? parsePrice(scalar(aggregate.lowPrice))
    : null;
  const price = prices.length ? Math.min(...prices) : aggregateLow;

  const availabilities = offers
    .map((o) =>
      classifyAvailability(
        typeof o?.availability === 'string' ? o.availability : null,
      ),
    )
    .filter((a): a is boolean => a !== null);
  const inStock = availabilities.length ? availabilities.some(Boolean) : null;

  const currency = offers
    .map((o) => o?.priceCurrency)
    .find((c): c is string => typeof c === 'string');

  return {
    title: typeof product.name === 'string' ? product.name.trim() : null,
    price,
    currency: currency ?? null,
    inStock,
  };
}

function attrOrText($: CheerioAPI, selector: string): string | null {
  const el = $(selector).first();
  if (!el.length) return null;
  const value =
    el.attr('content') ?? el.attr('value') ?? el.attr('href') ?? el.text();
  return value?.trim() || null;
}

function fromMeta($: CheerioAPI): Partial<ParsedProduct> {
  const priceText =
    attrOrText($, 'meta[property="product:price:amount"]') ??
    attrOrText($, 'meta[property="og:price:amount"]') ??
    attrOrText($, '[itemprop="price"]');
  const currency =
    attrOrText($, 'meta[property="product:price:currency"]') ??
    attrOrText($, 'meta[property="og:price:currency"]') ??
    attrOrText($, '[itemprop="priceCurrency"]');
  const availability =
    attrOrText($, 'meta[property="product:availability"]') ??
    attrOrText($, 'meta[property="og:availability"]') ??
    attrOrText($, '[itemprop="availability"]');

  return {
    title: attrOrText($, 'meta[property="og:title"]'),
    price: parsePrice(priceText),
    currency: currency ?? detectCurrency(priceText),
    inStock: classifyAvailability(availability),
  };
}

function fromSelectors(
  $: CheerioAPI,
  selectors: ParserSelectors,
): Partial<ParsedProduct> {
  const priceText = selectors.price ? attrOrText($, selectors.price) : null;
  const availabilityText = selectors.availability
    ? attrOrText($, selectors.availability)
    : null;
  return {
    title: selectors.title ? attrOrText($, selectors.title) : null,
    price: parsePrice(priceText),
    currency: detectCurrency(priceText),
    inStock: classifyAvailability(
      availabilityText,
      selectors.inStockText,
      selectors.outOfStockText,
    ),
  };
}

/** Last-resort availability detection from the visible page. */
function fromHeuristics(
  $: CheerioAPI,
  selectors: ParserSelectors,
): Partial<ParsedProduct> {
  const stockText =
    $(
      '.stock, .availability, .product-stock, #availability, [class*="stock-status"]',
    )
      .first()
      .text() || null;
  let inStock = classifyAvailability(
    stockText,
    selectors.inStockText,
    selectors.outOfStockText,
  );

  if (inStock === null) {
    const body = normalize($('body').text());
    const outOfStock = selectors.outOfStockText ?? DEFAULT_OUT_OF_STOCK_TEXT;
    if (outOfStock.some((t) => body.includes(t.toLowerCase()))) {
      inStock = false;
    } else {
      const buyButton = $('button, input[type="submit"], a.button, a.btn')
        .toArray()
        .some((el) => {
          const label = normalize($(el).text() || $(el).attr('value') || '');
          return label.includes('add to cart') || label.includes('buy now');
        });
      if (buyButton) inStock = true;
    }
  }

  return {
    title:
      $('h1').first().text().trim() || $('title').first().text().trim() || null,
    inStock,
  };
}

function firstDefined<T>(...values: (T | null | undefined)[]): T | null {
  for (const v of values) if (v !== null && v !== undefined) return v;
  return null;
}

/**
 * Extracts title, price and availability from a product page. Sources, in
 * order of precedence: retailer specific selectors, JSON-LD structured data,
 * Open Graph / microdata meta tags, and finally text heuristics.
 */
export function parseProductPage(
  html: string,
  selectors: ParserSelectors = {},
): ParsedProduct {
  const $ = cheerio.load(html);
  const custom = fromSelectors($, selectors);
  const jsonLd = fromJsonLd($);
  const meta = fromMeta($);
  const needsHeuristics =
    firstDefined(custom.inStock, jsonLd.inStock, meta.inStock) === null;
  const heuristics: Partial<ParsedProduct> = needsHeuristics
    ? fromHeuristics($, selectors)
    : { title: $('h1').first().text().trim() || null };

  return {
    title: firstDefined(
      custom.title,
      jsonLd.title,
      meta.title,
      heuristics.title,
    ),
    price: firstDefined(custom.price, jsonLd.price, meta.price),
    currency: firstDefined(custom.currency, jsonLd.currency, meta.currency),
    inStock: firstDefined(
      custom.inStock,
      jsonLd.inStock,
      meta.inStock,
      heuristics.inStock,
    ),
  };
}
