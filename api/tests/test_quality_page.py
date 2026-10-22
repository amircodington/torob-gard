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


def test_staff_sees_charts_with_data(staff):
    from conversation.models import Message, Session
    s = Session.objects.create(model="m")
    for seq, v, ms in [(1, [1], 900), (2, [], 300)]:
        Message.objects.create(session=s, seq=seq, role="assistant",
                               content={"violations": v}, latency_ms=ms)
    assert "<svg" in staff.get("/admin/quality/").content.decode()


@pytest.mark.django_db
def test_verification_stamps_the_shop():
    shop = Shop.objects.create(id="s1", name="a", name_norm="a", address_raw="x",
                               geom=Point(51.4, 35.7))
    Verification.objects.create(shop=shop, exists=True)
    shop.refresh_from_db()
    assert shop.verified_at
