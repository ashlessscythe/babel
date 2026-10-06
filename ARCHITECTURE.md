# Architecture Assessment

**Phase 1 audit — Tony's Library of Babel**  
**Upstream:** [tdjsnelling/babel](https://github.com/tdjsnelling/babel) (GPL-3.0)  
**Status:** Reference implementation inspected; rewrite not started.

---

## 1. Current system (as found)

### Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js + TypeScript (CommonJS, `tsc`) |
| HTTP | Koa 2 + `@koa/router` |
| Views | Pug SSR (`koa-pug`) |
| Math | `gmp-wasm` (GMP via WebAssembly) |
| Persistence | AWS S3 key/value for room bookmarks (LevelDB → S3 migration tool remains) |
| Packaging | Docker (`node:18-buster`), `docker-compose.yml` |
| Static assets | `koa-static` from `src/public` |

There is **no client SPA**, **no PWA**, **no automated test suite**, and **no rate limiting / CAPTCHA**.

### Source layout (essential)

```text
src/
  babel.ts          # Coordinate ↔ book index ↔ content (GMP)
  constants.ts      # Alphabet + library dimensions
  search.ts         # Search padding strategies (empty / random / words)
  index.ts          # Koa routes + bookmark hashing
  store.ts          # S3-backed hash → room map
  pdf.ts            # Full-book PDF export
  views/*.pug       # SSR pages
  public/           # CSS, client JS helpers, images, words.txt
  utils/
    gen-constants.ts   # Generates the `numbers` file (N, C, I)
    test-constants.ts  # Manual round-trip smoke for C×I ≡ 1 (mod N)
numbers                 # ~3.9 MB base-32 constants (N, C, I) — mathematically load-bearing
```

### Request flow today

```text
Browser
  → Koa route
    → resolve room hash (@sha256) via S3/cache
    → gmp-wasm: generateContent / lookupContent
    → Pug render or JSON redirect
```

All generation is **server-side**. The browser only sanitizes search input and posts to `/do-search`.

### URL structure (current)

| Route | Role |
| --- | --- |
| `/` | Home + discovered-room count |
| `/about` | Technical explanation |
| `/browse` | Manual coordinate entry |
| `/search` | Search form |
| `/ref/:identifier` | Read a page (`roomHash.wall.shelf.book.page`) |
| `/fullref/:identifier` | Expand hash to full room string |
| `/pdf/:identifier` | Generate entire book as PDF |
| `/bookmark/:identifier` | Download binary `.babel` bookmark |
| `/random` | Random page redirect |
| `POST /do-search` | Search → identifier |
| `POST /get-uid` | Room → hash |
| `POST /open-bookmark` | Upload `.babel` file |

Identifier form: `ROOM.WALL.SHELF.BOOK.PAGE` where `ROOM` may be replaced by `@` + SHA-256 hex.

### Database usage (current)

**Books are never stored.** Persistence exists only for:

1. `hash → full room identifier` (rooms can be ~10⁶ base-32 digits; too long for URLs)
2. `_bookmark_count` aggregate

Without S3 credentials, bookmarks are not durable (in-memory cache only; cold lookups fail).

---

## 2. What is mathematically essential vs incidental

### Essential (do not casually change)

- 32-character alphabet and base-32 digit alphabet
- Book / page geometry (410 × 40 × 80)
- Hexagon layout constants (4 walls × 5 shelves × 32 books)
- Sequential book index derived from `(room, wall, shelf, book)`
- Bijection `content ≡ index · C (mod N)` with inverse `I`
- The concrete `numbers` file shipped with this fork (`N`, `C`, `I`)

Changing `C`/`I` produces a **different library**. Changing book-level vs page-level uniqueness changes the **definition** of completeness.

### Incidental (safe to replace)

- Koa / Pug / SSR
- S3 as the hash store (any durable KV / Postgres works)
- Server-only generation (can move to Workers + client)
- Search padding UX modes (empty page / random chars / words)
- PDF generation library
- `.babel` binary bookmark format (replaceable with JSON export)
- CSS / Mucha-style images / microcopy

---

## 3. Proposed target architecture

Prefer **portability and offline computation** over preserving the Koa shell.

### Recommended stack

| Concern | Choice | Rationale |
| --- | --- | --- |
| Client | React + TypeScript + Vite | Isolated UI; Workers-friendly build |
| Routing | Lightweight React Router (or equivalent) | Shareable URLs without Pug |
| CSS | Tailwind or minimal custom CSS | Restraint over chrome; B&W system |
| Math core | Pure TS `core/` using **native `BigInt` first** | No Node FS; runs in browser, Worker, CF Worker, Node |
| Heavy work | Web Worker (`library.worker.ts`) | Never block UI on mulmod / digit decode |
| Optional accel | `gmp-wasm` behind an adapter **if** benchmarks win | Keep behind `BigIntBackend` interface |
| Server | Thin API (Hono or similar) on CF Workers *or* Node | Same handlers; swap adapter |
| DB | Neon Postgres (optional at runtime) | Room hashes, admin metrics, rate-limit state |
| Personal data | IndexedDB only | No accounts |
| PWA | Workbox / Vite PWA | Cache shell + math engine + preferences |

### Proposed module boundaries

```text
src/
  core/                 # ZERO imports from UI / HTTP / DB
    library/
    mathematics/        # mulmod, digit pack/unpack, N/C/I loaders
    coordinates/        # parse, format, move UDLRFB
    generation/         # page / book from identifier
    search/             # pad + inverse lookup
  workers/
    library.worker.ts
  server/
    api/
    rate-limit/
    turnstile/
  client/
    pages/ components/ reader/ explorer/ bookmarks/
  storage/
    local/              # IndexedDB
    database/           # Neon migrations (server only)
  pwa/
  admin/
```

**Invariant:** basic read/search/explore must work with DB down and (after engine cache) with network down.

### Data responsibilities

| Data | Where |
| --- | --- |
| Book/page text | Generated, never persisted |
| Room hash ↔ room | Server DB (optional cache); also embeddable when short |
| Bookmarks / notes / collections | Client IndexedDB + JSON export/import |
| Preferences | `localStorage` / IndexedDB |
| Admin metrics / rate limits | Postgres |
| Shareable collections | Prefer URL encoding; DB only if payload too large |

---

## 4. Coordinate & navigation model (product)

Canonical human form (aligned with existing math):

```text
ROOM   <base32>
WALL   1–4
SHELF  1–5
BOOK   1–32
PAGE   1–410
```

URL proposal (Phase 4+):

```text
/book/<roomHash-or-compact>/wall/<w>/shelf/<s>/book/<b>/page/<p>
/search?q=...
```

Legacy `/ref/...` should redirect.

**Movement (new):** map U/D/L/R/F/B to real coordinate transforms (wall/shelf/book/room adjacency), not random jumps. Exact adjacency rules → `COMPATIBILITY.md` § Movement.

---

## 5. Search semantics (important product truth)

Upstream search does **not** scan the library. It:

1. Builds a full book string containing the query (padding strategy depends on mode).
2. Runs inverse lookup to find the unique book index for that constructed content.
3. Returns that coordinate.

That is mathematically honest (“this exact book exists here”) but must never be marketed as “the Library returned a meaningful match.” Discovery toys (name, date, last message) reuse the same inverse path.

---

## 6. Offline / PWA engine

“Download the Library engine” means cache:

1. Client JS/CSS shell
2. Math module + `N`/`C`/`I` constants (or compressed form)
3. Worker entrypoint
4. IndexedDB schema for bookmarks

Not the 32^1,312,000 books.

Status indicators should distinguish: online / offline / cached assets / local computation in progress.

---

## 7. Security (Phase 8 sketch)

| Control | Notes |
| --- | --- |
| Cloudflare Turnstile | On public search / expensive endpoints |
| IP rate limit | Edge or Postgres-backed counters |
| Max search length | Cap ≤ book length; prefer page-length default UX |
| Timeouts / concurrency | Bound Worker CPU; queue or 503 gracefully |
| Admin auth | Env-configured secret / OIDC — no invented credentials |

---

## 8. Risks already visible

1. **Book-scale integers** (~1.3M base-32 digits) make every generate/lookup expensive vs page-only libraries.
2. **Cloudflare Worker CPU limits** may reject full book mulmod — must be measured before locking deployment.
3. **Room strings** force hashing for URLs; offline share of virgin rooms needs either local hash table sync or alternate compact encoding.
4. **`gmp-wasm` + Workers**: possible but larger cold start; SharedArrayBuffer/threading not available on CF — stick to single-thread paths.
5. **No tests today** — mathematical invariants must be locked before any rewrite.

---

## 9. Implementation order (confirmed)

1. Audit docs ← done
2. Mathematical core + tests (compatibility with `numbers`) ← in progress / BigInt core landed
3. **Interim UI differentiation (Pug/CSS)** ← active  
   Do **not** ship a cosmetic clone of the upstream floralwhite/Lora site. Even before the React rewrite, the live SSR surface must read as **The Library**: black/white, terminal + manuscript, search-first home, no `libraryofbabel.app` branding, no upstream analytics/donate chrome. Full React client still replaces this later.
4. Runtime / API
5. **Client shell (React rewrite — Phase 4)**  
   - Vite + React + TypeScript  
   - **Adopt [shadcn/ui](https://ui.shadcn.com/)** as the component primitive layer (Radix + Tailwind), restyled to The Library’s B&W / mono / manuscript tokens — not default shadcn “SaaS purple.”  
   - Prefer composing few primitives (Button, Input, Dialog, Tabs) over a large component grab-bag.  
   - Theme tokens must continue to support light/dark via the same mental model as interim `data-theme`.
6. Reader / explorer / movement
7. My Library (IndexedDB)
8. PWA + offline engine
9. Security
10. Admin
11. Deploy bake-off (Koyeb vs Cloudflare)
12. Final visual polish (illustrations, motion, empty/error states) — after functionality

### Interim UI acceptance (Phase 3a)

- [x] Remove `libraryofbabel.app` URLs from product UI, SEO, PDF, sitemap, README
- [x] Brand as **The Library**; credit upstream only as GPL derivative
- [x] Dark high-contrast B&W system (not floralwhite SaaS/essay layout)
- [x] Minimal homepage: brand, one lead line, search, few actions
- [x] Light/dark theme toggle (sun/moon), persisted locally
- [x] Stencil / silhouette SVG art (not photographic Mucha clones)
- [x] Google Analytics removed from head
- [ ] React + **shadcn/ui** client (Phase 4) — scheduled, not started

---

## 10. Branding & prior-art references

| Allowed | Not allowed in product chrome |
| --- | --- |
| Credit Tom Snelling / `tdjsnelling/babel` (GPL) | Presenting this deploy as libraryofbabel.app |
| Cite Borges; link Wikipedia / local Borges PDF | Upstream donate / contact email as *this* project’s support |
| Mention libraryofbabel.info as prior art | Copying upstream visual identity (cream page, darkred initials, same home essay layout) |
