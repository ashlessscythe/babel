# Compatibility

**Phase 1 — compatibility with upstream Library of Babel (tdjsnelling/babel v3)**

---

## 1. Compatibility goals

| Goal | Priority |
| --- | --- |
| Same alphabet & geometry | Required |
| Same `(N, C, I)` → same book contents for a given coordinate | Required for “original library” mode |
| Same sequential index encoding | Required |
| Same URL shapes (`/ref/...`) | Soft — redirect OK |
| Same search padding modes / random seeds | Soft — document differences |
| Same S3 bookmark hashes | Soft — reproducible if SHA-256(room) unchanged |
| Same UI | Not required |

**Default policy:** preserve mathematical identity with upstream v3 unless a change is explicitly approved and dual-mode is shipped.

---

## 2. Compatibility mode definition

`libraryMode: "babel-v3"` (default):

- Load the exact `numbers` file from this repository (do not regenerate).
- Use `ALPHA`, `WALLS`, `SHELVES`, `BOOKS`, `PAGES`, `LINES`, `CHARS` from `constants.ts`.
- Use the sequential index formulas in `MATHEMATICS.md`.
- Page content for identifier `R.W.S.B.P` must equal upstream `generateContent(..., false)` byte-for-byte (after identical normalization).

Any other mode (e.g. experimental page-level library) must:

1. Use a different mode id and constants file.
2. Never claim parity with upstream coordinates.
3. Clearly label UI/URLs (e.g. `/folio/...` not `/book/...`).

---

## 3. What would break compatibility

| Change | Effect |
| --- | --- |
| New `C` / `I` | Entire remapping of books |
| Page-level bijection | Different completeness story; coordinates diverge |
| Alphabet edit | Divergent encoding |
| Altered room packing (≠ 640 books/room) | Divergent room IDs |
| 0-based walls/shelves/books | Divergent identifiers |
| Big-endian vs little-endian digit packing | Divergent contents |

**Allowed without breaking mapping:** UI, storage backend, bigint implementation, digit-window extraction, caching, URL shortening scheme (if hash function for rooms remains SHA-256 of the canonical room string).

---

## 4. URL compatibility

### Upstream

```text
/ref/@<sha256>.<wall>.<shelf>.<book>.<page>
/ref/<roomBase32>.<wall>.<shelf>.<book>.<page>   → 302 to hashed form
/random
/search , POST /do-search
```

Room hash: `"@" + sha256_hex(roomString)` where `roomString` is the base-32 room without unnecessary leading zeros (upstream strips leading `0` when length > 1).

### Proposed

- New canonical paths under `/book/...` and `/search?q=`.
- Keep permanent redirects from `/ref/:identifier` → new form.
- Preserve hash algorithm so existing shared links resolve if the hash→room store still contains the entry **or** if the client/server can recompute when given an unhashed room.

**Gap:** hashes without a store entry cannot recover the room (one-way). Offline clients that never saw the room cannot open `@hash…` links. Mitigations:

1. Prefer sharing URLs that include a compact room representation when feasible.
2. Retain server hash lookup for legacy links.
3. Optional: content-addressed room packs in share payloads (large).

---

## 5. Search result stability

Upstream `empty` / `chars` / `words` modes are **non-deterministic**. Compatibility here means:

- Same *algorithm family* available.
- Not bit-identical coordinates across runs.

For product features needing stable coordinates (“Today's Page”, “Your Birthday”), define deterministic builders **in addition to** classic modes — not as silent replacements.

---

## 6. Movement model (new; must stay on-lattice)

Movement is new UX but must transform real coordinates.

Proposed mapping (adjust in Phase 5 if UX testing demands; document any change):

| Input | Transform |
| --- | --- |
| **U** / W | `shelf → shelf+1` (clamp or carry into wall) |
| **D** / S | `shelf → shelf−1` |
| **L** / A | `wall → wall−1` (wrap 1↔4 or step room) |
| **R** / D | `wall → wall+1` |
| **F** / E | `book → book+1` with carry to shelf/wall/room |
| **B** / Q | `book → book−1` with borrow |

**Page** changes via separate reader controls (prev/next page), matching upstream sequential page walk when crossing book boundaries.

All moves must update `seq` consistently with §2 of `MATHEMATICS.md` — never jump to an unrelated random book.

Exact wrap/carry rules will be locked with tests in Phase 5 so deep links remain reproducible.

---

## 7. BigInt vs gmp-wasm compatibility

Replacing GMP with native `BigInt` is **compatible** if and only if:

```text
∀ identifier, BigInt.generate(id) === GMP.generate(id)
∀ bookText, BigInt.lookup(bookText) === GMP.lookup(bookText)
```

Phase 2 must prove this with fixtures before deleting the GMP path. Until then, keep GMP as the reference oracle in tests.

---

## 8. Database compatibility

Upstream S3 objects: key = `@sha256…` or `_bookmark_count`, body = room string.

Migration options:

1. Import S3 keys into Neon `room_bookmarks(hash PK, room TEXT)`.
2. Start empty (legacy public hashes 404 until rediscovered) — document clearly.
3. Dual-read S3 + Neon during transition.

Personal “My Library” data is **new** and client-only — no upstream equivalent beyond `.babel` files (optional importer).

---

## 9. Decision log (algorithm changes)

| Date | Decision | Compatible? | Notes |
| --- | --- | --- | --- |
| 2026-10-06 | Prefer native `BigInt` core with GMP oracle tests | Yes, if parity holds | Portability / offline |
| 2026-10-06 | Reject silent switch to page-level library | N/A | Would break identity |
| 2026-10-06 | Keep existing `numbers` file | Yes | Do not regenerate |
| TBD | Digit-window page extraction | Yes if proven | Perf only |
| TBD | Deployment platform | N/A | See `DEPLOYMENT.md` |

If a future change cannot preserve mapping, ship:

1. Warning in UI / About.
2. `COMPATIBILITY.md` update with before/after fixture diffs.
3. Optional `babel-v3` mode still loading old constants.
