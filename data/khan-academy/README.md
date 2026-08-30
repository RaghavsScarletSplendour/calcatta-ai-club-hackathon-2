# Khan Academy catalog (hackathon)

**This is not a live scrape of khanacademy.org.** Their public API is gone (HTTP 410). The site now sits behind a Fastly “Client Challenge.” GraphQL still answers, but only with a rotating query hash we do not have.

What you have here is a **course catalog reconstructed from public lists**, plus the **format** to steal.

## License (do not skip)

Most Khan Academy video and exercise material is **CC BY-NC-SA**.

- Credit Khan Academy.
- Link to https://www.khanacademy.org
- Say: *“All Khan Academy content is available for free at www.khanacademy.org.”*
- Non-commercial only. A paid product that uses their videos or exercises is not allowed without a deal.

Source: https://support.khanacademy.org/hc/en-us/articles/202262954

**Do not copy their videos or exercise banks into STAND.** Steal the *shape*: course → unit → lesson → teach then probe → mastery.

## What I actually hit (30 Aug 2026)

| Surface | Result |
|---|---|
| `GET /api/v1/topictree` | 410 — API removed |
| HTML pages (`/math`, `/courses`) | Fastly Client Challenge, ~3 KB shell |
| `GET /api/internal/graphql/ContentForPath` | JSON 400 — “No query found for this hash” |
| Official help: mastery-enabled courses | **Worked** (updated ~Jun 2026) |
| Indexed `/math` page | **Worked** via search index, 28 Aug 2026 |
| Algebra 1 unit-guide article | **Worked** via search index, 28 Aug 2026 |
| IMAGE Center course list | **Worked** (snapshot 19 Aug 2024 — older) |

## Files

- `courses.json` — machine catalog
- `CATALOG.md` — same, readable
- `FORMAT.md` — how Khan Academy maps onto STAND

## For the 5-hour build

Use **Statistics & probability** + **Algebra 1** as the seed for “accounts → analytics.” Use the mastery ladder as `stand.level` 0–3. Generate teach/probe with Grok. Link out to KA if you want, do not embed their content.
