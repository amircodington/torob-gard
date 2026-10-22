from django.contrib import admin
from django.urls import path

from quality.views import quality_page

from .api import api

urlpatterns = [
    path("admin/quality/", admin.site.admin_view(quality_page), name="quality"),
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]
