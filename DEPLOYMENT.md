# Deployment

**Phase 1 — deployment assessment (no production choice locked yet)**

---

## 1. Current deployment shape

Upstream runs as a long-lived **Node** process:

- Docker image based on `node:18-buster`
- Listens on `PORT` (default 3000)
- Loads `numbers` from disk at startup (`fs.readFileSync`)
- Initializes `gmp-wasm` once
- Optionally talks to **AWS S3** for room bookmarks (`AWS_REGION`, `BUCKET_NAME`)
- `docker-compose.yml` still mentions a `leveldb` volume (legacy; store code is S3)

This maps cleanly to **Koyeb** (or any container host). It does **not** yet map cleanly to **Cloudflare Workers** without a rewrite of FS, process lifetime, and possibly GMP usage.

---

## 2. Requirements the new app must satisfy

| Requirement | Implication |
| --- | --- |
| Generate pages without storing books | CPU-heavy bigint on request or in client |
| Offline PWA after engine download | Client-side math mandatory |
| Optional Postgres (Neon) | Server features degrade if DB down |
| Turnstile + rate limits | Edge-friendly |
| Portable core | `core/` free of platform APIs |
| Admin | Protected server routes |

---

## 3. Option A — Koyeb (Docker / Node)

### Shape

```text
Browser (PWA + Worker)
  ↔ Node/Hono API on Koyeb
      ↔ Neon Postgres
      ↔ (optional) object storage
```

### Pros

- Familiar to upstream (Docker already exists).
- Generous CPU time for full-book mulmod / PDF.
- Easy to keep `gmp-wasm` if benchmarks favor it.
- Simple long-lived in-memory caches for `N`/`C`/`I`.

### Cons

- Cold starts / single-region unless scaled.
- Not “edge” by default.
- Must still ship client engine for offline (server alone insufficient).

### Fit score (preliminary)

**Strong** for heavy server generation and operational simplicity.

---

## 4. Option B — Cloudflare Workers (+ Neon + Turnstile)

### Shape

```text
Browser (PWA + Worker)  ← primary generation path
  ↔ CF Worker API (search abuse controls, hash lookup, admin, metrics)
      ↔ Neon (via HTTP driver)
      ↔ Turnstile verify
```

### Pros

- Turnstile and rate limiting are natural.
- Global edge for static + light API.
- Aligns with “prefer Cloudflare if clean.”
- Encourages client/offline-first math (good for product goals).

### Cons / risks

1. **CPU time limits** on Workers may be too tight for book-scale `BigInt` mulmod + base-32 encoding. Must benchmark real page generate/lookup latency on Workers.
2. **No `fs`** — bundle `numbers` (or compressed constants) into the Worker / client.
3. **`gmp-wasm`**: theoretically runnable as Wasm, but large cold start; no SharedArrayBuffer/threads; prefer native `BigInt` on CF.
4. **No Web Workers API inside CF Workers** — server parallelism limited; push heavy work to the browser.
5. PDF full-book generation may need a separate Node service or client-only path.

### Fit score (preliminary)

**Preferred if** page generate/lookup stays within Worker limits **or** the Worker only does auth/DB/hash while browsers do math.  
**Reject or hybridize if** server-side book math is still required and exceeds CPU budgets.

---

## 5. Decision criteria (Phase 10 bake-off)

Measure on both platforms (same fixtures):

| Metric | Target (initial) |
| --- | --- |
| Page generate p50 / p95 | Record; UX budget ~≤ 5s client / ≤ 3s server if used |
| Inverse lookup (emptybook, short query) | Same |
| Cold start | Worker isolate vs container |
| Bundle size (math engine + constants) | Prefer < ~5–10 MB compressed for PWA cache |
| DB round-trip (hash lookup) | < 100 ms typical |
| Failure mode when DB down | Read/search still works locally |

**Prefer Cloudflare** when:

- Client-side BigInt engine meets UX budgets offline and online.
- Worker API stays thin (hashes, Turnstile, admin, metrics).
- No native GMP dependency required in production.

**Prefer Koyeb** when:

- Server must perform book-scale GMP/BigInt within request path.
- Worker CPU limits fail benchmarks.
- Operational need for long jobs (bulk PDF, admin exports).

**Hybrid (acceptable):** Cloudflare for edge/static/API + optional Koyeb worker for heavy jobs — only if complexity stays justified.

---

## 6. Neon vs Turso

| | Neon (Postgres) | Turso (libSQL) |
| --- | --- | --- |
| Fit | Spec default; rich SQL for admin/metrics | Edge-local replicas |
| Need | Room hashes, rate-limit rows, admin | Same, lighter |
| Decision | **Default Neon** unless latency or DX clearly favors Turso in Phase 10 |

Neither stores books. Schema sketch:

```sql
room_bookmarks (
  hash TEXT PRIMARY KEY,  -- '@' + sha256 hex
  room TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

rate_limit_events (...);
admin_metrics_daily (...);
```

Migrations via a small SQL migration runner. App boots without DB; bookmark persistence becomes best-effort.

---

## 7. Environment configuration (planned)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection (optional) |
| `ADMIN_AUTH_*` | Admin gate (exact mechanism TBD; not hardcoded) |
| `TURNSTILE_SECRET` | Server verify |
| `TURNSTILE_SITE_KEY` | Client widget |
| `RATE_LIMIT_*` | Thresholds |
| `LIBRARY_MODE` | `babel-v3` (default) |
| Legacy AWS S3 vars | Optional migration only |

---

## 8. Interim recommendation (audit-time)

**Do not lock the platform in Phase 1.**

Build order that keeps both options open:

1. Pure `core/` + `BigInt` + tests (no Node FS in core).
2. Browser Worker integration.
3. Thin HTTP API with injectable store.
4. Deploy the same API to Node (Koyeb) and Workers; measure.

Lean **architecturally** toward Cloudflare-friendly design (client-heavy math, thin edge API) because that also delivers the offline PWA requirement. Fall back to Koyeb for the API/host if measurements demand it.
