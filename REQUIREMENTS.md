# ratio.ai: requirements

Written Nov 2026 from a full read of the code (backend/, frontend/, extension/), PRD.md,
README.md, UPDATES.md and the OAuth and extension notes. It states what the app is for and
what "working" means, so the code can be rebuilt against it. FIX-PLAN.md says how.

## 1. What it is for

Family and friends collect recipes as links. ratio.ai turns a recipe link into a **card that
is easy to remember**: the few ingredients that matter, in one short ratio, with a link back
to the original. The point is to stop going back to blogs and videos.

Primary users: Sanj's mom and family, on phones, sending links from wherever they found them.

## 2. The card (the product)

One card per recipe. Everything else serves it.

| Part | Requirement |
|---|---|
| Title | The recipe's own name, linked to the original page. |
| Ratio | One line, single digits where possible, e.g. **3 : 2 : 1**, with what each number is underneath (flour : fat : sugar). Weight-based. |
| Base | The amount the ratio is "per", e.g. "1 part = 120 g". So the ratio can be scaled in your head. |
| Key ingredients | The ingredients that make up the ratio, each with its amount in the recipe's units and in grams. |
| The rest | Everything else (salt, spices, leavening, mix-ins, garnish) in a short, smaller list, still with amounts. Nothing dropped silently. |
| Original line | Each ingredient keeps its original text, shown on the side (the "debug" column), so a bad parse can be seen and fixed. |
| Edit | Any amount, unit, gram value or name can be corrected; the ratio updates at once. Editing grams must count (today it is ignored). |
| Kind | Which ratio family it is: dough/bread, cookie, cake, batter, pastry, sauce, vinaigrette, brine, or "no clean ratio". |
| Share | A card has its own link that shows the same card to anyone. |

Cards must read well at 375 px wide with no sideways scrolling.

### Ratio rules

- Grams are the common unit. Volume converts by ingredient density; count items (eggs, cloves)
  by typical weight.
- Pick the ratio family from what is present, not one fixed flour:liquid:egg:fat order. Cookies
  need sugar; bread needs water and salt as baker's percentages; a vinaigrette is oil : acid.
- Express the ratio relative to its smallest major part (Ruhlman style: 5 : 3 flour : water),
  rounded to whole or half numbers, and show the exact grams beside it.
- Ingredients under ~3 % of the total weight stay out of the ratio but stay on the card.
- If no family fits, say so and show the key ingredients by weight instead of a forced ratio.

## 3. Getting a recipe in

| Way in | Requirement |
|---|---|
| Paste a link | On the site. |
| Phone share sheet | Android: installed web app as a share target. iPhone: the Shortcut on /phone.html. Both land on `/share?url=`. (Built Nov 2026.) |
| Chrome extension | Button on recipe pages and right-click menu; opens the card. Must point at the live host. |
| Re-open | Tap a saved card. |

Extraction must:

- Read schema.org Recipe JSON-LD in all its common shapes: a single object, an array, an
  `@graph`, `@type` as a string or a list (`["Recipe", "NewsArticle"]`), and
  `recipeIngredient` as strings or objects.
- Fall back to HTML only inside the recipe card markup (WPRM, Tasty, Mediavine Create, etc.),
  never the whole article. Story paragraphs must never become ingredients.
- Handle unicode fractions, ranges ("1 to 1½"), dual units ("50 g / 3 tbsp"), parentheticals,
  "plus more", "divided", "optional", and section headers.
- Fail clearly ("this page has no recipe we can read") instead of returning junk.
- Answer in under 5 seconds for normal pages.

## 4. Saving and sharing

- Family can save cards and see each other's (the "community recent" feed from the PRD).
- Sign-in is Google. It is optional: the site works fully without it. The sign-in banner is
  off until sign-in is set up on ratio.clocknumbers.com (`SHOW_SIGNIN_BANNER` in App.tsx).
- Saved cards persist (Postgres). Users see friendly handles ("CleverFox"), never emails of others.
- A saved card stores the edited version, not just the URL.

## 5. Look

- Thanksgiving edition theme (neon dusk, harvest colours), night and day modes on the title.
- Installable, with an icon and a share card for links.
- Half padding on phones; ingredient rows as compact cards with the original text on the right.

## 6. Hosting

- Vercel project `ratio-ai`, at https://ratio.clocknumbers.com. React build is static;
  the FastAPI backend is one Python function under `/api/*`.
- The old Cloud Run service is gone. `.github/workflows/deploy-cloud-run.yml` still runs on
  every push and fails; it should be removed.
- Environment: `DATABASE_URL` (now SQLite in /tmp, so saves are lost; needs Postgres),
  `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `REACT_APP_GOOGLE_CLIENT_ID`.

## 7. Not in scope now

YouTube transcripts, paywalled sites, nutrition, ratings and tags, printing. (PRD phases 3 and 4.)
