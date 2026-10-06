import fs from "fs";

const t0 = Date.now();
const raw = fs.readFileSync("./numbers.hex.json", "utf8");
console.log("read ms", Date.now() - t0, "bytes", raw.length);

const t1 = Date.now();
const data = JSON.parse(raw);
console.log("json ms", Date.now() - t1);

const t2 = Date.now();
const N = BigInt(data.N);
const C = BigInt(data.C);
const I = BigInt(data.I);
console.log("bigint ms", Date.now() - t2);
console.log("ok", (C * I) % N === 1n);

const t3 = Date.now();
const page = generatePageDigits((C * 1n) % N, 0, 3200);
console.log("page extract ms", Date.now() - t3, page.length);

function generatePageDigits(contentValue, start, len) {
  // full tostring then slice — baseline
  const hash = contentValue.toString(32).padStart(1312000, "0");
  return hash.slice(start, start + len);
}
