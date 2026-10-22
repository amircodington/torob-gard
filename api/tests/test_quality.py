import pytest
from django.db import IntegrityError

from catalog.models import Venue
from quality.models import Verification


@pytest.mark.django_db
def test_verification_checks_a_shop_or_a_venue_never_both_or_neither():
    v = Venue.objects.create(name="Aladdin", name_norm="aladdin", kind="pasazh")
    Verification.objects.create(venue=v, exists=True)
    with pytest.raises(IntegrityError):
        Verification.objects.create(exists=True)
