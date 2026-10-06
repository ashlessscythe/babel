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

const t0 = Date.now();
const raw = fs.readFileSync("./numbers", "utf8");
console.log("read ms", Date.now() - t0, "bytes", raw.length);

const lines = raw.replace(/\r\n/g, "\n").split("\n");
console.log("line lengths", lines[0].length, lines[1].length, lines[2].length);

const t1 = Date.now();
const N = parseBase32(lines[0].trim());
console.log("parse N ms", Date.now() - t1);

const t2 = Date.now();
const C = parseBase32(lines[1].trim());
console.log("parse C ms", Date.now() - t2);

const t3 = Date.now();
const I = parseBase32(lines[2].trim());
console.log("parse I ms", Date.now() - t3);

const t4 = Date.now();
const ok = (C * I) % N === 1n;
console.log("C*I % N == 1?", ok, "mul ms", Date.now() - t4);

const t5 = Date.now();
const seq = 1n;
const content = (C * seq) % N;
console.log("mulmod ms", Date.now() - t5);

const t6 = Date.now();
const s = content.toString(32);
console.log("toString32 ms", Date.now() - t6, "len", s.length);
