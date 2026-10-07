import {
  classifyAvailability,
  parsePrice,
  parseProductPage,
} from './product-parser';

describe('parsePrice', () => {
  it.each([
    ['₹1,59,999.00', 159999],
    ['Rs. 1,62,500', 162500],
    ['$1,599.99', 1599.99],
    ['1.599,99 €', 1599.99],
    ['1599,99', 1599.99],
    ['2.499.000', 2499000],
    ['USD 999', 999],
    [' 1 299,00 ', 1299],
  ])('parses %s', (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });

  it('returns null for text without a number', () => {
    expect(parsePrice('Call for price')).toBeNull();
    expect(parsePrice(null)).toBeNull();
  });
});

describe('classifyAvailability', () => {
  it('understands schema.org values', () => {
    expect(classifyAvailability('https://schema.org/InStock')).toBe(true);
    expect(classifyAvailability('http://schema.org/OutOfStock')).toBe(false);
    expect(classifyAvailability('PreOrder')).toBe(true);
  });

  it('prefers out-of-stock phrases over in-stock ones', () => {
    expect(classifyAvailability('Currently unavailable')).toBe(false);
    expect(classifyAvailability('Not available - notify me')).toBe(false);
    expect(classifyAvailability('In Stock')).toBe(true);
    expect(classifyAvailability('Lorem ipsum')).toBeNull();
  });

  it('supports custom keywords', () => {
    expect(classifyAvailability('Ships today', ['ships today'], [])).toBe(true);
  });
});

describe('parseProductPage', () => {
  it('extracts data from JSON-LD', () => {
    const html = `<html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"},
       {"@type":"Product","name":"ASUS ROG Strix RTX 4090",
        "offers":{"@type":"Offer","price":"189999.00","priceCurrency":"INR",
                  "availability":"https://schema.org/InStock"}}]}
    </script></head><body><h1>Something else</h1></body></html>`;
    expect(parseProductPage(html)).toEqual({
      title: 'ASUS ROG Strix RTX 4090',
      price: 189999,
      currency: 'INR',
      inStock: true,
    });
  });

  it('takes the lowest offer and any in-stock offer', () => {
    const html = `<script type="application/ld+json">[{"@type":"Product","name":"RTX 4080",
      "offers":[{"price":1200,"availability":"OutOfStock","priceCurrency":"USD"},
                {"price":1100,"availability":"InStock"}]}]</script>`;
    expect(parseProductPage(html)).toMatchObject({
      price: 1100,
      inStock: true,
      currency: 'USD',
    });
  });

  it('handles AggregateOffer', () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"X",
      "offers":{"@type":"AggregateOffer","lowPrice":"999","priceCurrency":"USD"}}</script>`;
    expect(parseProductPage(html)).toMatchObject({
      price: 999,
      currency: 'USD',
    });
  });

  it('ignores malformed JSON-LD and falls back to meta tags', () => {
    const html = `<head>
      <script type="application/ld+json">{ broken</script>
      <meta property="og:title" content="Zotac RTX 4070" />
      <meta property="product:price:amount" content="54999" />
      <meta property="product:price:currency" content="INR" />
      <meta property="product:availability" content="out of stock" />
    </head>`;
    expect(parseProductPage(html)).toEqual({
      title: 'Zotac RTX 4070',
      price: 54999,
      currency: 'INR',
      inStock: false,
    });
  });

  it('reads microdata', () => {
    const html = `<div itemscope itemtype="https://schema.org/Product">
      <h1 itemprop="name">MSI RTX 4090</h1>
      <span itemprop="price" content="1799.00">$1,799.00</span>
      <link itemprop="availability" href="https://schema.org/InStock" />
    </div>`;
    expect(parseProductPage(html)).toEqual({
      title: 'MSI RTX 4090',
      price: 1799,
      currency: null,
      inStock: true,
    });
  });

  it('uses retailer selectors ahead of structured data', () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Old",
        "offers":{"price":"100","availability":"InStock"}}</script>
      <div class="pname">Gigabyte RTX 4090</div>
      <div class="pp">₹1,74,000</div>
      <div class="st">Coming soon</div>`;
    const result = parseProductPage(html, {
      title: '.pname',
      price: '.pp',
      availability: '.st',
      outOfStockText: ['coming soon'],
    });
    expect(result).toEqual({
      title: 'Gigabyte RTX 4090',
      price: 174000,
      currency: 'INR',
      inStock: false,
    });
  });

  it('falls back to page heuristics', () => {
    const inStock = `<title>RTX 4090 | Shop</title><body><h1>RTX 4090</h1>
      <button class="btn">Add to Cart</button></body>`;
    expect(parseProductPage(inStock)).toMatchObject({
      title: 'RTX 4090',
      inStock: true,
    });

    const outOfStock = `<body><h1>RTX 4090</h1><p class="stock">Out Of Stock</p>
      <button>Add to Cart</button></body>`;
    expect(parseProductPage(outOfStock).inStock).toBe(false);
  });

  it('returns nulls when nothing can be found', () => {
    expect(parseProductPage('<html><body>hello</body></html>')).toEqual({
      title: null,
      price: null,
      currency: null,
      inStock: null,
    });
  });
});
