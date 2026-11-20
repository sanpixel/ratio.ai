# ratio.ai: how to fix the code

What is broken today, why, and the order to fix it in. Read with REQUIREMENTS.md.
Line references are to the code as of Nov 2026.

## What is wrong, by file

### backend/scraper.py: the main reason results are junk

1. **JSON-LD crashes on modern sites.** `_is_recipe_schema` calls `data.get('@type', '').lower()`;
   many sites send `@type` as a list (`["Recipe"]`), so it throws. The `try` wraps the whole loop,
   so one bad block abandons every JSON-LD block on the page. Seen live: loveandlemons
   (`'list' object has no attribute 'get'`) and pinchofyum (`'list' object has no attribute 'lower'`).
2. **Arrays only look at item 0** (`data = data[0]`), and `@graph` is only checked on a dict.
3. **The HTML fallback reads the whole article.** `[class*="ingredient"]` matches blog sections,
   and `_looks_like_ingredient` accepts any line of 8 words or fewer. Focaccia came back with 45
   "ingredients", mostly story paragraphs, method steps and "Garlic Knots" links.
4. Section headers only detected when they end in `:`; JSON-LD has no sections, so the
   "multi-section dedupe" in main.py is guessing.

### backend/parser.py

5. Quantity regex takes the **first number anywhere** in the line, so "1 (¼-ounce) package yeast,
   2¼ teaspoons" and "105° to 115°F" give wrong amounts.
6. The unit list is short: can, stick, pinch, slice, large, bunch, sprig, quart, pint, kg and
   more are missing, so those lines get no unit and convert to 0 g.
7. Ranges ("1 to 1½") and "plus" amounts are not handled.
8. Dual measure ("50g / 3 tbsp") prefers the second one; it should prefer grams when given.

### backend/ingredient_normalizer.py

9. The fallback returns **the first word** of whatever is left ("when", "find", "my", "sliced").
10. Hand-written suffix list includes text from specific test recipes ("i like to use raw cane
    sugar..."). It only works for those four URLs.
11. `cheese` is filed as fat; `vanilla` has a liquid density but a seasoning category.

### backend/ratios.py

12. **The only ratio is flour : liquid : egg : fat** in that fixed order. Sugar is never in it,
    so cookies come out "5 : 1 : 3 flour : egg : fat". A cookie is flour : fat : sugar.
13. `_calculate_percentage_ratios` rounds each share to tenths of the total, so the numbers
    don't multiply back to the recipe and change when a minor ingredient moves.
14. Anything not in the density table converts to **0 g** (salt, baking soda, spices, "4 corn
    cobs"), and the logs fill with "Missing density".
15. About 250 lines of unused methods (`_calculate_category_ratios`, `_calculate_group_ratios`,
    `_convert_to_common_unit`, …).

### backend/main.py and auth

16. `/api/recalculate-ratios` rebuilds from quantity and unit, so **edited grams are ignored**.
17. `/api/saved-recipes` is everyone's last 12 recipes, behind login; the PRD wants a feed.
18. `SECRET_KEY` falls back to a fixed string; `GOOGLE_CLIENT_ID` unset means any Google token
    for any app is accepted (`aud` not checked). Both env vars must be required.
19. `get_current_user_optional` can never return None for a missing header (HTTPBearer raises
    first).
20. `@app.on_event("startup")` is deprecated; table creation should be a migration.
21. Static serving code for Cloud Run (frontend/build mount, catch-all route) is dead on Vercel.

### frontend/src/App.tsx (1,150 lines in one component)

22. The whole page is written **twice**: once inside the loading-screen branch and once after.
    Every UI change has to be made in both, and they have already drifted (different table,
    different ratio block, "Last 33" vs "Global Recent").
23. The 7-second loading GIF blocks the app on every visit.
24. Edits call the API on every keystroke with no debounce.
25. The sign-in button renders on a 7 s timer; the client ID falls back to `'YOUR_GOOGLE_CLIENT_ID'`.
26. Theme toggle isn't saved, despite UPDATES.md.
27. "Test Recipe Links" debug buttons ship to users.

### Repo and hosting

28. `.github/workflows/deploy-cloud-run.yml` runs on every push to a GCP project that is gone,
    and fails.
29. `parser_old.py`, `backend/ratio_ai.db` (a committed SQLite file), two copies of the extension
    zip, and `test_scraper.py` that tests nothing automatically.
30. Saves go to SQLite in /tmp on Vercel and vanish; needs a Postgres `DATABASE_URL`.

## The fix, in order

Each step ships on its own and leaves the site working.

**1. Extraction (fixes most of what people see).**
Replace the JSON-LD code with a walk over every JSON-LD block that collects any node whose
`@type` (string or list) includes `Recipe`, through arrays and `@graph`. Restrict the HTML
fallback to known recipe-card containers (`.wprm-recipe-ingredient`, `.tasty-recipes-ingredients li`,
`.mv-create-ingredients li`, `[itemprop=recipeIngredient]`). If neither finds anything, return
"no recipe found". Or use the maintained `recipe-scrapers` library, which already does this for
500+ sites, and keep ours as the fallback.

**2. Ingredient parsing.** Use a proper parser (`ingredient-parser-nlp`, CRF-based, or
`recipe-scrapers` + a small grammar): amount (with ranges and unicode fractions), unit (full
list), name, preparation, optional flag. Prefer grams when the line has them. Name matching
against a single ingredient table (name, aliases, category, density g/cup, g each), no
first-word fallback: unknown stays "unknown" and shows on the card.

**3. Ratio engine.** Convert every line to grams (density or g-each table; unknown = flagged,
not 0). Classify the recipe family from which categories carry the weight, then build that
family's ratio relative to its smallest major part, rounded to halves, with grams alongside.
Unit-test it on 20 saved recipe pages (fixtures in `backend/tests/`, no network).

**4. API.** One `POST /api/card` that returns the card shape in REQUIREMENTS.md section 2;
`POST /api/card/recalc` that trusts edited grams. Require `SECRET_KEY` and `GOOGLE_CLIENT_ID`.
Feed endpoint public, saves behind login. Delete dead code and the Cloud Run static serving.

**5. Frontend.** Split App.tsx into `Card`, `IngredientRow`, `RatioBlock`, `UrlBar`, `Feed`,
`SignIn`. Render the page once. Loading animation once per device (or not at all), never
blocking a shared link. Debounce edits. Save the theme. Hide test links behind `?debug`.

**6. Data.** Point `DATABASE_URL` at Postgres (a `ratio` schema on the clocknumbers Supabase
project is enough), move table creation to a migration, store the edited card.

**7. Clean-up.** Delete the Cloud Run workflow, `parser_old.py`, the committed SQLite file and
the duplicate zip; publish the extension 1.0.1 (already pointing at ratio.clocknumbers.com).

## How to know it works

- 20 fixture pages from different sites each give a sensible card (checked by hand once,
  then frozen as tests).
- Chocolate chip cookies read as flour : fat : sugar about 3 : 2 : 2, not 5 : 1 : 3.
- Focaccia shows 7 ingredients, not 45.
- Editing grams changes the ratio.
- A shared card link opens the same card on a phone at 375 px with no sideways scroll.
