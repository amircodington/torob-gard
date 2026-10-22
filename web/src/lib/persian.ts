// Mirrors api/torobgard/persian.py; both run shared/persian-cases.json.
const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";
const LETTERS: Record<string, string> = { ي: "ی", ك: "ک", ة: "ه", ى: "ی" };
// Python's str.isspace() set (JS \s differs: it adds U+FEFF, misses U+001C–001F and U+0085); ZWNJ stays.
const WS = /[\t\n\v\f\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g;

export function toAsciiDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (d) => String(FA.includes(d) ? FA.indexOf(d) : AR.indexOf(d)));
}

export function toFaDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => FA[Number(d)]);
}

export function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return toAsciiDigits(text).replace(/[يكةى]/g, (c) => LETTERS[c]).replace(WS, " ").trim();
}
