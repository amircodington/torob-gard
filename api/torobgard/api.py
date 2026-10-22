from ninja import NinjaAPI

from catalog.api import router as catalog_router

api = NinjaAPI(title="ترب‌گرد API")
api.add_router("", catalog_router)


@api.get("/health")
def health(request) -> dict:
    return {"ok": True}
