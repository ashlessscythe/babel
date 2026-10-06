/**
 * Heavy babel-v3 validation without Vitest (Vitest hangs on this workload on some Windows hosts).
 * Run: npx tsx scripts/run-heavy-math.ts
 */
import fs from "fs";
import path from "path";
import { BOOK_LENGTH } from "../src/core/constants";
import {
  assertInverseIdentity,
  generateContent,
  lookupContent,
} from "../src/core/generation/content";
import {
  loadNumbersFromHexJson,
  loadNumbersFromString,
} from "../src/core/mathematics/numbers";
import {
  buildEmptyBookContent,
  buildSpacePaddedBook,
} from "../src/core/search/build";

function load() {
  const hexPath = path.resolve("numbers.hex.json");
  const numbersPath = path.resolve("numbers");
  if (fs.existsSync(hexPath)) {
    console.log("loading numbers.hex.json…");
    loadNumbersFromHexJson(fs.readFileSync(hexPath, "utf8"));
    return;
  }
  console.log("loading numbers (slow)…");
  loadNumbersFromString(fs.readFileSync(numbersPath, "utf8"));
}

async function main() {
  const t0 = Date.now();
  load();
  console.log("loaded in", Date.now() - t0, "ms");

  assertInverseIdentity();
  console.log("✓ C·I ≡ 1 (mod N)");

  {
    const t = Date.now();
    const page = generateContent("1.1.1.1.1", false);
    if (page.content.length !== 3200) throw new Error("bad page length");
    if (page.page !== "1") throw new Error("bad page number");
    if (!page.nextIdentifier.endsWith(".2")) throw new Error("bad next");
    console.log("✓ generate 1.1.1.1.1 in", Date.now() - t, "ms");
  }

  {
    const t = Date.now();
    const { book, page } = buildSpacePaddedBook("tony", 1);
    const id = lookupContent(book, page);
    const again = lookupContent(book, page);
    if (id !== again) throw new Error("lookup unstable");
    const pageContent = generateContent(id, false);
    if (!pageContent.content.startsWith("tony")) {
      throw new Error("page does not start with tony");
    }
    console.log("✓ space-padded tony round-trip in", Date.now() - t, "ms");
    console.log("  identifier:", id.slice(0, 40) + (id.length > 40 ? "…" : ""));
  }

  {
    const t = Date.now();
    const text = "the moon hung over the empty warehouse";
    const book = buildEmptyBookContent(text);
    if (book.length !== BOOK_LENGTH) throw new Error("bad book length");
    const identifier = lookupContent(book, 1);
    const regenerated = generateContent(identifier, true);
    if (regenerated.content !== book) throw new Error("emptybook round-trip failed");
    console.log("✓ emptybook round-trip in", Date.now() - t, "ms");
  }

  console.log("all heavy checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
