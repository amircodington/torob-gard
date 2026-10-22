import pytest
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point

from catalog.models import Shop
from quality.models import Verification


@pytest.fixture
def staff(client, db):
    client.force_login(get_user_model().objects.create_user("s", password="x", is_staff=True))
    return client


def test_anonymous_is_redirected(client, db):
    assert client.get("/admin/quality/").status_code == 302


def test_staff_sees_the_empty_state(staff):
    r = staff.get("/admin/quality/")
    assert r.status_code == 200 and "هنوز داده‌ای نیست" in r.content.decode()


def test_staff_sees_live_numbers_not_eval_sessions(staff):
    from conversation.models import Message, Session
    live, live2 = Session.objects.create(model="m"), Session.objects.create(model="m")
    ev = Session.objects.create(model="m", context={"eval": True})
    fell_back = {"violations": [1], "say": "نتونستم تأیید کنم…"}
    rows = [(live, 1, fell_back, 900, "0.0200"),
            # next: the retry fixed it, so not a failure
            (live2, 1, {"violations": [1], "say": "ok"}, 300, "0.0100"),
            (ev, 1, {"violations": [], "say": "x"}, 77777, "9.0000")]
    for s_, seq, content, ms, cost in rows:
        Message.objects.create(session=s_, seq=seq, role="assistant", content=content,
                               latency_ms=ms, cost=cost)
    html = staff.get("/admin/quality/").content.decode()
    assert ": 0.0300<" in html  # daily live cost
    assert ": 870<" in html  # p95 of 300 and 900
    assert ": 50.0<" in html  # 1 of 2 live turns ended in the fallback
    assert "77777" not in html and "9.0000" not in html  # eval sessions stay out
    assert ": 0.0150<" in html  # mean cost per session


@pytest.mark.django_db
def test_verification_stamps_the_shop():
    shop = Shop.objects.create(id="s1", name="a", name_norm="a", address_raw="x",
                               geom=Point(51.4, 35.7))
    Verification.objects.create(shop=shop, exists=True)
    shop.refresh_from_db()
    assert shop.verified_at
