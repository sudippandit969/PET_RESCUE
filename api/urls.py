from .views import UserProfileUpdateView
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_my_adoption_requests import get_my_adoption_requests, cancel_adoption_request
from .views import (
    # Core API Views (Classes)
    PetCreateView, PetListView, PetDetailView, UserRegistrationView, UserLoginView, UserDashboardAPIView,
    
    # Pet Management APIs (Functions)
    report_lost_pet, request_adoption, report_found_pet, submit_rescue_report,
    
    # Admin APIs (Functions)
    admin_approve_adoption, admin_reject_adoption, admin_approve_report, admin_reject_report, 
    admin_mark_available_for_adoption, filter_adoption_requests, admin_dashboard_stats, 
    admin_user_management, admin_pet_management, admin_bulk_approve_reports, admin_bulk_reject_reports, 
    admin_bulk_approve_adoptions, admin_bulk_reject_adoptions, toggle_user_status, admin_get_pending_reports,
    admin_get_all_pets_by_status, admin_get_all_reports_by_status, admin_get_dashboard_stats, 
    admin_get_pending_adoption_posts, admin_get_all_adoption_posts, admin_search_pets,
    
    # Search and Filter APIs (Functions)
    search_pets, search_lost_pets, enhanced_search_pets,
    
    # Reunification APIs (Functions)
    reunification_system, mark_pets_reunited,
    
    # User Profile APIs (Functions) - removed mark_report_resolved as it doesn't exist
    user_profile, update_profile, api_update_profile, adoption_history, pet_reports_history,
    
    # Notification APIs (Functions)
    get_user_notifications, mark_notification_read, mark_all_notifications_read, 
    get_unread_notifications_count, delete_notification,
    
    # Enhanced APIs (Functions)
    request_adoption_enhanced, api_search_pets, api_user_notifications, api_mark_notification_read, 
    unified_pet_request, api_user_adoptions, api_user_reports,
    
    # Mentor's Required APIs (Functions)
    user_details_by_token, pet_request_form_api, admin_notifications_api, pet_details_by_id,
    
    # Admin Dashboard Metrics View
    AdminDashboardMetricsView,
    
    # Forgot Password API
    forgot_password,
    
    # User Stories API
    UserStoryView,
    
    # Favourite Pets API
    FavouritePetView,
    
    # Enhanced Functionality APIs (Functions)
    mark_all_notifications_read_api, delete_notification_api, delete_report_api, 
    update_report_status_api, api_all_lost_reports, api_available_adoption_pets,
    api_post_pet_for_adoption, api_my_adoption_posts, api_pending_adoption_posts,
    api_review_adoption_post,
    
    # Superuser Test API
    test_superuser_access,
    
    # User Management API
    get_user_by_id
)

# Import ViewSets
from .views import UserViewSet, PetViewSet, PetMedicalHistoryViewSet, PetAdoptionViewSet, NotificationViewSet, PetReportViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Create router for ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'pets', PetViewSet)
router.register(r'medical-history', PetMedicalHistoryViewSet)
router.register(r'adoptions', PetAdoptionViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'reports', PetReportViewSet)

urlpatterns = [
    
    # =================== API ENDPOINTS ONLY ===================
    # Authentication endpoints (JSON responses)
    path('login/', UserLoginView.as_view(), name='api_login'),
    path('register/', UserRegistrationView.as_view(), name='api_register'),
    path('dashboard/', UserDashboardAPIView.as_view(), name='api_dashboard'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # User actions
    path('report_lost_pet/', report_lost_pet, name='report_lost_pet'),
    path('report_found_pet/', report_found_pet, name='report_found_pet'),
    path('submit_rescue_report/', submit_rescue_report, name='submit_rescue_report'),
    path('request_adoption/', request_adoption, name='request_adoption'),
    path('request_adoption_enhanced/', request_adoption_enhanced, name='request_adoption_enhanced'),
    path('user-profile/update/', UserProfileUpdateView.as_view(), name='user_profile_update'),
    path('pets/all/', PetViewSet.as_view({'get': 'list'}), name='admin_pets_list'),
    path('pets/<int:pk>/', PetViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'}), name='pet_update_delete'),
    # path('user-profile/deactivate/', UserProfileDeactivateView.as_view(), name='user_profile_deactivate'),
    
    # Admin actions
    path('admin/approve_adoption/<int:adoption_id>/', admin_approve_adoption, name='admin_approve_adoption'),
    path('admin/reject_adoption/<int:adoption_id>/', admin_reject_adoption, name='admin_reject_adoption'),
    path('admin/approve_report/<int:report_id>/', admin_approve_report, name='admin_approve_report'),
    path('admin/reject_report/<int:report_id>/', admin_reject_report, name='admin_reject_report'),
    path('admin/pending_reports/', admin_get_pending_reports, name='admin_get_pending_reports'),
    path('admin/mark_available_for_adoption/<int:report_id>/', admin_mark_available_for_adoption, name='admin_mark_available_for_adoption'),
    path('admin/filter_adoptions/', filter_adoption_requests, name='filter_adoption_requests'),
    
    # New comprehensive admin endpoints
    path('admin/dashboard_stats/', admin_get_dashboard_stats, name='admin_get_dashboard_stats'),
    path('admin/pets_by_status/', admin_get_all_pets_by_status, name='admin_get_all_pets_by_status'),
    path('admin/reports_by_status/', admin_get_all_reports_by_status, name='admin_get_all_reports_by_status'),
    path('admin/pending_adoption_posts/', admin_get_pending_adoption_posts, name='admin_get_pending_adoption_posts'),
    path('admin/all_adoption_posts/', admin_get_all_adoption_posts, name='admin_get_all_adoption_posts'),
    path('admin/search_pets/', admin_search_pets, name='admin_search_pets'),
    
    # New Admin functionalities
    path('admin/stats/', admin_dashboard_stats, name='admin_dashboard_stats'),
    path('admin/users/', admin_user_management, name='admin_user_management'),
    path('admin/pets/', admin_pet_management, name='admin_pet_management'),
    path('admin/bulk_approve_reports/', admin_bulk_approve_reports, name='admin_bulk_approve_reports'),
    path('admin/bulk_reject_reports/', admin_bulk_reject_reports, name='admin_bulk_reject_reports'),
    path('admin/bulk_approve_adoptions/', admin_bulk_approve_adoptions, name='admin_bulk_approve_adoptions'),
    path('admin/bulk_reject_adoptions/', admin_bulk_reject_adoptions, name='admin_bulk_reject_adoptions'),
    path('admin/toggle_user/<int:user_id>/', toggle_user_status, name='toggle_user_status'),
    
    # Search and Filter
    path('search/', search_pets, name='search_pets'),
    path('search_lost/', search_lost_pets, name='search_lost_pets'),
    path('enhanced_search/', enhanced_search_pets, name='enhanced_search_pets'),
    
    # Reunification System
    path('reunification/', reunification_system, name='reunification_system'),
    path('reunification/mark_reunited/', mark_pets_reunited, name='mark_pets_reunited'),
    
    # User Profile Management
    path('profile/', user_profile, name='user_profile'),
    path('profile/update/', api_update_profile, name='api_update_profile'),  # JWT-based API
    path('profile/update/old/', update_profile, name='update_profile'),  # Session-based (old)
    path('adoption_history/', adoption_history, name='adoption_history'),
    path('reports_history/', pet_reports_history, name='pet_reports_history'),
    path('cancel_adoption/<int:adoption_id>/', cancel_adoption_request, name='cancel_adoption_request'),
    
    # Notifications
    path('notifications/', get_user_notifications, name='get_user_notifications'),
    # Removed duplicate: path('notification/read/<int:notification_id>/', mark_notification_read, name='mark_notification_read'),
    path('notifications/mark_all_read/', mark_all_notifications_read_api, name='mark_all_notifications_read_api'),  # JWT-based API
    path('notifications/count/', get_unread_notifications_count, name='get_unread_notifications_count'),
    path('notification/delete/<int:notification_id>/', delete_notification, name='delete_notification'),
    
    # API endpoints for mobile/frontend
    path('search_pets/', api_search_pets, name='api_search_pets'),
    path('user_notifications/', api_user_notifications, name='api_user_notifications'),
    path('user_adoptions/', api_user_adoptions, name='api_user_adoptions'),
    path('user_reports/', api_user_reports, name='api_user_reports'),
    path('notification/read/<int:notification_id>/', api_mark_notification_read, name='api_mark_notification_read'),  # JWT-based, works with Bearer token
    
    # Unified pet request endpoint
    path('pet/pet-request/', unified_pet_request, name='unified_pet_request'),
    
    # =================== MENTOR'S REQUIRED APIs ===================
    # API 2: Get user details by token
    path('user-details/', user_details_by_token, name='user_details_by_token'),
    
    # API 3: Enhanced pet request form with full database integration
    path('pet/pet-request-form/', pet_request_form_api, name='pet_request_form_api'),
    
    # API 4: Admin notifications
    path('admin/notifications/', admin_notifications_api, name='admin_notifications_api'),
    
    # API 5: Pet details by ID
    path('pet/details/<int:pet_id>/', pet_details_by_id, name='pet_details_by_id'),
    
    # Enhanced API endpoints for notifications and reports management
    path('notifications/mark-all-read/', mark_all_notifications_read_api, name='mark_all_notifications_read_api'),
    path('notifications/<int:notification_id>/', delete_notification_api, name='delete_notification_api'),
    path('reports/<int:report_id>/', delete_report_api, name='delete_report_api'),
    path('reports/<int:report_id>/status/', update_report_status_api, name='update_report_status_api'),
    path('all_lost_reports/', api_all_lost_reports, name='api_all_lost_reports'),
    path('available_adoption_pets/', api_available_adoption_pets, name='api_available_adoption_pets'),
    
    # Post pet for adoption endpoints
    path('post_pet_for_adoption/', api_post_pet_for_adoption, name='api_post_pet_for_adoption'),
    path('my_adoption_posts/', api_my_adoption_posts, name='api_my_adoption_posts'),
    path('my_adoption_requests/', get_my_adoption_requests, name='get_my_adoption_requests'),
    path('adoption_request/<int:request_id>/', cancel_adoption_request, name='cancel_adoption_request'),
    path('pending_adoption_posts/', api_pending_adoption_posts, name='api_pending_adoption_posts'),
    path('review_adoption_post/<int:report_id>/', api_review_adoption_post, name='api_review_adoption_post'),
    
    # Superuser access test endpoint
    path('test/superuser/', test_superuser_access, name='test_superuser_access'),
    
    # User management endpoints
    path('user/<int:user_id>/', get_user_by_id, name='get_user_by_id'),
    path('admin/dashboard/', AdminDashboardMetricsView.as_view(), name='admin_dashboard_metrics'),
    path('forgot-password/', forgot_password, name='forgot_password'),
    path('user-stories/', UserStoryView.as_view(), name='user_stories'),
    path('pets/favourites/', FavouritePetView.as_view(), name='favourite_pets'),
]

# Include router URLs for ViewSets
urlpatterns += [
    path('', include(router.urls)),  # Changed from 'api/' to '' to avoid double /api/
]
