/**
 * One-time conversion: `numbers` (base-32) → `numbers.hex.json` (0x… BigInt literals).
 * Hex loads in milliseconds via native BigInt; base-32 parse takes ~90s/line.
 *
 * Run: node scripts/convert-numbers-to-hex.mjs
 */
import fs from "fs";

function parseBase32(digits) {
  const CHUNK = 6;
  const factor = 32n ** BigInt(CHUNK);
  let value = 0n;
  let i = 0;
  const firstLen = digits.length % CHUNK;
  if (firstLen > 0) {
    value = BigInt(parseInt(digits.slice(0, firstLen), 32));
    i = firstLen;
  }
  while (i < digits.length) {
    value = value * factor + BigInt(parseInt(digits.slice(i, i + CHUNK), 32));
    i += CHUNK;
  }
  return value;
}

const raw = fs.readFileSync("./numbers", "utf8");
const [nStr, cStr, iStr] = raw.replace(/\r\n/g, "\n").split("\n");
console.log("parsing N/C/I from base-32 (slow, once)…");
const t0 = Date.now();
const N = parseBase32(nStr.trim());
const C = parseBase32(cStr.trim());
const I = parseBase32(iStr.trim());
console.log("parsed in", Date.now() - t0, "ms");

if ((C * I) % N !== 1n) {
  throw new Error("C·I mod N !== 1 — refusing to write hex file");
}

const out = {
  format: "babel-v3-hex",
  N: "0x" + N.toString(16),
  C: "0x" + C.toString(16),
  I: "0x" + I.toString(16),
};

fs.writeFileSync("./numbers.hex.json", JSON.stringify(out));
console.log("wrote numbers.hex.json bytes", fs.statSync("./numbers.hex.json").size);
