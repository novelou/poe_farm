# PoE2 Boss Market Viewer — Implementation Plan

## 1. Goal

Build a small web tool for **Path of Exile 2 / Runes of Aldur (0.5.x)** that aggregates boss-farming information into one easy-to-scan page.

The tool is **not** an EV calculator, profit calculator, risk simulator, or div/hour calculator.

Primary goal:

> When the user is thinking "What does this boss cost to run right now, and what can it drop?", the answer should be visible within a few seconds.

The application should combine:

- live-ish market prices from poe.ninja
- boss / encounter access requirements
- boss-exclusive or notable drops
- estimated drop probabilities where credible data exists
- source / patch / sample-size metadata for probability data
- price trend information when poe.ninja exposes it

Keep the UI compact and information-dense.

---

## 2. Scope

Target league initially:

- `Runes of Aldur`

Target game version:

- `0.5.x`

Do not hard-code the league forever. Discover the current league from poe.ninja's league endpoint, but allow an environment/config override for development.

### Primary encounters

Implement these first:

1. **Trial of Chaos**
   - Entry: Inscribed Ultimatum
   - Show trial level / number-of-round implications when useful
   - This is an encounter rather than a single pinnacle boss, but is useful because it feeds Trialmaster access.

2. **The Trialmaster**
   - Access through the three Fates after a 10-round Trial of Chaos:
     - Cowardly Fate
     - Deadly Fate
     - Victorious Fate
   - Show the three components individually and combined access cost when prices exist.

3. **Atziri, the Red Queen**
   - Encounter: Atziri's Temple
   - Access is based on the temple system rather than a simple tradable boss key.
   - Show the relevant access materials / requirements that can be priced.
   - Drops actually come from Atziri's Vault after the kill; model this correctly rather than pretending they are direct monster drops.

4. **Vessel of Kulemak**
   - Encounter: The Black Cathedral
   - Entry: Kulemak's Invitation
   - Include the special Grip of Kulemak reward behavior and notable unique drops.

5. **The Bodach**
   - Encounter: Caer Tarth
   - Repeatable access requires the relevant effigy pieces.
   - Show each required component and combined market cost if all are priced.

6. **The Raven Trickster (Tangmazu)**
   - Encounter: The Withered Hollow
   - Entry: Raven's Reflection
   - Raven's Reflection is obtained from completing Simulacrum, so show that dependency.

7. **The Arbiter of Ash**
   - Encounter: The Burning Monolith
   - Repeatable access uses three Crisis Fragments.
   - Show all three required fragments separately and total access cost.

8. **The Arbiter of Divinity**
   - Encounter: The Origin Tower
   - Repeatable access uses Origin-related components / Origin Core.
   - Model the actual current 0.5.x access chain instead of assuming the old Realmgate system.

9. **Xesht, We That Are One**
   - Encounter: Twisted Domain
   - Current 0.5.x access item: Breachlord Sac.
   - Do not use obsolete pre-0.5 Breach Splinter difficulty logic.

10. **The King in the Mists**
    - Encounter: Crux of Nothingness
    - Include current 0.5.x repeatable access method.
    - This was missing from the initial list and should be a first-class target.

11. **The Aberration**
    - Encounter: Fallen Star
    - Current Runes of Aldur / Expedition pinnacle boss.
    - Entry: The Triskelion Reforged.
    - The Triskelion Reforged is created from a Shattered Triskelion / Expedition progression; expose the access chain where useful.
    - This is a required first-class target because it is the league's new Expedition pinnacle.

### Secondary / dependency encounters

These should be supported, but can be visually separated from the main boss list if the UI becomes crowded.

12. **Simulacrum**
    - Entry: Simulacrum.
    - Important because completing it yields Raven's Reflection for The Raven Trickster.
    - Show its notable rewards and the Raven access dependency.

13. **Zarokh, the Temporal**
    - Encounter: Trial of the Sekhemas.
    - Worth including because unique relics have their own market value and can change the reward from a run.
    - Do not let its more complex relic mechanics block the MVP.

14. **Olroth, Origin of the Fall**
    - Expedition progression boss.
    - Important as part of the access chain leading toward The Aberration.
    - Can be represented as a dependency / prerequisite rather than a top-level pinnacle card if desired.

The architecture must make adding another boss or encounter a JSON/data change rather than a UI rewrite.

---

## 3. Explicit non-goals

Do **not** implement these in the MVP:

- expected value (EV)
- expected profit per run
- ROI
- div/hour
- kill-time tracking
- "chance of going broke"
- Monte Carlo simulation
- farming recommendations
- build recommendations
- boss strategy guides
- automatic official-trade purchasing
- scraping poe.ninja HTML

The product is an **information aggregation viewer**, not a farming optimizer.

---

## 4. Data sources

### 4.1 poe.ninja — market prices

Use the documented public PoE2 Economy API.

Relevant endpoints:

```text
GET https://poe.ninja/poe2/api/economy/leagues

GET https://poe.ninja/poe2/api/economy/exchange/current/overview
    ?league={league}
    &type={type}

GET https://poe.ninja/poe2/api/economy/stash/current/item/overview
    ?league={league}
    &type={type}
```

Relevant exchange categories include:

```text
Currency
Fragments
Abyss
UncutGems
LineageSupportGems
Essences
SoulCores
Idols
Runes
Ritual
Expedition
Delirium
Breach
Verisium
```

Relevant stash item categories include at least:

```text
UniqueWeapon
UniqueArmour
UniqueAccessory
UniqueFlask
UniqueJewel
```

Inspect the current API response and add other supported PoE2 categories only when they are needed by boss drops.

### API behavior

- Fetch through our backend/server layer, **not directly from every browser client**.
- Respect poe.ninja cache headers and ETags.
- Cache market data for approximately **1 hour**.
- A 15–60 minute stale-while-revalidate window is fine.
- Do not poll every few seconds.
- Send a descriptive `User-Agent`.
- Handle API schema changes defensively.
- If poe.ninja is unavailable, serve the last successful cached snapshot when possible.
- Display the timestamp of the last successful market refresh.

### Price normalization

Internally retain:

- item id
- item name
- icon
- primary market value
- primary currency
- listing count where available
- sparkline / recent history where available
- source category
- fetchedAt

The UI may display prices in the most readable denomination, but the raw API values should be retained.

Do **not** calculate boss EV from these values.

---

## 5. Static encounter database

Boss topology, access rules, drop relationships, and probability estimates should live in a version-controlled data file.

Suggested location:

```text
src/data/encounters.json
```

or typed TS data:

```text
src/data/encounters.ts
```

Prefer TypeScript if it gives stronger validation.

Suggested shape:

```ts
type Encounter = {
  id: string;
  name: string;
  aliases?: string[];

  mechanic:
    | "trial-of-chaos"
    | "sekhemas"
    | "ritual"
    | "breach"
    | "delirium"
    | "abyss"
    | "expedition"
    | "fortress"
    | "atziri-temple";

  location?: string;

  access: {
    mode:
      | "single-item"
      | "multi-item"
      | "progression"
      | "special";

    items?: {
      itemName: string;
      quantity: number;
      poeNinjaCategory?: string;
      optional?: boolean;
    }[];

    notes?: string;
    prerequisiteEncounterIds?: string[];
  };

  drops: EncounterDrop[];

  source: {
    patch: string;
    url?: string;
    notes?: string;
  };
};

type EncounterDrop = {
  itemName: string;

  kind:
    | "unique"
    | "currency"
    | "fragment"
    | "lineage"
    | "relic"
    | "augment"
    | "other";

  probability?: {
    type: "exact" | "estimate" | "range" | "unknown" | "guaranteed";
    value?: number;
    min?: number;
    max?: number;
    sampleSize?: number;
    patch?: string;
  };

  guaranteed?: boolean;

  poeNinjaCategory?: string;

  notes?: string;
};
```

Do not invent probabilities.

If reliable probability data does not exist, use:

```text
Unknown
```

rather than estimating it ourselves.

---

## 6. Probability sources

Preferred source order:

1. mechanically guaranteed / documented in-game behavior
2. official GGG information
3. poe2wiki
4. Prohibited Library aggregated samples referenced by poe2wiki
5. other credible community samples

Every probability entry should be able to show:

- estimate / exact / range / guaranteed / unknown
- patch version
- sample size, when known
- source URL or source name

Examples of valid display:

```text
56% — estimated, n=100, 0.5.0
~10% — estimated, n=200, 0.5.0
23–34% — community estimate
Guaranteed
Unknown
```

Do not silently convert a range into a midpoint.

Do not carry pre-0.5 probabilities forward when the encounter was materially redesigned unless explicitly marked as historical.

---

## 7. Price resolution

Create a single price index from all fetched poe.ninja categories.

Suggested interface:

```ts
type MarketPrice = {
  itemName: string;
  value: number;
  currency: string;
  icon?: string;
  listingCount?: number;
  sparkline?: number[];
  sourceCategory: string;
};

function getPrice(itemName: string): MarketPrice | null;
```

Normalize item names carefully.

Support aliases when needed, but do not use loose fuzzy matching as the primary resolver because similarly named uniques or fragments can exist.

Prefer:

1. exact stable ID, if exposed and usable
2. exact canonical name
3. explicit alias table

Store unresolved items and expose them in development diagnostics.

---

## 8. Main UI

### Desktop

Main page should be a compact table/card hybrid.

Each encounter row/card should immediately answer:

- Boss / encounter name
- Mechanic
- Access item(s)
- Current access cost
- Most valuable / notable drops
- Current market price for each shown drop
- Drop probability
- Last price refresh

Example visual structure:

```text
┌ Xesht, We That Are One ────────────────────────────────┐
│ Breach · Twisted Domain                               │
│                                                       │
│ ACCESS                                                │
│ Breachlord Sac                         1.4 div         │
│                                                       │
│ DROPS                                                 │
│ Hand of Wisdom and Action       12.5%    8.2 div      │
│ The Pandemonius                  15%      1.1 div      │
│ Beyond Reach                    21.5%     18 ex        │
│ ...                                                   │
│                                                       │
│ Prices: 09:00 · Probabilities: 0.5.x / n=...          │
└───────────────────────────────────────────────────────┘
```

Numbers above are illustrative only. Never hard-code those sample prices.

### Important visual priorities

1. access price
2. expensive/notable drops
3. drop probability
4. full drop list
5. source metadata

Drops should default to **current market price descending** when price data is available.

Unknown-price drops should appear after priced drops.

Do not add stars, arbitrary "jackpot ratings", risk ratings, or editorial farming scores.

---

## 9. Main filters

Keep filters minimal.

Required:

- search by boss / item name
- mechanic filter
- primary vs secondary/dependency encounters
- show/hide unknown-price items

Useful:

- sort encounters by access cost
- sort encounters alphabetically
- sort encounters by highest-priced listed drop
- toggle currency display if the underlying API makes this straightforward

Do not turn the page into a spreadsheet with dozens of controls.

---

## 10. Encounter detail view

Clicking a boss/encounter opens a detail panel or route.

Show:

### Header

- canonical boss name
- aliases
- mechanic
- location
- patch/version

### Access

For a simple key:

```text
Raven's Reflection ×1
Current price: ...
```

For a multi-key encounter:

```text
Ancient Crisis Fragment    ×1   ...
Faded Crisis Fragment      ×1   ...
Weathered Crisis Fragment  ×1   ...
---------------------------------
Total access cost                ...
```

It is acceptable to sum required components here. This is **not** an EV/profit calculation; it is simply the current acquisition cost of the required set.

For progression-based encounters, show the chain:

```text
Simulacrum
  ↓ completion
Raven's Reflection
  ↓
The Raven Trickster
```

### Drops

Table columns:

```text
Item | Type | Drop chance | Current price | Price trend | Source
```

If a boss has guaranteed + random rewards, separate them visually.

For Vessel of Kulemak, special reward logic needs a small explanatory section rather than forcing everything into a flat loot table.

For Atziri, correctly describe Vault rewards.

### Source panel

Show source links and metadata at the bottom, not inline everywhere.

---

## 11. Price trends

If poe.ninja exposes sparkline data for the item, display a tiny sparkline or simple change indicator.

This is informational only.

Good:

```text
From Nothing
48 div
↑ 12% recent
```

Avoid:

```text
BUY NOW
HOT FARM
BEST ROI
```

No recommendations should be inferred from price movement.

---

## 12. Current 0.5.x access-model caveat

A major correctness requirement:

**Do not implement the pre-0.5 Realmgate + splinter difficulty model as the current system.**

0.5 changed pinnacle progression significantly:

- pinnacle bosses have deterministic quest versions
- repeatable non-quest versions exist
- old adjustable difficulty behavior was removed for these pinnacle encounters
- several access items were changed or reintroduced

Every encounter definition must be checked against the current 0.5.x behavior.

If a wiki page contains stale pre-0.5 information, prefer the 0.5 version history / current access text.

---

## 13. Data freshness and timestamps

Expose two different freshness concepts:

### Market freshness

```text
Market prices updated: 2026-08-31 09:00 JST
```

Derived from our latest successful poe.ninja fetch/cache.

### Drop-data freshness

```text
Drop data: Patch 0.5.0
Sample: n=200
```

These are not the same thing and must not be conflated.

---

## 14. Error handling

The tool should degrade gracefully.

### poe.ninja unavailable

Show:

```text
Market data temporarily unavailable.
Last successful update: ...
```

Keep static boss/drop information visible.

### Item price unavailable

Show:

```text
—
```

or

```text
No market data
```

Do not substitute zero.

### Probability unavailable

Show:

```text
Unknown
```

Do not infer it.

### Partial API category failure

Render all unaffected categories.

---

## 15. Suggested project structure

For a new Next.js app:

```text
src/
  app/
    page.tsx
    encounter/[id]/page.tsx
    api/
      market/route.ts

  components/
    EncounterCard.tsx
    EncounterTable.tsx
    AccessCost.tsx
    DropTable.tsx
    Price.tsx
    PriceTrend.tsx
    Probability.tsx
    SourceInfo.tsx
    Filters.tsx

  data/
    encounters.ts
    itemAliases.ts

  lib/
    poeNinja/
      client.ts
      types.ts
      normalize.ts
      priceIndex.ts

    encounters/
      types.ts
      resolvePrices.ts

  tests/
    priceIndex.test.ts
    encounterValidation.test.ts
```

Use existing project conventions if Codex is working in an existing repository.

Do not introduce a database for the MVP unless the existing project already has one.

---

## 16. Validation

Add startup/build-time validation for encounter data.

Examples:

- encounter IDs unique
- item names non-empty
- quantities positive
- exact probability between 0 and 1
- range min <= max
- range values between 0 and 1
- `guaranteed` consistent with probability type
- source patch present when probability is estimated
- prerequisites reference existing encounter IDs

Fail loudly in development for invalid static data.

---

## 17. Testing

Minimum useful tests:

### Market normalization

- exact item resolution works
- alias resolution works
- unknown items return null
- duplicate names from different categories do not silently choose an unsafe match
- stale cached snapshot can still be served

### Encounter data

- schema validates all encounter definitions
- multi-item access totals only required items
- unknown prices remain unknown rather than zero
- probability ranges remain ranges
- guaranteed drops render as guaranteed

### UI

At least verify:

- encounter cards render without market data
- loading/error state
- multi-component access
- unknown probability
- guaranteed reward
- price sorting
- search by item name

---

## 18. MVP implementation order

### Phase 1 — skeleton

- Next.js page
- typed encounter schema
- static encounter definitions
- compact encounter cards / table

### Phase 2 — live market data

- poe.ninja API client
- backend cache
- price normalization/index
- access-item prices
- unique drop prices
- last-refresh timestamp

### Phase 3 — probability metadata

- add curated drop rates
- add source / patch / sample-size metadata
- render unknowns safely

### Phase 4 — dependency chains

- Trial of Chaos -> Fates -> Trialmaster
- Simulacrum -> Raven's Reflection -> Raven Trickster
- Expedition progression -> Olroth / Triskelion -> The Aberration
- Fortress components -> Arbiter of Ash / Divinity

### Phase 5 — polish

- responsive mobile layout
- price-descending drop ordering
- search/filter
- sparklines / price-change indicators
- source links
- stale-data indicator

---

## 19. Initial encounter IDs

Use stable internal IDs similar to:

```text
trial-of-chaos
trialmaster
atziri
vessel-of-kulemak
bodach
raven-trickster
arbiter-of-ash
arbiter-of-divinity
xesht
king-in-the-mists
aberration
simulacrum
zarokh
olroth
```

Display names can change without breaking relationships.

---

## 20. Research checklist before populating production data

Before considering the first data set complete, verify current 0.5.x information for every target:

```text
[ ] exact repeatable access method
[ ] exact access-item names and quantities
[ ] whether the access item is tradable / visible on poe.ninja
[ ] guaranteed drops
[ ] exclusive uniques
[ ] non-unique valuable boss drops
[ ] lineage gems / relics / augments if boss-specific
[ ] current estimated probabilities
[ ] probability sample size
[ ] patch/version of the sample
[ ] poe.ninja category for every market-priced item
[ ] dependency encounters
```

Do not block the application on missing probability data. Unknown values are valid.

---

## 21. UX principle

The target experience is:

> Open site -> find boss -> immediately see current entry price + what it can drop + current drop prices + known drop rates.

The page should favor **clarity and freshness over calculations**.

A user should not need to browse poe.ninja, poe2wiki, and community drop-rate spreadsheets separately just to answer a simple boss-farming question.

---

## 22. Reference notes used for this plan

Current behavior should be re-verified during implementation, but the plan was based on:

- poe.ninja public PoE2 Economy API documentation
- poe2wiki current 0.5.x pinnacle encounter pages
- poe2wiki 0.5.0 / 0.5.x version history
- poe2wiki drop-rate estimates that cite community sample sets such as Prohibited Library

Important current facts checked while preparing the plan:

- poe.ninja says PoE2 economy data refreshes roughly hourly and clients should respect cache headers.
- 0.5 changed pinnacle access and removed the old adjustable pinnacle-difficulty flow.
- The Raven Trickster is the current Delirium pinnacle and uses Raven's Reflection.
- Vessel of Kulemak is the Abyss pinnacle and uses Kulemak's Invitation.
- The Aberration is the Expedition / Runes of Aldur pinnacle and uses The Triskelion Reforged.
- The King in the Mists remains the Ritual pinnacle and should be included.
- The Arbiter of Divinity was introduced in 0.5.0.
- Atziri's 0.5 encounter rewards are associated with the post-kill Vault.
