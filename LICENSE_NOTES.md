# License Notes

**Phase 1 — licensing for this derivative work**

---

## 1. Upstream license

The repository this project forks is:

- **Project:** [tdjsnelling/babel](https://github.com/tdjsnelling/babel)
- **Author:** Tom Snelling
- **License:** **GNU General Public License v3.0** (`LICENSE`, `package.json` `"license": "GPL-3.0"`)

Copyright notices appear in source (e.g. `src/babel.ts`: “Tom Snelling 2023-2024”) and UI footers linking to the author.

---

## 2. Nature of this project

Tony's Library / “The Library” is a **modified version** of that GPL-3.0 program: a derivative work.

Consequences:

1. The project **remains under GPL-3.0** (or GPL-3.0-or-later only if upstream explicitly allows and we choose that — upstream states GPL-3.0; **keep GPL-3.0** unless counsel says otherwise).
2. We **must not** relicense the combined work as MIT/Apache/proprietary.
3. We **must** preserve the `LICENSE` file and copyright notices.
4. We **must** mark modified versions as changed (GPL-3 §5).
5. Distributed binaries / hosted app must offer **Corresponding Source** under GPL-3 terms.
6. Original mathematical approach and substantial code from upstream remain attributed to Tom Snelling / the babel project — we do **not** present the bijection implementation as wholly original invention.

Original artwork, branding, and newly written UI for this fork can be authored here, but when combined into the GPL-covered work they are distributed under the same GPL terms unless cleanly separated (do not assume a dual-license split without a clear boundary and legal review).

---

## 3. Required notices (to add in Phase 2+)

### 3.1 Keep

- Root `LICENSE` (GPL-3.0 full text) — **do not delete or replace with MIT**.
- Upstream copyright lines in preserved/adapted files.
- README / About credit to Tom Snelling and the original repository.

### 3.2 Add

A short **modification notice**, e.g. in `README.md` and/or `NOTICE`:

```text
Tony's Library (working title: The Library)
Copyright (C) <year> <fork authors>

This program is a modified version of babel
https://github.com/tdjsnelling/babel
Copyright (C) Tom Snelling

This program is free software under the GNU General Public License v3.0.
See the LICENSE file for details.
```

Per GPL-3 §5, interactive UIs should also show an appropriate legal notice (About page is a good place).

### 3.3 `package.json`

Keep `"license": "GPL-3.0"`. Update `repository` / `author` fields to reflect the fork without erasing upstream credit in documentation.

---

## 4. Third-party components (audit snapshot)

| Component | Role | License awareness |
| --- | --- | --- |
| `gmp-wasm` | GMP/MPFR Wasm | LGPL/GPL family concerns for GMP — if kept, verify bundling obligations; prefer documenting; native `BigInt` avoids shipping GMP |
| Koa, Pug, AWS SDK, etc. | Current server | Various permissive licenses — fine as dependencies of a GPL app |
| `popular-english-words` | Search filler | Check license before retaining |
| Public-domain / CC0 artwork | UI | Prefer clearly licensed assets; document provenance |

**Uncertainty:** Exact license interaction of embedding `gmp-wasm`/GMP in a browser PWA cache should be re-checked before shipping WASM in production. If unclear, **stop and document** — default mitigation is **native `BigInt` only** so GMP is not distributed in the client.

---

## 5. What we will not do

- Change the project license to MIT or similar.
- Remove `LICENSE` or upstream attribution.
- Claim the Library mathematical scheme as solely original to this fork.
- Strip Tom Snelling copyright headers from files that retain their code.
- Invent license text for assets of unknown provenance.

---

## 6. Open questions (do not guess)

1. Whether any **additional** copyright holders contributed to upstream beyond the stated author.
2. Provenance/license of existing image assets under `src/public/image/` (Mucha-style / woodcut assets) — verify before reuse in the redesign; replace with clearly licensed or original art if unclear.
3. If a future pure rewrite of the math from a clean-room description were ever claimed — still recommend keeping GPL + attribution because this fork started from and was informed by the GPL codebase; clean-room is not the current plan.

If any of the above blocks a release decision, pause and record the issue here rather than guessing.
