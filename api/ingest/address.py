import re
from dataclasses import dataclass

from torobgard.persian import normalize

# ponytail: regex only; LLM fallback for confidence < 0.6 is P2 if T-02 precision < 85%.

_STOP = r"(?=\s+(?:طبقه|ط|پلاک|واحد|همکف|زیر ?همکف|زیرزمین|نیم.?طبقه)(?:\s|\d|$)|\s*$)"
# ponytail: «بازار» needs a following name (the regex requires one); no fuzzy spelling beyond پاساز.
_VENUE = re.compile(r"(?:پاساژ|پاساز|مجتمع|ساختمان|سرای|تیمچه|بازار)\s+.+?" + _STOP)
_RR = r"رو[\s\u200c]*به?[\s\u200c]*رو"  # روبرو، رو به رو، روبه‌رو
_NEAR = re.compile(r"نبش|" + _RR + r"|جنب|نرسیده|کنار|پشت|بعد از|قبل از|\bبین\b")
_HINT = re.compile(r"\b(?:نبش|" + _RR + r"ی|جنب|نرسیده به|بین|کوچه|پل)\b")
_ORD = {"اول": 1, "یکم": 1, "دوم": 2, "سوم": 3, "چهارم": 4, "پنجم": 5,
        "ششم": 6, "هفتم": 7, "هشتم": 8, "نهم": 9, "دهم": 10}
_NUM = {"یک": 1, "دو": 2, "سه": 3}
_T = r"طبقه\u200c?(?:\s*ی(?=[\s\u200c]))?[\s\u200c:]*"  # «طبقه»، «طبقه‌ی»، «طبقه ی»، «طبقه :»
_SEP = r"[\s\u200c:]*"
_FLOORS = [  # first match wins
    (re.compile(r"منفی[\s\u200c]*(\d+|یک|دو|سه)"), lambda m: f"-{_NUM.get(m[1], m[1])}"),
    (re.compile(r"زیر ?هم ?کف|زیر ?زمین|زیرین"), lambda m: "-1"),
    (re.compile(r"نیم.?طبقه"), lambda m: "M"),
    (re.compile(r"هم ?کف"), lambda m: "0"),
    (re.compile(r"(?:" + _T + r"|(?<!\S)ط\s*)(-)?(\d+)(-)?"),
     lambda m: ("-" if m[1] or m[3] else "") + str(int(m[2]))),
    (re.compile(_T + "(" + "|".join(_ORD) + r")(?![^\W\d_])"), lambda m: str(_ORD[m[1]])),
]
_UNIT = _SEP + r"([A-Za-z]*\d[A-Za-z0-9]*)"
_UNIT_RES = [re.compile("واحد" + _UNIT), re.compile("پلاک" + _UNIT)]  # واحد beats پلاک


@dataclass(frozen=True)
class ParsedAddress:
    venue_name: str | None
    floor: str | None
    unit: str | None
    hint: str | None
    confidence: float


def _venue(segments):
    for seg in segments:
        m = _VENUE.search(seg)
        if m and not _NEAR.search(seg[: m.start()]):
            return m[0].strip()
    return None


def _first(patterns, text):
    for rx, fn in patterns:
        if m := rx.search(text):
            return fn(m)
    return None


def parse_address(raw: str | None) -> ParsedAddress:
    text = normalize(raw)
    segments = [s.strip() for s in re.split(r"[،,]", text) if s.strip()]
    venue = _venue(segments)
    floor = _first(_FLOORS, text)
    if floor not in (None, "M") and not -5 <= int(floor) <= 20:
        floor = None  # ponytail: typo guard; Tehran pasazhs top out around 10 floors
    unit = _first([(rx, lambda m: m[1]) for rx in _UNIT_RES], text)
    hint = next((s for s in segments if _HINT.search(s)), None)
    conf = round(0.4 * bool(venue) + 0.3 * bool(floor) + 0.3 * bool(unit), 2)
    return ParsedAddress(venue, floor, unit, hint, conf)
