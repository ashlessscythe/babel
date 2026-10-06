import fs from "fs";
import { loadNumbersFromHexJson } from "../src/core/mathematics/numbers.ts";
import { contentValueFromBookText, parseBase32 } from "../src/core/mathematics/base32.ts";
import { ALPHA } from "../src/core/constants.ts";

loadNumbersFromHexJson(fs.readFileSync("./numbers.hex.json", "utf8"));

const CHAR_DIGIT = {};
for (let i = 0; i < ALPHA.length; i++) CHAR_DIGIT[ALPHA[i]] = i;

const book = "tony" + " ".repeat(1312000 - 4);

console.time("digits join");
const digits = new Array(book.length);
for (let i = 0; i < book.length; i++) digits[i] = CHAR_DIGIT[book[i]].toString(32);
const digitStr = digits.join("");
console.timeEnd("digits join");

console.time("parseBase32");
const v = parseBase32(digitStr);
console.timeEnd("parseBase32");
console.log("digits", v.toString(32).length);

console.time("contentValueFromBookText");
contentValueFromBookText(book, (c) => CHAR_DIGIT[c]);
console.timeEnd("contentValueFromBookText");
