from django.db import connection

# ponytail: SQL over 316k rows beats a Python loop; outlier rule is global (10x / 0.1x of the
# product's raw median), no per-category logic.
# ponytail: two offers use the lower price as reference (their mean flags the cheap one);
# a genuinely 10x-priced second offer is hidden.
OUTLIERS = """
UPDATE catalog_offer o SET is_outlier = (o.price_toman > 10 * m.med OR o.price_toman < 0.1 * m.med)
FROM (SELECT product_id,
        CASE WHEN count(*) = 2 THEN min(price_toman)
             ELSE percentile_cont(0.5) WITHIN GROUP (ORDER BY price_toman) END AS med
      FROM catalog_offer GROUP BY product_id) m
WHERE m.product_id = o.product_id
"""

# ponytail: offer_count counts distinct shops, because the UI says «فروشگاه»;
# a shop's second offer is not a second seller.
PRODUCTS = """
UPDATE catalog_product p SET min_price = s.mn, median_price = s.med, max_price = s.mx,
  offer_count = coalesce(s.n, 0)
FROM catalog_product p2
LEFT JOIN (SELECT product_id, min(price_toman) mn, max(price_toman) mx, count(DISTINCT shop_id) n,
             round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_toman))::bigint med
           FROM catalog_offer WHERE NOT is_outlier GROUP BY product_id) s ON s.product_id = p2.id
WHERE p.id = p2.id
"""

# ponytail: denominator is the product median, not the category median: it compares like with
# like (a cable and a laptop share a category). Shops without offers keep a NULL band.
BANDS = """
UPDATE catalog_shop sh SET price_band = b.band
FROM (SELECT shop_id, ntile(5) OVER (ORDER BY ratio) AS band
      FROM (SELECT o.shop_id,
              percentile_cont(0.5)
                WITHIN GROUP (ORDER BY o.price_toman::float / p.median_price) AS ratio
            FROM catalog_offer o JOIN catalog_product p ON p.id = o.product_id
            WHERE NOT o.is_outlier AND p.median_price > 0 GROUP BY o.shop_id) r) b
WHERE b.shop_id = sh.id
"""


def price_stats():
    """Flag outliers, refresh product min/median/max/count and shop price bands."""
    with connection.cursor() as c:
        c.execute(OUTLIERS)
        c.execute(PRODUCTS)
        c.execute(BANDS)
        c.execute("SELECT count(*) FROM catalog_offer WHERE is_outlier")
        outliers = c.fetchone()[0]
        c.execute("SELECT count(*) FROM catalog_product WHERE min_price IS NOT NULL")
        priced = c.fetchone()[0]
        c.execute("SELECT count(*) FROM catalog_shop WHERE price_band IS NOT NULL")
        banded = c.fetchone()[0]
    return outliers, priced, banded


def category_quantiles(category_name: str) -> dict[str, int]:
    with connection.cursor() as c:
        c.execute(
            """SELECT percentile_cont(array[0.1,0.25,0.5,0.75,0.9])
                 WITHIN GROUP (ORDER BY p.min_price)
               FROM catalog_product p JOIN catalog_category c ON c.id = p.category_id
               WHERE c.name = %s AND p.offer_count >= 2""",
            [category_name],
        )
        (q,) = c.fetchone()
    if q is None:
        return {}
    return {k: round(v) for k, v in zip(["p10", "p25", "p50", "p75", "p90"], q, strict=True)}
