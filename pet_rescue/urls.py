from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root(request):
    """Root API endpoint - returns API information"""
    return JsonResponse({
        'message': 'Pet Rescue API',
        'version': '1.0',
        'endpoints': {
            'authentication': '/api/login/, /api/register/, /api/token/',
            'user_details': '/api/user-details/',
            'pet_request': '/api/pet/pet-request-form/',
            'admin_notifications': '/api/admin/notifications/',
            'pet_details': '/api/pet/details/<id>/',
            'admin_panel': '/admin/'
        }
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/', include('feedback.urls')),
    path('api/', include('api.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
