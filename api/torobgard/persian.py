import re

_FA, _AR, _EN = "۰۱۲۳۴۵۶۷۸۹", "٠١٢٣٤٥٦٧٨٩", "0123456789"
_TO_ASCII = str.maketrans(_FA + _AR, _EN + _EN)
_TO_FA = str.maketrans(_EN, _FA)
_LETTERS = str.maketrans("يكةى", "یکهی")
_NORM = {**_TO_ASCII, **_LETTERS}
_WS = re.compile(r"\s+")  # \s keeps ZWNJ (U+200C) untouched


def to_ascii_digits(text: str) -> str:
    return text.translate(_TO_ASCII)


def to_fa_digits(text: str) -> str:
    return text.translate(_TO_FA)


def normalize(text: str | None) -> str:
    if not text:
        return ""
    return _WS.sub(" ", text.translate(_NORM)).strip()
