from ninja import NinjaAPI

from catalog.api import router as catalog_router
from trips.api import router as trips_router

api = NinjaAPI(title="ترب‌گرد API")
api.add_router("", catalog_router)
api.add_router("", trips_router)


@api.get("/health")
def health(request) -> dict:
    return {"ok": True}
