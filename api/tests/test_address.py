# ruff: noqa: E501 -- Persian address rows read better unwrapped
import pytest

from ingest.address import parse_address


@pytest.mark.parametrize("raw,venue,floor,unit", [
  ("خیابان جمهوری، نبش شیخ هادی، پاساژ علالدین 2، طبقه 6، واحد 622", "پاساژ علالدین 2", "6", "622"),
  ("خیابان جمهوری، نرسیده به پل حافظ، نبش کوچه کلانتری، پاساژ خانه موبایل، طبقه چهارم، پلاک 412", "پاساژ خانه موبایل", "4", "412"),
  ("لاله زار، پاساژ چارسو، همکف، واحد ۱۲", "پاساژ چارسو", "0", "12"),
  ("پاساژ بوشهری ط ۳ واحد 305", "پاساژ بوشهری", "3", "305"),
  ("پاساژ امجد، زیرهمکف، پلاک 8", "پاساژ امجد", "-1", "8"),
  ("خیابان فردوسی، کوچه بانک", None, None, None),
])
def test_parse(raw, venue, floor, unit):
    p = parse_address(raw)
    assert (p.venue_name, p.floor, p.unit) == (venue, floor, unit)


def test_confidence_drops_without_venue():
    assert parse_address("خیابان فردوسی، کوچه بانک").confidence < 0.5


@pytest.mark.parametrize("raw,venue,floor,unit", [
    # both پلاک and واحد: the واحد wins
    ("پاساژ علائدین، طبقه همکف، پلاک ۷۵، واحد ۷۶", "پاساژ علائدین", "0", "76"),
    ("خیابان فردوسی، پاساژ تجارت جهانی، طبقه منفی۲، واحد ۲۱", "پاساژ تجارت جهانی", "-2", "21"),
    ("پاساژ یگانه، طبقه منفی یک، واحد ۱۱", "پاساژ یگانه", "-1", "11"),
    ("پاساژ امجد، طبقه -۱، پلاک ۵", "پاساژ امجد", "-1", "5"),
    ("خیابان خارک، پلاک ۱۶، طبقه ۱-، واحد لوازم خوشنویسی", None, "-1", "16"),
    ("پاساژ چلچراغ، طبقه زیر همکف، واحد ۲۲", "پاساژ چلچراغ", "-1", "22"),
    ("مجتمع تجاری لاله زار، زیرزمین، پلاک B۶", "مجتمع تجاری لاله زار", "-1", "B6"),
    ("مجتمع الدین۳، طبقه دوم، پلاک۸۶", "مجتمع الدین3", "2", "86"),
    ("سرای امین، نیم‌طبقه، واحد ۴", "سرای امین", "M", "4"),
    ("تیمچه حاجب الدوله، نیم طبقه، پلاک ۹", "تیمچه حاجب الدوله", "M", "9"),
    ("خیابان جمهوری، بازار موبایل علائدین، طبقه همکف، پلاک ۴۳/۴۴", "بازار موبایل علائدین", "0", "43"),
    ("جمهوری اسلامی، تقاطع حافظ پاساژ چارسو، پلاک A۴۱، طبقه زیرهمکف، واحد ۴۱", "پاساژ چارسو", "-1", "41"),
    # next to a venue is not in it
    ("خیابان لاله زار، جنب پاساژ سبحان، پلاک ۱۰", None, None, "10"),
    ("خیابان حافظ، روبروی پاساژ امجد، پلاک ۳", None, None, "3"),
    # «بازار» alone is a place, not a venue name
    ("خیابان جمهوری، بازار، پلاک ۷", None, None, "7"),
])
def test_parse_real_patterns(raw, venue, floor, unit):
    p = parse_address(raw)
    assert (p.venue_name, p.floor, p.unit) == (venue, floor, unit)


@pytest.mark.parametrize("raw,hint", [
    ("خیابان جمهوری، نرسیده به پل حافظ، نبش کوچه کلانتری، پاساژ خانه موبایل", "نرسیده به پل حافظ"),
    ("خیابان لاله زار، جنب پاساژ سبحان، پلاک ۱۰", "جنب پاساژ سبحان"),
    ("خیابان فردوسی، کوچه بانک", "کوچه بانک"),
    ("پاساژ امجد، طبقه ۲، پلاک ۸", None),
])
def test_hint(raw, hint):
    assert parse_address(raw).hint == hint


def test_empty_and_confidence():
    assert parse_address(None) == parse_address("") == parse_address("  ")
    assert parse_address(None).confidence == 0.0
    assert parse_address("پاساژ امجد، طبقه ۲، پلاک ۸").confidence == pytest.approx(1.0)


@pytest.mark.parametrize("raw,floor,unit", [
    ("پاساژ عباسیان، طبقه هم کف، پلاک 19", "0", "19"),
    ("پاساژ درفشان‌، طبقه منفی‌ یک، پلاک یک", "-1", None),
    ("بازار موبایل ایران، طبقه زیرین، واحد 132", "-1", "132"),
    ("مجتمع تجاری لاله زار، طبقه ی سوم، پلاک ۱۰", "3", "10"),
    ("مجتمع تجاری جهانی فردوسی، پلاک 479، طبقه‌ی اول، واحد 124", "1", "124"),
    ("پاساژ بوشهری، طبقه زیر زمین، پلاک ۹۳", "-1", "93"),
    ("پاساژ‌سعدی‌قدیم، پلاک ۲۹۳، طبقه‌دوم‌", "2", "293"),
    ("خیابان سی تیر، پلاک : 194، طبقه : 2، واحد: 7 شرقی", "2", "7"),
    ("پاساژ امجد، طبقه یکم، پلاک ۸", "1", "8"),
])
def test_spelling_variants(raw, floor, unit):
    p = parse_address(raw)
    assert (p.floor, p.unit) == (floor, unit)


@pytest.mark.parametrize("raw,hint", [
    ("خیابان جمهوری، روبه‌روی پاساژ امجد، پلاک ۳", "روبه‌روی پاساژ امجد"),
    ("خیابان جمهوری، روبه روی پاساژ امجد، پلاک ۳", "روبه روی پاساژ امجد"),
    ("خیابان جمهوری، بین پاساژ X و Y، پلاک ۴", "بین پاساژ X و Y"),
])
def test_nearby_venue_is_a_hint(raw, hint):
    p = parse_address(raw)
    assert (p.venue_name, p.hint) == (None, hint)


def test_floor_typo_is_dropped():
    p = parse_address("پاساژ X، طبقه ۱۱۱، واحد ۵")
    assert (p.floor, p.unit, p.confidence) == (None, "5", 0.7)
