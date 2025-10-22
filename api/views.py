from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

# ...existing code...

# Helper functions for data conversion
def str_to_bool(value):
	"""Convert string values to boolean"""
	if value is None:
		return False
	if isinstance(value, bool):
		return value
	if isinstance(value, str):
		return value.lower() in ('true', '1', 'yes')
	return bool(value)

def safe_int(value, default=0):
	"""Safely convert value to integer"""
	if value is None or value == '':
		return default
	try:
		return int(value)
	except (ValueError, TypeError):
		return default

def safe_float(value, default=0.0):
	"""Safely convert value to float"""
	if value is None or value == '':
		return default
	try:
		return float(value)
	except (ValueError, TypeError):
		return default

# Admin Dashboard Metrics API
class AdminDashboardMetricsView(APIView):
	permission_classes = [IsAuthenticated]
	def get(self, request):
		user = request.user
		if user.role != 'admin' and not user.is_superuser:
			return Response({'error': 'Admin access required.'}, status=403)
		from .models import Pet, PetAdoption, User, PetReport
		total_pets = Pet.objects.count()
		total_adoptions = PetAdoption.objects.filter(status='approved').count()
		total_lost = Pet.objects.filter(status='lost').count()
		total_found = Pet.objects.filter(status='found').count()
		total_users = User.objects.count()
		total_resolved = PetReport.objects.filter(report_status='resolved').count()
		metrics = {
			'total_pets_reported': total_pets,
			'total_adoptions_approved': total_adoptions,
			'total_lost': total_lost,
			'total_found': total_found,
			'total_registered_users': total_users,
			'total_cases_resolved': total_resolved,
		}
		return Response({'success': True, 'metrics': metrics})

# Forgot Password API
from django.contrib.auth.hashers import make_password
from .models import User, UserStory, FavouritePet, Pet
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
	email = request.data.get('email')
	password = request.data.get('password')
	confirm_password = request.data.get('confirm_password')
	if not email or not password or not confirm_password:
		return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
	if password != confirm_password:
		return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
	try:
		user = User.objects.get(email=email)
		user.password = make_password(password)
		user.save()
		return Response({'success': True, 'message': 'Password updated successfully.'})
	except User.DoesNotExist:
		return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

# User Stories APIs
class UserStoryView(APIView):
	permission_classes = [IsAuthenticated]
	def post(self, request):
		content = request.data.get('content')
		pet_id = request.data.get('pet_id')
		pet = Pet.objects.filter(id=pet_id).first() if pet_id else None
		story = UserStory.objects.create(user=request.user, pet=pet, content=content)
		return Response({'success': True, 'story_id': story.id})
	def get(self, request):
		stories = UserStory.objects.all().order_by('-created_at')
		data = [
			{
				'id': s.id,
				'user': s.user.username,
				'pet': s.pet.name if s.pet else None,
				'content': s.content,
				'created_at': s.created_at
			} for s in stories
		]
		return Response({'success': True, 'stories': data})

# Favourite Pets APIs
class FavouritePetView(APIView):
	permission_classes = [IsAuthenticated]
	def post(self, request):
		pet_id = request.data.get('pet_id')
		pet = Pet.objects.filter(id=pet_id).first()
		if not pet:
			return Response({'error': 'Pet not found.'}, status=404)
		fav, created = FavouritePet.objects.get_or_create(user=request.user, pet=pet)
		return Response({'success': True, 'favourite_id': fav.id, 'created': created})
	def get(self, request):
		favs = FavouritePet.objects.filter(user=request.user)
		data = [
			{
				'id': f.id,
				'pet_id': f.pet.id,
				'pet_name': f.pet.name,
				'created_at': f.created_at
			} for f in favs
		]
		return Response({'success': True, 'favourites': data})
	def delete(self, request):
		fav_id = request.data.get('favourite_id')
		fav = FavouritePet.objects.filter(id=fav_id, user=request.user).first()
		if not fav:
			return Response({'error': 'Favourite not found.'}, status=404)
		fav.delete()
		return Response({'success': True, 'message': 'Removed from favourites.'})

class UserProfileUpdateView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [MultiPartParser, FormParser]

	def patch(self, request):
		user = request.user
		data = request.data

		user.first_name = data.get('first_name', user.first_name)
		user.last_name = data.get('last_name', user.last_name)
		user.email = data.get('email', user.email)
		user.phone_no = data.get('phone_no', user.phone_no)
		user.address = data.get('address', user.address)
		user.city = data.get('city', user.city)
		user.state = data.get('state', user.state)
		user.pincode = data.get('pincode', user.pincode)
		user.gender = data.get('gender', user.gender)

		if 'profile_picture' in request.FILES:
			user.profile_picture = request.FILES['profile_picture']

		user.save()
		return Response({'success': True, 'message': 'Profile updated successfully.'})
"""
==============================================================================
                        PET RESCUE API VIEWS - STRUCTURED
==============================================================================

This file contains all API views organized by milestones:

📋 TABLE OF CONTENTS:

MILESTONE 1: Core Pet Management System
├── 1.1 User Management & Authentication (UserViewSet)
├── 1.2 Pet Management & Core Operations (PetViewSet)  
├── 1.3 Medical History & Adoption Management (PetMedicalHistoryViewSet, PetAdoptionViewSet)
├── 1.4 Notifications & Communication (NotificationViewSet)
├── 1.5 Pet Reports Management (PetReportViewSet - lost/found/adopt)
└── 1.6 Core Adoption & Reporting Functions (Basic CRUD operations)

MILESTONE 2: Enhanced Features & Advanced APIs
├── 2.1 Enhanced Search & Filtering (advanced search with multiple filters)
├── 2.2 Smart Reunification System (AI-like matching for lost/found pets)
├── 2.3 Reunification Confirmation System (reunion tracking)
├── 2.4 Unified Pet Request API ⭐ (MAIN ENDPOINT - handles all pet requests)
└── 2.5 Advanced Admin Dashboard & Analytics (comprehensive statistics)

⭐ KEY MILESTONE 2 ENDPOINT:
POST /api/pet/pet-request-form - Unified endpoint for lost/found/adopt requests

==============================================================================
"""

from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View
from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
import json
from .models import Pet, PetMedicalHistory, PetAdoption, Notification, PetReport, User
from .serializers import PetSerializer, PetMedicalHistorySerializer, PetAdoptionSerializer, NotificationSerializer, PetReportSerializer, UserSerializer
from .admin_utils import (get_admin_dashboard_stats, get_user_management_data, get_pet_management_data,
                         bulk_approve_reports, bulk_reject_reports, bulk_approve_adoptions, bulk_reject_adoptions)

# ==============================================================================
#                              MILESTONE 1: CORE SYSTEM
# ==============================================================================

# ----------------------------------------
# 1.1 USER MANAGEMENT & AUTHENTICATION
# ----------------------------------------

# User ViewSet - Core user management functionality
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_superuser or self.request.user.role == 'admin':
            return User.objects.all()
        else:
            return User.objects.filter(id=self.request.user.id)
    
    def perform_create(self, serializer):
        if self.request.user.role != 'admin' and not self.request.user.is_superuser and self.request.user.is_authenticated:
            # If not admin and already authenticated, deny creation of other users
            return Response({'error': 'Only admins can create users via API'}, status=403)
        serializer.save()
    
    def perform_update(self, serializer):
        """Users can only update their own profile, admins can update any user"""
        if self.request.user.role != 'admin' and not self.request.user.is_superuser and serializer.instance.id != self.request.user.id:
            return Response({'error': 'You can only update your own profile'}, status=403)
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only admins can delete users, and can't delete themselves"""
        if self.request.user.role != 'admin' and not self.request.user.is_superuser:
            return Response({'error': 'Only admins can delete users'}, status=403)
        if instance.id == self.request.user.id:
            return Response({'error': 'You cannot delete your own account'}, status=400)
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user's profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update current user's profile"""
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Admin can activate/deactivate users"""
        if request.user.role != 'admin' and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        user = self.get_object()
        if user.id == request.user.id:
            return Response({'error': 'You cannot deactivate your own account'}, status=400)
        
        user.is_active = not user.is_active
        user.save()
        return Response({
            'message': f'User {user.username} {"activated" if user.is_active else "deactivated"}',
            'user_id': user.id,
            'is_active': user.is_active
        })
    
    @action(detail=True, methods=['post'])
    def change_role(self, request, pk=None):
        """Admin can change user roles"""
        if request.user.role != 'admin' and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        user = self.get_object()
        new_role = request.data.get('role')
        
        if new_role not in ['admin', 'user']:
            return Response({'error': 'Invalid role. Must be "admin" or "user"'}, status=400)
        
        if user.id == request.user.id and new_role == 'user':
            return Response({'error': 'You cannot demote yourself from admin'}, status=400)
        
        user.role = new_role
        user.save()
        return Response({
            'message': f'User {user.username} role changed to {new_role}',
            'user_id': user.id,
            'role': user.role
        })
    
    @action(detail=False, methods=['get'])
    def admins(self, request):
        """Get list of admin users (admin only)"""
        if request.user.role != 'admin' and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        admins = User.objects.filter(role='admin')
        serializer = self.get_serializer(admins, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics (admin only)"""
        if request.user.role != 'admin' and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        admin_users = User.objects.filter(role='admin').count()
        regular_users = User.objects.filter(role='user').count()
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'admin_users': admin_users,
            'regular_users': regular_users
        })
    
    @action(detail=False, methods=['get'])
    def superuser_details(self, request):
        """Get all system details (superuser only)"""
        if not request.user.is_superuser:
            return Response({'error': 'Superuser access required'}, status=403)
        
        users = User.objects.all().order_by('-date_joined')
        admin_users = User.objects.filter(role='admin').order_by('-date_joined')
        regular_users = User.objects.filter(role='user').order_by('-date_joined')
        
        # Get all user data including sensitive information (superuser privilege)
        all_users_data = []
        for user in users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff,
                'date_joined': user.date_joined,
                'last_login': user.last_login,
                'phone_no': user.phone_no,
                'address': user.address,
                'city': user.city,
                'state': user.state,
                'pincode': user.pincode,
                'gender': user.gender,
            }
            all_users_data.append(user_data)
        
        return Response({
            'message': 'Superuser has access to all system data',
            'total_users': users.count(),
            'admin_users_count': admin_users.count(),
            'regular_users_count': regular_users.count(),
            'all_users': all_users_data,
            'superuser_privileges': [
                'Can view all user details including sensitive information',
                'Can access all admin functions',
                'Can manage all users, pets, and adoptions',
                'Can approve/reject any requests',
                'Full system access and control'
            ]
        })

# ----------------------------------------
# 1.2 PET MANAGEMENT & CORE OPERATIONS
# ----------------------------------------

# Pet ViewSet - Core pet management functionality
class PetViewSet(viewsets.ModelViewSet):
	queryset = Pet.objects.all()
	serializer_class = PetSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		tab = self.request.query_params.get('tab')
		if user.role == 'admin':
			# Admin filtered view
			if tab == 'lost':
				return Pet.objects.filter(status='lost', reports__report_status='accepted').distinct()
			elif tab == 'found':
				return Pet.objects.filter(status='found', reports__report_status='accepted').distinct()
			elif tab == 'adopt':
				# Adopted or found > 30 days ago
				from django.utils import timezone
				thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
				return Pet.objects.filter(
					models.Q(status='adopted', adoptions__status='approved') |
					models.Q(status='found', created_at__lte=thirty_days_ago)
				).distinct()
			return Pet.objects.all()
		else:
			# User view
			if tab == 'lost':
				return Pet.objects.filter(status='lost', reports__user=user).distinct()
			elif tab == 'found':
				return Pet.objects.filter(status='found', reports__user=user).distinct()
			elif tab == 'adopt':
				return Pet.objects.filter(adoptions__user=user).distinct()
			return Pet.objects.filter(reports__user=user).distinct()

	def partial_update(self, request, *args, **kwargs):
		pet = self.get_object()
		if pet.reports.filter(user=request.user).exists():
			return super().partial_update(request, *args, **kwargs)
		return Response({'error': 'You can only update your own pet details.'}, status=403)

	def destroy(self, request, *args, **kwargs):
		pet = self.get_object()
		if pet.reports.filter(user=request.user).exists():
			pet.status = 'unavailable'
			pet.save()
			return Response({'message': 'Pet record marked as inactive.'})
		return Response({'error': 'You can only delete your own pet.'}, status=403)

class UserProfileDeactivateView(APIView):
	permission_classes = [IsAuthenticated]
	def patch(self, request):
		user = request.user
		# Admin can deactivate any user
		target_id = request.data.get('user_id')
		if user.role == 'admin' and target_id:
			from .models import User
			try:
				target_user = User.objects.get(id=target_id)
				target_user.is_active = False
				target_user.save()
				return Response({'success': True, 'message': 'User profile deactivated.'})
			except User.DoesNotExist:
				return Response({'error': 'User not found.'}, status=404)
		# User can deactivate own profile
		user.is_active = False
		user.save()
		return Response({'success': True, 'message': 'Your profile has been deactivated.'})

# ----------------------------------------
# 1.3 MEDICAL HISTORY & ADOPTION MANAGEMENT
# ----------------------------------------

# PetMedicalHistory ViewSet - Medical records management
class PetMedicalHistoryViewSet(viewsets.ModelViewSet):
    queryset = PetMedicalHistory.objects.all()
    serializer_class = PetMedicalHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

# PetAdoption ViewSet - Adoption process management
class PetAdoptionViewSet(viewsets.ModelViewSet):
    queryset = PetAdoption.objects.all()
    serializer_class = PetAdoptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an adoption request (admin only)"""
        if request.user.role != 'admin' and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        adoption = self.get_object()
        adoption.status = 'approved'
        adoption.save()
        
        # Update pet status
        adoption.pet.status = 'adopted'
        adoption.pet.save()
        
        # Create notification for user
        Notification.objects.create(
            sender=request.user,
            receiver=adoption.user,
            message=f"Your adoption request for {adoption.pet.name} has been approved!",
            is_read=False
        )
        
        return Response({'message': 'Adoption approved successfully'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an adoption request (admin only)"""
        if request.user.role != 'admin' and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        adoption = self.get_object()
        adoption.status = 'rejected'
        adoption.save()
        
        # Create notification for user
        Notification.objects.create(
            sender=request.user,
            receiver=adoption.user,
            message=f"Your adoption request for {adoption.pet.name} has been rejected.",
            is_read=False
        )
        
        return Response({'message': 'Adoption rejected'})

# Notification ViewSet
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter notifications for current user"""
        return Notification.objects.filter(receiver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread notifications"""
        unread_notifications = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data)

# ----------------------------------------
# 1.4 NOTIFICATIONS & COMMUNICATION
# ----------------------------------------

# Notification ViewSet - User notification system
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(receiver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread notifications"""
        unread_notifications = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data)

# ----------------------------------------
# 1.5 PET REPORTS MANAGEMENT (LOST/FOUND/ADOPT)
# ----------------------------------------

# PetReport ViewSet - Core reporting system for lost/found/adopt pets
class PetReportViewSet(viewsets.ModelViewSet):
    queryset = PetReport.objects.all()
    serializer_class = PetReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def lost(self, request):
        """Get only lost pet reports"""
        lost_reports = PetReport.objects.filter(status='lost')
        serializer = self.get_serializer(lost_reports, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def found(self, request):
        """Get only found pet reports"""
        found_reports = PetReport.objects.filter(status='found')
        serializer = self.get_serializer(found_reports, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def adopt(self, request):
        """Get approved adoption applications"""
        from .models import PetAdoption
        from .serializers import PetAdoptionSerializer
        
        # Get approved adoptions instead of just adoption reports
        approved_adoptions = PetAdoption.objects.filter(status='approved')
        serializer = PetAdoptionSerializer(approved_adoptions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reunite(self, request, pk=None):
        """Mark a pet as reunited with owner"""
        report = self.get_object()
        report.status = 'reunited'
        report.save()
        
        # Update associated pet status if exists
        if hasattr(report, 'pet') and report.pet:
            report.pet.status = 'reunited'
            report.pet.save()
        
        return Response({'message': 'Pet marked as reunited successfully'})

# ==============================================================================
#                         MILESTONE 1: BASIC API FUNCTIONS
# ==============================================================================

# ----------------------------------------
# 1.6 CORE ADOPTION & REPORTING FUNCTIONS
# ----------------------------------------

from django.http import HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_adoption(request):
	"""Basic adoption request function"""
	pet_id = request.data.get('pet_id')
	reason = request.data.get('reason', '')  # Add reason field
	from .models import Pet, PetAdoption, Notification, User
	
	if not pet_id:
		return Response({'error': 'Pet ID is required'}, status=http_status.HTTP_400_BAD_REQUEST)
	
	pet = Pet.objects.filter(id=pet_id).first()
	if not pet:
		return Response({'error': 'Pet not found'}, status=http_status.HTTP_404_NOT_FOUND)
		
	# Prevent duplicate requests for same pet by same user
	existing = PetAdoption.objects.filter(user=request.user, pet=pet).first()
	if existing:
		return Response({'error': 'You have already requested to adopt this pet'}, status=http_status.HTTP_400_BAD_REQUEST)
	
	adoption = PetAdoption.objects.create(
		user=request.user, 
		pet=pet, 
		status='pending',
		reason=reason  # Include reason in creation
	)
	
	# Create notification for all admin users (role='admin', is_staff, or is_superuser)
	from django.db import models
	admins = User.objects.filter(models.Q(role='admin') | models.Q(is_staff=True) | models.Q(is_superuser=True)).distinct()
	for admin in admins:
		Notification.objects.create(
			sender=request.user,
			receiver=admin,
			message=f"New adoption request for {pet.name} by {request.user.username}",
			is_read=False
		)
	
	return Response({
		'message': 'Adoption request submitted successfully',
		'adoption_id': adoption.id
	}, status=http_status.HTTP_201_CREATED)

@login_required
@csrf_exempt
def report_lost_pet(request):
	if request.method == 'POST':
		# Create Pet first
		pet = Pet.objects.create(
			name=request.POST.get('pet_name'),
			type=request.POST.get('pet_type'),
			breed=request.POST.get('pet_breed'),
			colour=request.POST.get('pet_colour'),
			location=request.POST.get('pet_location'),
			image=request.FILES.get('pet_image'),
			age=request.POST.get('pet_age') or 0,
			weight=request.POST.get('pet_weight') or 0.0,
			gender=request.POST.get('pet_gender'),
			state=request.POST.get('pet_state'),
			city=request.POST.get('pet_city'),
			date=request.POST.get('pet_date'),
			is_vaccinated=request.POST.get('pet_is_vaccinated') == 'true',
			is_diseased=request.POST.get('pet_is_diseased') == 'true',
			description=request.POST.get('description'),
			status='lost'  # Explicitly set status to 'lost' instead of default 'available'
		)
		
		# Create PetReport
		report = PetReport.objects.create(
			pet=pet,
			user=request.user,
			status='lost',
			description=request.POST.get('description'),
			report_status='pending'
		)
		
		# Create Medical History if vaccinated or diseased
		if pet.is_vaccinated and request.POST.get('vaccine_name'):
			PetMedicalHistory.objects.create(
				pet=pet,
				vaccine_name=request.POST.get('vaccine_name'),
				last_vaccinated_date=request.POST.get('last_vaccinated_date')
			)
		
		if pet.is_diseased and request.POST.get('disease_name'):
			PetMedicalHistory.objects.create(
				pet=pet,
				disease_name=request.POST.get('disease_name'),
				stage=request.POST.get('stage'),
				treatment_name=request.POST.get('treatment_name'),
				no_of_years=request.POST.get('no_of_years') or 0
			)
		
		# Create notification for all admin users (role='admin', is_staff, or is_superuser)
		from .models import Notification, User
		from django.db import models
		admins = User.objects.filter(models.Q(role='admin') | models.Q(is_staff=True) | models.Q(is_superuser=True)).distinct()
		for admin in admins:
			Notification.objects.create(
				sender=request.user,
				receiver=admin,
				message=f"New lost pet report: {pet.name} by {request.user.username}",
				is_read=False
			)
		
		return redirect('dashboard')
	return redirect('dashboard')

@login_required
@csrf_exempt
def report_found_pet(request):
	if request.method == 'POST':
		# Create Pet first
		pet = Pet.objects.create(
			name=request.POST.get('pet_name'),
			type=request.POST.get('pet_type'),
			breed=request.POST.get('pet_breed'),
			colour=request.POST.get('pet_colour'),
			location=request.POST.get('pet_location'),
			image=request.FILES.get('pet_image'),
			age=request.POST.get('pet_age') or 0,
			weight=request.POST.get('pet_weight') or 0.0,
			gender=request.POST.get('pet_gender'),
			state=request.POST.get('pet_state'),
			city=request.POST.get('pet_city'),
			date=request.POST.get('pet_date'),
			is_vaccinated=request.POST.get('pet_is_vaccinated') == 'true',
			is_diseased=request.POST.get('pet_is_diseased') == 'true',
			description=request.POST.get('description'),
			status='found'  # Explicitly set status to 'found' instead of default 'available'
		)
		
		# Create PetReport for found pet
		report = PetReport.objects.create(
			pet=pet,
			user=request.user,
			status='found',
			description=request.POST.get('description'),
			report_status='pending'
		)
		
		# Create Medical History if vaccinated or diseased
		if pet.is_vaccinated and request.POST.get('vaccine_name'):
			PetMedicalHistory.objects.create(
				pet=pet,
				vaccine_name=request.POST.get('vaccine_name'),
				last_vaccinated_date=request.POST.get('last_vaccinated_date')
			)
		
		if pet.is_diseased and request.POST.get('disease_name'):
			PetMedicalHistory.objects.create(
				pet=pet,
				disease_name=request.POST.get('disease_name'),
				stage=request.POST.get('stage'),
				treatment_name=request.POST.get('treatment_name'),
				no_of_years=request.POST.get('no_of_years') or 0
			)
		
		# Create notification for all admin users (role='admin', is_staff, or is_superuser)
		from .models import Notification, User
		from django.db import models
		admins = User.objects.filter(models.Q(role='admin') | models.Q(is_staff=True) | models.Q(is_superuser=True)).distinct()
		for admin in admins:
			Notification.objects.create(
				sender=request.user,
				receiver=admin,
				message=f"New found pet report: {pet.name} by {request.user.username}",
				is_read=False
			)
		
		return redirect('dashboard')
	return redirect('dashboard')

@login_required
def submit_rescue_report(request):
	if request.method == 'POST':
		# Create Pet first with the rescue form field names
		pet = Pet.objects.create(
			name=request.POST.get('found_pet_name') or 'Found Pet',
			type=request.POST.get('found_pet_type'),
			breed=request.POST.get('found_pet_breed') or 'Unknown',
			colour=request.POST.get('found_pet_colour'),
			location=request.POST.get('found_pet_location'),
			image=request.FILES.get('found_pet_image'),
			age=request.POST.get('found_pet_age') or 0,
			weight=0.0,  # Not collected in rescue form
			gender=request.POST.get('found_pet_gender') or 'Unknown',
			state=request.POST.get('found_pet_state'),
			city=request.POST.get('found_pet_city'),
			date=request.POST.get('found_date'),
			is_vaccinated=False,  # Unknown for found pets
			is_diseased=False,    # Unknown for found pets
			description=request.POST.get('found_pet_description') or '',
			status='found'  # Explicitly set status to 'found' instead of default 'available'
		)
		
		# Create PetReport for found pet
		report = PetReport.objects.create(
			pet=pet,
			user=request.user,
			status='found',
			description=request.POST.get('found_pet_description') or '',
			report_status='pending'
		)
		
		# Create notification for all admin users (role='admin', is_staff, or is_superuser)
		from .models import Notification, User
		from django.db import models
		admins = User.objects.filter(models.Q(role='admin') | models.Q(is_staff=True) | models.Q(is_superuser=True)).distinct()
		for admin in admins:
			Notification.objects.create(
				sender=request.user,
				receiver=admin,
				message=f"New rescue report: {pet.name} found by {request.user.username}",
				pet=pet,
				is_read=False
			)
		
		return redirect('dashboard')
	return redirect('dashboard')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_approve_adoption(request, adoption_id):
	if request.user.role != 'admin' and not request.user.is_superuser:
		return Response({'error': 'Permission denied'}, status=http_status.HTTP_403_FORBIDDEN)
	
	try:
		from .models import PetAdoption, Notification
		adoption = PetAdoption.objects.get(id=adoption_id)
		adoption.status = 'approved'
		adoption.save()
		
		# Mark the pet as adopted
		adoption.pet.status = 'adopted'
		adoption.pet.save()
		
		# Notify the user
		Notification.objects.create(
			sender=request.user,
			receiver=adoption.user,
			message=f"Your adoption request for {adoption.pet.name} has been approved!",
			is_read=False
		)
		
		return Response({
			'message': 'Adoption approved successfully',
			'adoption_id': adoption_id
		}, status=http_status.HTTP_200_OK)
	except PetAdoption.DoesNotExist:
		return Response({'error': 'Adoption request not found'}, status=http_status.HTTP_404_NOT_FOUND)
	except Exception as e:
		return Response({'error': str(e)}, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reject_adoption(request, adoption_id):
	if request.user.role != 'admin' and not request.user.is_superuser:
		return Response({'error': 'Permission denied'}, status=http_status.HTTP_403_FORBIDDEN)
	
	try:
		from .models import PetAdoption, Notification
		adoption = PetAdoption.objects.get(id=adoption_id)
		adoption.status = 'rejected'
		adoption.save()
		
		# Notify the user
		Notification.objects.create(
			sender=request.user,
			receiver=adoption.user,
			message=f"Your adoption request for {adoption.pet.name} has been rejected.",
			is_read=False
		)
		
		return Response({
			'message': 'Adoption rejected successfully',
			'adoption_id': adoption_id
		}, status=http_status.HTTP_200_OK)
	except PetAdoption.DoesNotExist:
		return Response({'error': 'Adoption request not found'}, status=http_status.HTTP_404_NOT_FOUND)
	except Exception as e:
		return Response({'error': str(e)}, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@require_http_methods(["POST"])
def admin_approve_report(request, report_id):
	"""
	API endpoint for admin to approve pet reports
	POST /api/admin/approve_report/{report_id}/
	Headers: Authorization: Bearer <admin_token>
	"""
	try:
		# Import JWT authentication
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		# Authenticate the request
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			
			user, token = user_auth_tuple
			request.user = user  # Set the authenticated user
			
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Check if user is admin (role='admin', is_staff, or is_superuser)
		is_admin = (
			getattr(request.user, 'role', None) == 'admin' or
			getattr(request.user, 'is_staff', False) or 
			getattr(request.user, 'is_superuser', False)
		)
		
		if not is_admin:
			return JsonResponse({
				'success': False,
				'error': 'Admin access required.'
			}, status=403)
		
		# Get and approve report
		try:
			report = PetReport.objects.get(id=report_id)
			report.report_status = 'accepted'  # Must be 'accepted' not 'approved' - matches REPORT_STATUS_CHOICES
			report.save()
			
			# **FIX: Update Pet status based on report type**
			pet = report.pet
			if report.status == 'adopt':
				# If user posted pet for adoption, make it available for others to adopt
				pet.status = 'available'
				report.status = 'available'  # Also update report status to 'available'
				report.save()
			elif report.status in ['lost', 'found', 'adopted', 'available']:
				pet.status = report.status  # Sync pet status with report status
			pet.save()
			
			# Create notification for user
			Notification.objects.create(
				sender=request.user,
				receiver=report.user,
				message=f"Your pet report for {report.pet.name} has been approved!",
				pet=report.pet,
				is_read=False
			)
			
			return JsonResponse({
				'success': True,
				'message': f'Pet report for {report.pet.name} approved successfully',
				'report_id': report.id,
				'pet_name': report.pet.name,
				'reporter': report.user.username,
				'approved_by': request.user.username,
				'notification_sent': True,
				'timestamp': timezone.now().isoformat()
			})
			
		except PetReport.DoesNotExist:
			return JsonResponse({
				'success': False,
				'error': 'Pet report not found'
			}, status=404)
			
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reject_report(request, report_id):
	if request.user.role != 'admin':
		return Response({'error': 'Permission denied'}, status=http_status.HTTP_403_FORBIDDEN)
	
	try:
		report = PetReport.objects.get(id=report_id)
		report.report_status = 'rejected'
		report.save()
		
		# If this is a rejected rescue/found report, mark the pet as unavailable
		if report.status == 'found':
			report.pet.status = 'unavailable'
			report.pet.save()
		
		# Notify the user
		Notification.objects.create(
			sender=request.user,
			receiver=report.user,
			message=f"Your pet report for {report.pet.name} has been rejected.",
			is_read=False
		)
		
		return Response({
			'message': 'Report rejected successfully',
			'report_id': report_id
		}, status=http_status.HTTP_200_OK)
	except PetReport.DoesNotExist:
		return Response({'error': 'Report not found'}, status=http_status.HTTP_404_NOT_FOUND)
	except Exception as e:
		return Response({'error': str(e)}, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_pending_reports(request):
	"""Get all pending reports for admin"""
	if request.user.role != 'admin':
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import PetReport
	from .serializers import PetReportSerializer
	
	# Get all pending reports (lowercase 'pending')
	pending_reports = PetReport.objects.filter(report_status='pending').order_by('-created_at')
	
	# Debug: Log the count and first few reports
	print(f"DEBUG: Found {pending_reports.count()} pending reports")
	for report in pending_reports[:3]:
		print(f"  - Report ID: {report.id}, Status: {report.status}, Report Status: {report.report_status}, Pet: {report.pet.name if report.pet else 'No pet'}")
	
	serializer = PetReportSerializer(pending_reports, many=True)
	
	# Debug: Log serialized data
	print(f"DEBUG: Serialized data count: {len(serializer.data)}")
	if serializer.data:
		print(f"DEBUG: First report data: {serializer.data[0]}")
	
	return Response({
		'success': True,
		'reports': serializer.data,
		'count': pending_reports.count()
	})

@login_required
@csrf_exempt
def admin_mark_available_for_adoption(request, report_id):
	if request.user.role == 'admin':
		try:
			report = PetReport.objects.get(id=report_id, status='found', report_status='approved')
			# Mark the pet as available for adoption
			report.pet.status = 'available'
			report.pet.save()
			
			# Notify the user who submitted the rescue report
			Notification.objects.create(
				sender=request.user,
				receiver=report.user,
				message=f"The pet {report.pet.name} you rescued has been marked as available for adoption!",
				pet=report.pet,
				is_read=False
			)
			
		except PetReport.DoesNotExist:
			pass
		
		return redirect('dashboard')
	return redirect('dashboard')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_all_pets_by_status(request):
	"""Get all ACCEPTED pets filtered by status for admin dashboard (like user dashboard)"""
	if request.user.role != 'admin':
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import Pet, PetReport
	from .serializers import PetSerializer
	
	status = request.GET.get('status', 'all')  # lost, found, adopted, available, all
	
	# Get only pets from ACCEPTED reports (report_status='accepted')
	if status == 'all':
		# Get all pets that have accepted reports
		accepted_report_ids = PetReport.objects.filter(report_status='accepted').values_list('pet_id', flat=True)
		pets = Pet.objects.filter(id__in=accepted_report_ids).order_by('-created_at')
	else:
		# Get pets with specific status from accepted reports only
		accepted_report_ids = PetReport.objects.filter(report_status='accepted').values_list('pet_id', flat=True)
		pets = Pet.objects.filter(id__in=accepted_report_ids, status=status).order_by('-created_at')
	
	serializer = PetSerializer(pets, many=True)
	
	return Response({
		'success': True,
		'pets': serializer.data,
		'count': pets.count(),
		'status': status
	})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_all_reports_by_status(request):
	"""Get all reports filtered by status and type for admin dashboard"""
	if request.user.role != 'admin':
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import PetReport
	from .serializers import PetReportSerializer
	
	report_status = request.GET.get('report_status', 'all')  # pending, accepted, rejected, all
	report_type = request.GET.get('type', 'all')  # lost, found, all
	
	reports = PetReport.objects.all()
	
	if report_status != 'all':
		reports = reports.filter(report_status=report_status)
	
	if report_type == 'lost':
		reports = reports.filter(status='lost')
	elif report_type == 'found':
		reports = reports.filter(status='found')
	
	reports = reports.order_by('-created_at')
	
	serializer = PetReportSerializer(reports, many=True)
	
	return Response({
		'success': True,
		'reports': serializer.data,
		'count': reports.count(),
		'report_status': report_status,
		'report_type': report_type
	})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_search_pets(request):
	"""Admin search pets with comprehensive filters"""
	if request.user.role != 'admin':
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import Pet, PetReport
	from .serializers import PetSerializer
	from django.db.models import Q
	
	# Get search parameters
	query = request.GET.get('query', '')
	pet_type = request.GET.get('type', 'all')
	status = request.GET.get('status', 'all')
	breed = request.GET.get('breed', '')
	location = request.GET.get('location', '')
	gender = request.GET.get('gender', '')
	min_age = request.GET.get('min_age', '')
	max_age = request.GET.get('max_age', '')
	is_vaccinated = request.GET.get('is_vaccinated', '')
	report_status = request.GET.get('report_status', 'all')  # pending, accepted, rejected, all
	
	# Start with base query
	if report_status == 'accepted':
		# Only show pets from accepted reports
		accepted_report_ids = PetReport.objects.filter(report_status='accepted').values_list('pet_id', flat=True)
		pets = Pet.objects.filter(id__in=accepted_report_ids)
	elif report_status == 'pending':
		# Only show pets from pending reports
		pending_report_ids = PetReport.objects.filter(report_status='pending').values_list('pet_id', flat=True)
		pets = Pet.objects.filter(id__in=pending_report_ids)
	elif report_status == 'rejected':
		# Only show pets from rejected reports
		rejected_report_ids = PetReport.objects.filter(report_status='rejected').values_list('pet_id', flat=True)
		pets = Pet.objects.filter(id__in=rejected_report_ids)
	else:
		# Show all pets
		pets = Pet.objects.all()
	
	# Apply text search
	if query:
		pets = pets.filter(
			Q(name__icontains=query) |
			Q(breed__icontains=query) |
			Q(description__icontains=query) |
			Q(location__icontains=query) |
			Q(city__icontains=query) |
			Q(state__icontains=query)
		)
	
	# Apply filters
	if pet_type != 'all':
		pets = pets.filter(type__iexact=pet_type)
	
	if status != 'all':
		pets = pets.filter(status__iexact=status)
	
	if breed:
		pets = pets.filter(breed__icontains=breed)
	
	if location:
		pets = pets.filter(
			Q(location__icontains=location) |
			Q(city__icontains=location) |
			Q(state__icontains=location)
		)
	
	if gender:
		pets = pets.filter(gender__iexact=gender)
	
	if min_age:
		try:
			pets = pets.filter(age__gte=int(min_age))
		except ValueError:
			pass
	
	if max_age:
		try:
			pets = pets.filter(age__lte=int(max_age))
		except ValueError:
			pass
	
	if is_vaccinated:
		pets = pets.filter(is_vaccinated=(is_vaccinated.lower() == 'true'))
	
	pets = pets.order_by('-created_at')
	
	serializer = PetSerializer(pets, many=True)
	
	return Response({
		'success': True,
		'pets': serializer.data,
		'count': pets.count(),
		'filters': {
			'query': query,
			'type': pet_type,
			'status': status,
			'breed': breed,
			'location': location,
			'gender': gender,
			'min_age': min_age,
			'max_age': max_age,
			'is_vaccinated': is_vaccinated,
			'report_status': report_status
		}
	})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_dashboard_stats(request):
	"""Get comprehensive dashboard statistics for admin"""
	if request.user.role != 'admin':
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import Pet, PetReport, PetAdoption
	from django.db.models import Q
	
	# Pending counts (new requests)
	pending_lost_reports = PetReport.objects.filter(report_status='pending', status='lost').count()
	pending_found_reports = PetReport.objects.filter(report_status='pending', status='found').count()
	pending_adoptions = PetAdoption.objects.filter(status='pending').count()
	pending_adoption_posts = PetReport.objects.filter(status='adopt', report_status='pending').count()  # FIXED: Count from PetReport, not Pet
	
	# ACCEPTED pets counts by status (like user dashboard - only approved/accepted pets)
	accepted_report_ids = PetReport.objects.filter(report_status='accepted').values_list('pet_id', flat=True)
	accepted_lost_pets = Pet.objects.filter(id__in=accepted_report_ids, status='lost').count()
	accepted_found_pets = Pet.objects.filter(id__in=accepted_report_ids, status='found').count()
	accepted_adopted_pets = Pet.objects.filter(status='adopted').count()  # Adopted pets
	accepted_available_pets = Pet.objects.filter(status='available').count()  # Available for adoption
	
	# All pets counts (including pending, accepted, rejected)
	all_lost_pets = Pet.objects.filter(status='lost').count()
	all_found_pets = Pet.objects.filter(status='found').count()
	all_adopted_pets = Pet.objects.filter(status='adopted').count()
	all_available_pets = Pet.objects.filter(status='available').count()
	all_adoption_posts = PetReport.objects.filter(status='adopt').count()  # FIXED: Count from PetReport, not Pet
	
	# Total counts
	total_pets = Pet.objects.all().count()
	total_reports = PetReport.objects.all().count()
	total_adoptions = PetAdoption.objects.all().count()
	
	# Recent activity (last 7 days)
	from datetime import timedelta
	from django.utils import timezone
	week_ago = timezone.now() - timedelta(days=7)
	
	recent_reports = PetReport.objects.filter(created_at__gte=week_ago).count()
	recent_adoptions = PetAdoption.objects.filter(created_at__gte=week_ago).count()
	
	stats = {
		'pending': {
			'lost_reports': pending_lost_reports,
			'found_reports': pending_found_reports,
			'adoptions': pending_adoptions,
			'adoption_posts': pending_adoption_posts,
			'total': pending_lost_reports + pending_found_reports + pending_adoptions + pending_adoption_posts
		},
		'accepted': {
			'lost': accepted_lost_pets,
			'found': accepted_found_pets,
			'adopted': accepted_adopted_pets,
			'available': accepted_available_pets
		},
		'all': {
			'lost': all_lost_pets,
			'found': all_found_pets,
			'adopted': all_adopted_pets,
			'available': all_available_pets,
			'adoption_posts': all_adoption_posts
		},
		'totals': {
			'pets': total_pets,
			'reports': total_reports,
			'adoptions': total_adoptions
		},
		'recent': {
			'reports': recent_reports,
			'adoptions': recent_adoptions
		}
	}
	
	return Response({
		'success': True,
		'stats': stats
	})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_pending_adoption_posts(request):
	"""Get all user-posted pets for adoption that are pending admin approval"""
	
	# DEBUG: Log the user making the request
	print(f"🔍 admin_get_pending_adoption_posts called by: {request.user.username}")
	print(f"🔍 User role: {request.user.role}")
	print(f"🔍 Is authenticated: {request.user.is_authenticated}")
	
	if request.user.role != 'admin':
		print(f"❌ Permission denied for user: {request.user.username} (role: {request.user.role})")
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import Pet, PetReport, PetMedicalHistory
	from django.http import JsonResponse
	
	# Get PetReports with status 'adopt' and report_status 'pending'
	# This correctly filters for pending adoption posts
	pending_reports = PetReport.objects.filter(
		status='adopt',
		report_status='pending'
	).select_related('pet', 'user').order_by('-created_at')
	
	print(f"✅ Found {pending_reports.count()} pending adoption posts")
	
	posts_data = []
	for report in pending_reports:
		pet = report.pet
		
		# Get medical history
		medical_history = PetMedicalHistory.objects.filter(pet=pet)
		vaccination_info = medical_history.filter(vaccine_name__isnull=False).first()
		disease_info = medical_history.filter(disease_name__isnull=False).first()
		
		posts_data.append({
			'id': pet.id,
			'report_id': report.id,  # Important for approve/reject
			'name': pet.name,
			'type': pet.type,
			'breed': pet.breed,
			'age': pet.age,
			'gender': pet.gender,
			'location': pet.location,
			'description': pet.description,
			'image': pet.image.url if pet.image else None,
			'is_vaccinated': pet.is_vaccinated,
			'is_diseased': pet.is_diseased,
			'disease_description': disease_info.disease_name if disease_info else '',
			'vaccination_date': vaccination_info.last_vaccinated_date.strftime('%Y-%m-%d') if vaccination_info and vaccination_info.last_vaccinated_date else None,
			'vaccination_type': vaccination_info.vaccine_name if vaccination_info else '',
			'status': pet.status,
			'report_status': report.report_status,
			'created_at': report.created_at.strftime('%Y-%m-%d %H:%M:%S'),
			'posted_by': {
				'id': report.user.id,
				'username': report.user.username,
				'email': report.user.email
			}
		})
	
	print(f"✅ Returning {len(posts_data)} posts")
	
	return Response({
		'success': True,
		'posts': posts_data,
		'count': len(posts_data)
	})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_all_adoption_posts(request):
	"""Get ALL user-posted pets for adoption (pending, accepted, rejected)"""
	if request.user.role != 'admin':
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import Pet, PetReport, PetMedicalHistory
	from django.http import JsonResponse
	
	# Get filter parameter
	status_filter = request.GET.get('status', 'all')
	
	# Get ALL PetReports with status 'adopt'
	all_reports = PetReport.objects.filter(status='adopt').select_related('pet', 'user').order_by('-created_at')
	
	# Filter by report_status if specified
	if status_filter and status_filter != 'all':
		all_reports = all_reports.filter(report_status=status_filter)
	
	posts_data = []
	for report in all_reports:
		pet = report.pet
		
		# Get medical history
		medical_history = PetMedicalHistory.objects.filter(pet=pet)
		vaccination_info = medical_history.filter(vaccine_name__isnull=False).first()
		disease_info = medical_history.filter(disease_name__isnull=False).first()
		
		posts_data.append({
			'id': pet.id,
			'report_id': report.id,
			'name': pet.name,
			'type': pet.type,
			'breed': pet.breed,
			'age': pet.age,
			'gender': pet.gender,
			'location': pet.location,
			'description': pet.description,
			'image': pet.image.url if pet.image else None,
			'is_vaccinated': pet.is_vaccinated,
			'is_diseased': pet.is_diseased,
			'disease_description': disease_info.disease_name if disease_info else '',
			'vaccination_date': vaccination_info.last_vaccinated_date.strftime('%Y-%m-%d') if vaccination_info and vaccination_info.last_vaccinated_date else None,
			'vaccination_type': vaccination_info.vaccine_name if vaccination_info else '',
			'status': pet.status,
			'report_status': report.report_status,
			'created_at': report.created_at.strftime('%Y-%m-%d %H:%M:%S'),
			'posted_by': {
				'id': report.user.id,
				'username': report.user.username,
				'email': report.user.email
			}
		})
	
	return Response({
		'success': True,
		'posts': posts_data,
		'count': len(posts_data)
	})

@login_required
@csrf_exempt
def mark_notification_read(request, notification_id):
	from .models import Notification
	notification = Notification.objects.filter(id=notification_id, receiver=request.user).first()
	if notification:
		notification.is_read = True
		notification.save()
	return redirect('dashboard')

@login_required
def search_pets(request):
	from .models import Pet
	from django.db import models
	from django.http import JsonResponse
	from .serializers import PetSerializer
	
	query = request.GET.get('q', '')
	breed = request.GET.get('breed', '')
	location = request.GET.get('location', '')
	pet_type = request.GET.get('type', '')
	
	pets = Pet.objects.all()
	
	if query:
		pets = pets.filter(
			models.Q(name__icontains=query) |
			models.Q(description__icontains=query) |
			models.Q(breed__icontains=query)
		)
	
	if breed:
		pets = pets.filter(breed__icontains=breed)
	
	if location:
		pets = pets.filter(
			models.Q(location__icontains=location) |
			models.Q(city__icontains=location) |
			models.Q(state__icontains=location)
		)
	
	if pet_type:
		pets = pets.filter(type__icontains=pet_type)
	
	return JsonResponse({
		'pets': PetSerializer(pets, many=True).data,
		'query': query,
		'breed': breed,
		'location': location,
		'type': pet_type
	})

@login_required
def search_lost_pets(request):
	from django.db import models
	query = request.GET.get('q', '')
	location = request.GET.get('location', '')
	breed = request.GET.get('breed', '')
	
	reports = PetReport.objects.filter(status='lost', report_status='approved')
	
	if query:
		reports = reports.filter(
			models.Q(pet__name__icontains=query) |
			models.Q(pet__breed__icontains=query) |
			models.Q(description__icontains=query)
		)
	
	if location:
		reports = reports.filter(
			models.Q(pet__location__icontains=location) |
			models.Q(pet__city__icontains=location) |
			models.Q(pet__state__icontains=location)
		)
	
	if breed:
		reports = reports.filter(pet__breed__icontains=breed)
	
	context = {'reports': reports, 'query': query, 'location': location, 'breed': breed}
	return JsonResponse(context)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def filter_adoption_requests(request):
	# DEBUG: Log the user making the request
	print(f"🔍 filter_adoption_requests called by: {request.user.username}")
	print(f"🔍 User role: {request.user.role}")
	
	if request.user.role != 'admin':
		print(f"❌ Permission denied for user: {request.user.username} (role: {request.user.role})")
		return Response({'success': False, 'error': 'Permission denied'}, status=403)
	
	from .models import PetAdoption
	from .serializers import PetAdoptionSerializer
	
	status = request.GET.get('status', '')
	print(f"🔍 Filtering adoptions with status: {status}")
	
	adoptions = PetAdoption.objects.select_related('pet', 'user').all()
	
	# Filter by status if provided (and not 'all')
	if status and status != 'all':
		adoptions = adoptions.filter(status=status)
	
	print(f"✅ Found {adoptions.count()} adoption requests")
	
	serializer = PetAdoptionSerializer(adoptions, many=True)
	
	return Response({
		'success': True,
		'adoptions': serializer.data,
		'count': adoptions.count()
	})

# ----------------------------------------
# 2.5 ADVANCED ADMIN DASHBOARD & ANALYTICS
# ----------------------------------------

@login_required
def admin_dashboard_stats(request):
	"""MILESTONE 2: Admin dashboard with comprehensive statistics and analytics"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	stats = get_admin_dashboard_stats()
	context = {'stats': stats}
	return JsonResponse(context)

@login_required
def admin_user_management(request):
	"""Admin user management interface"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	users = get_user_management_data()
	context = {'users': users}
	return JsonResponse(context)

@login_required
def admin_pet_management(request):
	"""Admin pet management interface"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	# Get filter parameters
	status_filter = request.GET.get('status', '')
	type_filter = request.GET.get('type', '')
	breed_filter = request.GET.get('breed', '')
	
	# Start with all pets with annotations
	pets = Pet.objects.annotate(
		adoption_count=Count('adoptions'),
		report_count=Count('reports')
	)
	
	# Apply filters
	if status_filter:
		pets = pets.filter(status=status_filter)
	if type_filter:
		pets = pets.filter(type=type_filter)
	if breed_filter:
		pets = pets.filter(breed__icontains=breed_filter)
	
	# Order by creation date
	pets = pets.order_by('-date')
	
	context = {
		'pets': pets,
		'status_filter': status_filter,
		'type_filter': type_filter,
		'breed_filter': breed_filter
	}
	return JsonResponse(context)

@login_required
@csrf_exempt
def admin_bulk_approve_reports(request):
	"""Bulk approve multiple reports"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	if request.method == 'POST':
		report_ids = request.POST.getlist('report_ids')
		if report_ids:
			count = bulk_approve_reports(report_ids, request.user)
			# Add success message here if needed
	
	return redirect('dashboard')

@login_required
@csrf_exempt
def admin_bulk_reject_reports(request):
	"""Bulk reject multiple reports"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	if request.method == 'POST':
		report_ids = request.POST.getlist('report_ids')
		if report_ids:
			count = bulk_reject_reports(report_ids, request.user)
			# Add success message here if needed
	
	return redirect('dashboard')

@login_required
@csrf_exempt
def admin_bulk_approve_adoptions(request):
	"""Bulk approve multiple adoptions"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	if request.method == 'POST':
		adoption_ids = request.POST.getlist('adoption_ids')
		if adoption_ids:
			count = bulk_approve_adoptions(adoption_ids, request.user)
			# Add success message here if needed
	
	return redirect('dashboard')

@login_required
@csrf_exempt
def admin_bulk_reject_adoptions(request):
	"""Bulk reject multiple adoptions"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	if request.method == 'POST':
		adoption_ids = request.POST.getlist('adoption_ids')
		if adoption_ids:
			count = bulk_reject_adoptions(adoption_ids, request.user)
			# Add success message here if needed
	
	return redirect('dashboard')

@login_required
@csrf_exempt
def toggle_user_status(request, user_id):
	"""Toggle user active/inactive status"""
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	from .models import User
	user = User.objects.filter(id=user_id, role='user').first()
	if user:
		user.is_active = not user.is_active
		user.save()
		
		# Create notification for user
		status_text = "activated" if user.is_active else "deactivated"
		from .models import Notification
		Notification.objects.create(
			sender=request.user,
			receiver=user,
			message=f'Your account has been {status_text} by admin.',
			is_read=False
		)
	
	return redirect('admin_user_management')

# MILESTONE 2///////////////////////////
@login_required
def enhanced_search_pets(request):
	"""MILESTONE 2: Enhanced search with additional filters and smart matching"""
	from .models import Pet
	from django.db import models
	
	# Get all query parameters
	query = request.GET.get('q', '')
	breed = request.GET.get('breed', '')
	location = request.GET.get('location', '')
	pet_type = request.GET.get('type', '')
	min_age = request.GET.get('min_age', '')
	max_age = request.GET.get('max_age', '')
	is_vaccinated = request.GET.get('is_vaccinated', '')
	is_diseased = request.GET.get('is_diseased', '')
	gender = request.GET.get('gender', '')
	
	pets = Pet.objects.all()
	
	# Apply filters
	if query:
		pets = pets.filter(
			models.Q(name__icontains=query) |
			models.Q(description__icontains=query) |
			models.Q(breed__icontains=query)
		)
	
	if breed:
		pets = pets.filter(breed__icontains=breed)
	
	if location:
		pets = pets.filter(
			models.Q(location__icontains=location) |
			models.Q(city__icontains=location) |
			models.Q(state__icontains=location)
		)
	
	if pet_type:
		pets = pets.filter(type__icontains=pet_type)
	
	if min_age:
		pets = pets.filter(age__gte=min_age)
	
	if max_age:
		pets = pets.filter(age__lte=max_age)
	
	if is_vaccinated:
		pets = pets.filter(is_vaccinated=is_vaccinated.lower() == 'true')
	
	if is_diseased:
		pets = pets.filter(is_diseased=is_diseased.lower() == 'true')
	
	if gender:
		pets = pets.filter(gender__icontains=gender)
	
	context = {
		'pets': pets, 
		'query': query, 
		'breed': breed, 
		'location': location, 
		'type': pet_type,
		'min_age': min_age,
		'max_age': max_age,
		'is_vaccinated': is_vaccinated,
		'is_diseased': is_diseased,
		'gender': gender
	}
	return JsonResponse(context)

# ----------------------------------------
# 2.2 SMART REUNIFICATION SYSTEM
# ----------------------------------------

@login_required
def reunification_system(request):
	"""MILESTONE 2: Smart system to help reunite lost and found pets using AI-like matching"""
	from django.db import models
	
	lost_reports = PetReport.objects.filter(status='lost', report_status='approved', is_resolved=False)
	found_reports = PetReport.objects.filter(status='found', report_status='approved', is_resolved=False)
	
	# Find potential matches based on breed, location, and date
	potential_matches = []
	
	for lost_report in lost_reports:
		matches = found_reports.filter(
			models.Q(pet__breed__icontains=lost_report.pet.breed) &
			models.Q(pet__location__icontains=lost_report.pet.location)
		)
		
		for match in matches:
			potential_matches.append({
				'lost_report': lost_report,
				'found_report': match,
				'similarity_score': calculate_similarity_score(lost_report, match)
			})
	
	# Sort by similarity score
	potential_matches.sort(key=lambda x: x['similarity_score'], reverse=True)
	
	context = {
		'potential_matches': potential_matches[:20],  # Top 20 matches
		'lost_reports': lost_reports,
		'found_reports': found_reports
	}
	return JsonResponse(context)

def calculate_similarity_score(lost_report, found_report):
	"""Calculate similarity score between lost and found reports"""
	score = 0
	
	# Breed match (high weight)
	if lost_report.pet.breed.lower() == found_report.pet.breed.lower():
		score += 40
	elif lost_report.pet.breed.lower() in found_report.pet.breed.lower() or found_report.pet.breed.lower() in lost_report.pet.breed.lower():
		score += 20
	
	# Location match (medium weight)
	if lost_report.pet.location.lower() == found_report.pet.location.lower():
		score += 30
	elif lost_report.pet.city and found_report.pet.city and lost_report.pet.city.lower() == found_report.pet.city.lower():
		score += 20
	
	# Color match (medium weight)
	if lost_report.pet.colour.lower() == found_report.pet.colour.lower():
		score += 20
	
	# Age match (low weight)
	if lost_report.pet.age and found_report.pet.age:
		age_diff = abs(lost_report.pet.age - found_report.pet.age)
		if age_diff == 0:
			score += 10
		elif age_diff <= 1:
			score += 5
	
	return score

# ----------------------------------------
# 2.3 REUNIFICATION CONFIRMATION SYSTEM
# ----------------------------------------

@login_required
@csrf_exempt
def mark_pets_reunited(request):
	"""MILESTONE 2: Mark lost and found pets as successfully reunited"""
	if request.method == 'POST':
		lost_report_id = request.POST.get('lost_report_id')
		found_report_id = request.POST.get('found_report_id')
		
		from .models import PetReport, Notification
		
		lost_report = PetReport.objects.filter(id=lost_report_id).first()
		found_report = PetReport.objects.filter(id=found_report_id).first()
		
		if lost_report and found_report:
			# Mark both reports as resolved
			lost_report.is_resolved = True
			lost_report.report_status = 'reunited'
			lost_report.save()
			
			found_report.is_resolved = True
			found_report.report_status = 'reunited'
			found_report.save()
			
			# Notify both users
			Notification.objects.create(
				sender=request.user,
				receiver=lost_report.user,
				message=f'Great news! Your lost pet {lost_report.pet.name} has been reunited!',
				is_read=False
			)
			
			Notification.objects.create(
				sender=request.user,
				receiver=found_report.user,
				message=f'Thank you for helping reunite {found_report.pet.name} with their owner!',
				is_read=False
			)
	
	return redirect('reunification_system')

@login_required
def user_profile(request):
	from .models import PetAdoption, PetReport
	
	# Get user's adoption requests
	adoptions = PetAdoption.objects.filter(user=request.user)
	
	# Get user's pet reports
	reports = PetReport.objects.filter(user=request.user)
	
	context = {
		'user': request.user,
		'adoptions': adoptions,
		'reports': reports
	}
	return JsonResponse(context)

@login_required
@csrf_exempt
def update_profile(request):
	if request.method == 'POST':
		user = request.user
		user.first_name = request.POST.get('first_name', user.first_name)
		user.last_name = request.POST.get('last_name', user.last_name)
		user.email = request.POST.get('email', user.email)
		user.phone_no = request.POST.get('phone_no', user.phone_no)
		user.address = request.POST.get('address', user.address)
		user.pincode = request.POST.get('pincode', user.pincode)
		user.gender = request.POST.get('gender', user.gender)
		user.city = request.POST.get('city', user.city)
		user.state = request.POST.get('state', user.state)
		
		if request.FILES.get('profile_picture'):
			user.profile_picture = request.FILES.get('profile_picture')
		
		user.save()
		return redirect('user_profile')
	
	return redirect('user_profile')

@csrf_exempt
@require_http_methods(["PATCH", "POST"])
def api_update_profile(request):
	"""
	API endpoint to update user profile
	PATCH/POST /api/profile/update/
	Headers: Authorization: Bearer <user_token>
	"""
	try:
		# Import JWT authentication
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		# Authenticate the request
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			
			user, token = user_auth_tuple
			request.user = user
			
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Parse JSON data
		if request.content_type == 'application/json':
			data = json.loads(request.body)
		else:
			data = request.POST.dict()
		
		# Update user profile fields
		if 'first_name' in data:
			user.first_name = data['first_name']
		if 'last_name' in data:
			user.last_name = data['last_name']
		if 'email' in data:
			user.email = data['email']
		if 'phone_no' in data:
			user.phone_no = data['phone_no']
		if 'address' in data:
			user.address = data['address']
		if 'city' in data:
			user.city = data['city']
		if 'state' in data:
			user.state = data['state']
		if 'pincode' in data:
			user.pincode = data['pincode']
		if 'gender' in data:
			user.gender = data['gender']
		
		# Handle file upload
		if 'profile_picture' in request.FILES:
			user.profile_picture = request.FILES['profile_picture']
		
		user.save()
		
		return JsonResponse({
			'success': True,
			'message': 'Profile updated successfully.',
			'user': {
				'id': user.id,
				'username': user.username,
				'email': user.email,
				'first_name': user.first_name,
				'last_name': user.last_name,
				'phone_no': user.phone_no,
				'address': user.address,
				'city': user.city,
				'state': user.state,
				'pincode': user.pincode,
				'gender': user.gender
			}
		})
		
	except json.JSONDecodeError:
		return JsonResponse({
			'success': False,
			'error': 'Invalid JSON data'
		}, status=400)
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

@login_required
def adoption_history(request):
	from .models import PetAdoption
	adoptions = PetAdoption.objects.filter(user=request.user).order_by('-id')
	context = {'adoptions': adoptions}
	return JsonResponse(context)

@login_required
def pet_reports_history(request):
	from .models import PetReport
	reports = PetReport.objects.filter(user=request.user).order_by('-id')
	context = {'reports': reports}
	return JsonResponse(context)

@login_required
@csrf_exempt
def cancel_adoption_request(request, adoption_id):
	from .models import PetAdoption
	adoption = PetAdoption.objects.filter(id=adoption_id, user=request.user, status='pending').first()
	if adoption:
		adoption.status = 'cancelled'
		adoption.save()
	return redirect('adoption_history')

@login_required
def get_user_notifications(request):
	from .models import Notification
	notifications = Notification.objects.filter(receiver=request.user).order_by('-id')[:20]
	context = {'notifications': notifications}
	return JsonResponse(context)

@login_required
@csrf_exempt
def mark_all_notifications_read(request):
	from .models import Notification
	Notification.objects.filter(receiver=request.user, is_read=False).update(is_read=True)
	return redirect('get_user_notifications')

@login_required
def get_unread_notifications_count(request):
	from .models import Notification
	from django.http import JsonResponse
	count = Notification.objects.filter(receiver=request.user, is_read=False).count()
	return JsonResponse({'count': count})

@login_required
@csrf_exempt
def delete_notification(request, notification_id):
	from .models import Notification
	notification = Notification.objects.filter(id=notification_id, receiver=request.user).first()
	if notification:
		notification.delete()
	return redirect('get_user_notifications')

# Helper function to create notifications
def create_notification(sender, receiver, message):
	from .models import Notification
	Notification.objects.create(
		sender=sender,
		receiver=receiver,
		message=message,
		is_read=False
	)

# Enhanced notification when adoption is requested
@login_required
@csrf_exempt
def request_adoption_enhanced(request):
	if request.method == 'POST':
		pet_id = request.POST.get('pet_id')
		from .models import Pet, PetAdoption, User
		pet = Pet.objects.filter(id=pet_id).first()
		if pet:
			# Prevent duplicate requests for same pet by same user
			existing = PetAdoption.objects.filter(user=request.user, pet=pet).first()
			if not existing:
				adoption = PetAdoption.objects.create(user=request.user, pet=pet, status='pending')
				
				# Notify all admins
				admins = User.objects.filter(role='admin')
				for admin in admins:
					create_notification(request.user, admin, f"New adoption request for {pet.name} by {request.user.username}")
				
				# Notify user (system notification - we can use admin as sender or create a system user)
				# For now, let's create a system notification using the first admin as sender
				admin = User.objects.filter(role='admin').first()
				if admin:
					create_notification(admin, request.user, f"Your adoption request for {pet.name} has been submitted successfully")
		
		return redirect('dashboard')
	return redirect('dashboard')

# API Views for mobile/frontend integration
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_search_pets(request):
	from .models import Pet
	from .serializers import PetSerializer
	from django.db import models
	
	query = request.GET.get('q', '')
	breed = request.GET.get('breed', '')
	location = request.GET.get('location', '')
	pet_type = request.GET.get('type', '')
	
	pets = Pet.objects.all()
	
	if query:
		pets = pets.filter(
			models.Q(name__icontains=query) |
			models.Q(description__icontains=query) |
			models.Q(breed__icontains=query)
		)
	
	if breed:
		pets = pets.filter(breed__icontains=breed)
	
	if location:
		pets = pets.filter(
			models.Q(location__icontains=location) |
			models.Q(city__icontains=location) |
			models.Q(state__icontains=location)
		)
	
	if pet_type:
		pets = pets.filter(type__icontains=pet_type)
	
	serializer = PetSerializer(pets, many=True)
	return Response(serializer.data)

@csrf_exempt
@require_http_methods(["GET"])
def api_user_notifications(request):
	"""
	API endpoint for users to get their notifications
	GET /api/user_notifications/
	Headers: Authorization: Bearer <user_token>
	"""
	try:
		# Import JWT authentication
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		# Authenticate the request
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			
			user, token = user_auth_tuple
			request.user = user  # Set the authenticated user
			
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Get user notifications
		notifications = Notification.objects.filter(
			receiver=request.user
		).order_by('-created_at')[:20]
		
		notifications_data = []
		for notification in notifications:
			notification_item = {
				'id': notification.id,
				'message': notification.message,
				'is_read': notification.is_read,
				'created_at': notification.created_at.isoformat(),
				'sender': notification.sender.username if notification.sender else None,
				'pet_info': None
			}
			
			# If notification has a related pet, include pet details
			if notification.pet:
				notification_item['pet_info'] = {
					'id': notification.pet.id,
					'name': notification.pet.name,
					'breed': notification.pet.breed,
					'type': notification.pet.type,
					'status': notification.pet.status
				}
			
			notifications_data.append(notification_item)
		
		return JsonResponse({
			'success': True,
			'notifications': notifications_data,
			'count': len(notifications_data),
			'user': request.user.username
		})
		
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_mark_notification_read(request, notification_id):
	from .models import Notification
	notification = Notification.objects.filter(id=notification_id, receiver=request.user).first()
	if notification:
		notification.is_read = True
		notification.save()
		return Response({'status': 'success'})
	return Response({'status': 'not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_user_adoptions(request):
	from .models import PetAdoption
	from .serializers import PetAdoptionSerializer
	adoptions = PetAdoption.objects.filter(user=request.user)
	serializer = PetAdoptionSerializer(adoptions, many=True)
	return Response(serializer.data)

@csrf_exempt
@require_http_methods(["GET"])
def api_user_reports(request):
	"""
	API endpoint for users to get their pet reports
	GET /api/user_reports/
	Headers: Authorization: Bearer <user_token>
	"""
	try:
		# Import JWT authentication
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		# Authenticate the request
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			
			user, token = user_auth_tuple
			request.user = user
			
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Get user reports
		reports = PetReport.objects.filter(user=request.user).select_related('pet')
		
		reports_data = []
		for report in reports:
			report_item = {
				'id': report.id,
				'pet_id': report.pet.id,  # Add pet_id for detail modal
				'pet_name': report.pet.name,
				'animal_type': report.pet.type.upper(),
				'pet_breed': report.pet.breed,
				'pet_age': report.pet.age,
				'pet_colour': report.pet.colour,
				'pet_location': report.pet.location,
				'pet_state': report.pet.state,
				'pet_city': report.pet.city,
				'status': report.report_status.upper(),  # PENDING, ACCEPTED, REJECTED
				'report_type': report.status.upper(),    # LOST, FOUND
				'description': report.description or report.pet.description,
				'created_at': report.created_at.isoformat(),
				'updated_at': report.updated_at.isoformat(),
				'photo': request.build_absolute_uri(report.pet.image.url) if report.pet.image else None
			}
			reports_data.append(report_item)
		
		# Separate into lost and found reports
		lost_reports = [r for r in reports_data if r['report_type'] == 'LOST']
		found_reports = [r for r in reports_data if r['report_type'] == 'FOUND']
		
		return JsonResponse({
			'success': True,
			'reports': {
				'lost': lost_reports,
				'found': found_reports,
				'all': reports_data
			},
			'total_count': len(reports_data),
			'lost_count': len(lost_reports),
			'found_count': len(found_reports),
			'user': request.user.username
		})
		
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

# API Views Only - Template-based views removed for React frontend
from rest_framework import generics, permissions
from .models import Pet, User
from .serializers import PetSerializer, UserSerializer
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

# API Views (unchanged)
class PetCreateView(generics.CreateAPIView):
	queryset = Pet.objects.all()
	serializer_class = PetSerializer
	permission_classes = [permissions.IsAuthenticated]

class PetListView(generics.ListAPIView):
	queryset = Pet.objects.all()
	serializer_class = PetSerializer
	permission_classes = [permissions.IsAuthenticated]

class PetDetailView(generics.RetrieveUpdateDestroyAPIView):
	queryset = Pet.objects.all()
	serializer_class = PetSerializer
	permission_classes = [permissions.IsAuthenticated]

class UserRegistrationView(generics.CreateAPIView):
	"""
	API 1: Enhanced User Registration (Mentor's Requirements)
	POST /api/register/
	
	Accepts: name, email, phone, address, password
	Admin users should be created via: python manage.py createsuperuser
	"""
	queryset = User.objects.all()
	serializer_class = UserSerializer
	permission_classes = [permissions.AllowAny]
	
	def post(self, request, *args, **kwargs):
		try:
			data = request.data
			
			# Extract data fields as per mentor requirements
			name = data.get('name', '')
			email = data.get('email', '')
			phone = data.get('phone', '')
			address = data.get('address', '')
			password = data.get('password', '')
			username = data.get('username', email)  # Use email as username if not provided
			
			# Validation
			if not email:
				return Response({
					'success': False,
					'error': 'Email is required'
				}, status=400)
			
			if not password:
				return Response({
					'success': False,
					'error': 'Password is required'
				}, status=400)
			
			# Check if user already exists
			if User.objects.filter(email=email).exists():
				return Response({
					'success': False,
					'error': 'User with this email already exists'
				}, status=400)
			
			if User.objects.filter(username=username).exists():
				return Response({
					'success': False,
					'error': 'Username already exists'
				}, status=400)
			
			# Split name into first and last name
			name_parts = name.split(' ', 1) if name else ['', '']
			first_name = name_parts[0] if len(name_parts) > 0 else ''
			last_name = name_parts[1] if len(name_parts) > 1 else ''
			
			# Create user with all required fields
			user = User.objects.create_user(
				username=username,
				email=email,
				password=password,
				first_name=first_name,
				last_name=last_name,
				phone_no=phone,  # Use the correct field name from model
				address=address,
				role='user'  # Default role is user, admin created via createsuperuser
			)
			
			# Generate JWT token for immediate login
			from rest_framework_simplejwt.tokens import RefreshToken
			refresh = RefreshToken.for_user(user)
			
			return Response({
				'success': True,
				'message': 'User registered successfully',
				'user': {
					'id': user.id,
					'name': f"{user.first_name} {user.last_name}".strip() or user.username,
					'username': user.username,
					'email': user.email,
					'phone': user.phone_no,
					'address': user.address,
					'role': user.role,
					'created_on': user.date_joined.isoformat()
				},
				'tokens': {
					'access': str(refresh.access_token),
					'refresh': str(refresh)
				}
			}, status=201)
			
		except Exception as e:
			return Response({
				'success': False,
				'error': f'Registration failed: {str(e)}'
			}, status=500)

class UserLoginView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		from rest_framework_simplejwt.tokens import RefreshToken
		from .serializers import UserSerializer
		
		try:
			username = request.data.get('username')
			password = request.data.get('password')
			
			if not username or not password:
				return Response({'error': 'Username and password are required'}, status=400)
			
			user = authenticate(username=username, password=password)
			
			if user:
				refresh = RefreshToken.for_user(user)
				user_data = UserSerializer(user).data
				
				response_data = {
					'message': 'Login successful',
					'user': user_data,
					'access': str(refresh.access_token),
					'refresh': str(refresh),
				}
				return Response(response_data)
			else:
				return Response({'error': 'Invalid credentials'}, status=400)
				
		except Exception as e:
			return Response({'error': f'Login failed: {str(e)}'}, status=500)

class UserDashboardAPIView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		from .serializers import UserSerializer, PetSerializer, PetAdoptionSerializer, PetReportSerializer, NotificationSerializer
		
		user = request.user
		context = {'user': UserSerializer(user).data}
		
		if user.role == 'admin':
			# Admin dashboard data
			pending_adoptions = PetAdoption.objects.filter(status='pending').order_by('-created_at')
			pending_reports = PetReport.objects.filter(report_status='pending').order_by('-created_at')
			admin_notifications = Notification.objects.filter(receiver=user).order_by('-created_at')[:10]
			
			context['pending_adoptions'] = PetAdoptionSerializer(pending_adoptions, many=True).data
			context['pending_reports'] = PetReportSerializer(pending_reports, many=True).data
			context['admin_notifications'] = NotificationSerializer(admin_notifications, many=True).data
			
		elif user.role == 'user':
			# User dashboard data
			available_pets = Pet.objects.filter(status='available').order_by('-id')
			lost_pet_reports = PetReport.objects.filter(status='lost').order_by('-created_at')
			user_lost_reports = PetReport.objects.filter(user=user, status='lost').order_by('-created_at')
			user_rescue_reports = PetReport.objects.filter(user=user, status='rescue').order_by('-created_at')
			
			context['available_pets'] = PetSerializer(available_pets, many=True).data
			context['all_lost_reports'] = PetReportSerializer(lost_pet_reports, many=True).data
			context['user_lost_reports'] = PetReportSerializer(user_lost_reports, many=True).data
			context['user_rescue_reports'] = PetReportSerializer(user_rescue_reports, many=True).data
			
		return Response(context)

# =================== MENTOR'S REQUIRED APIs ===================

@csrf_exempt
@require_http_methods(["GET"])
def user_details_by_token(request):
	"""
	API 2: Get logged-in user details by token
	GET /api/user-details/
	Headers: Authorization: Bearer <token>
	"""
	try:
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			user, token = user_auth_tuple
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Return comprehensive user details
		user_data = {
			'id': user.id,
			'name': f"{user.first_name} {user.last_name}".strip() or user.username,
			'username': user.username,
			'email': user.email,
			'first_name': user.first_name,
			'last_name': user.last_name,
			'phone_no': getattr(user, 'phone_no', ''),
			'address': getattr(user, 'address', ''),
			'city': getattr(user, 'city', ''),
			'state': getattr(user, 'state', ''),
			'pincode': getattr(user, 'pincode', ''),
			'gender': getattr(user, 'gender', ''),
			'role': user.role,
			'is_active': user.is_active,
			'is_superuser': user.is_superuser,
			'is_staff': user.is_staff,
			'created_on': user.date_joined.isoformat(),
			'last_login': user.last_login.isoformat() if user.last_login else None,
			'profile_picture': user.profile_picture.url if hasattr(user, 'profile_picture') and user.profile_picture else None
		}
		
		return JsonResponse({
			'success': True,
			'user': user_data
		})
		
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_by_id(request, user_id):
	"""
	Get user details by ID (Admin/Superuser only)
	GET /api/user/{user_id}/
	Headers: Authorization: Bearer <token>
	"""
	try:
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			current_user, token = user_auth_tuple
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Check if user has admin or superuser privileges
		if not (current_user.role == 'admin' or current_user.is_superuser):
			return JsonResponse({
				'success': False,
				'error': 'Admin or superuser access required.'
			}, status=403)
		
		# Get the requested user
		try:
			user = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return JsonResponse({
				'success': False,
				'error': f'User with ID {user_id} not found.'
			}, status=404)
		
		# Return comprehensive user details
		user_data = {
			'id': user.id,
			'username': user.username,
			'email': user.email,
			'first_name': user.first_name,
			'last_name': user.last_name,
			'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
			'phone_no': user.phone_no,
			'address': user.address,
			'city': user.city,
			'state': user.state,
			'pincode': user.pincode,
			'gender': user.gender,
			'role': user.role,
			'is_active': user.is_active,
			'is_superuser': user.is_superuser,
			'is_staff': user.is_staff,
			'date_joined': user.date_joined.isoformat(),
			'last_login': user.last_login.isoformat() if user.last_login else None,
			'profile_picture': user.profile_picture.url if user.profile_picture else None,
			'date': user.date.isoformat() if user.date else None
		}
		
		return JsonResponse({
			'success': True,
			'user': user_data,
			'requested_by': current_user.username,
			'access_level': 'SUPERUSER' if current_user.is_superuser else 'ADMIN'
		})
		
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

# ----------------------------------------
# 2.4 UNIFIED PET REQUEST API (MAIN MILESTONE 2 ENDPOINT)
# ----------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
def pet_request_form_api(request):
	"""
	MILESTONE 2: MAIN UNIFIED API ENDPOINT
	API 3: Lost/Found/Adopt Pet Request Flow (Enhanced)
	POST /api/pet/pet-request-form
	Headers: Authorization: Bearer <token>
	
	Advanced Features:
	- Saves data in Pet, PetMedicalHistory, PetReport tables
	- Creates admin notifications
	- Uses database transactions for data integrity
	- Enhanced error handling and validation
	"""
	print("="*80)
	print("DEBUG: pet_request_form_api called!")
	print(f"DEBUG: Request method: {request.method}")
	print(f"DEBUG: Content-Type: {request.content_type}")
	print("="*80)
	
	try:
		# Import JWT authentication
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		# Authenticate the request
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			
			user, token = user_auth_tuple
			request.user = user  # Set the authenticated user
			
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Handle both JSON and multipart/form-data requests
		if request.content_type and 'multipart/form-data' in request.content_type:
			data = request.POST.dict()
			# Handle uploaded files
			uploaded_file = request.FILES.get('pet_image')
			print(f"DEBUG: Content-Type is multipart/form-data")
			print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}")
			print(f"DEBUG: uploaded_file: {uploaded_file}")
		elif request.content_type == 'application/json':
			data = json.loads(request.body)
			uploaded_file = None
			print(f"DEBUG: Content-Type is application/json (no file upload)")
		else:
			data = request.POST.dict()
			uploaded_file = request.FILES.get('pet_image')
			print(f"DEBUG: Content-Type is other: {request.content_type}")
			print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}")
			print(f"DEBUG: uploaded_file: {uploaded_file}")
		
		user = request.user
		
		# Use database transaction to ensure all data is saved together
		from django.db import transaction
		
		# Helper function to convert string boolean to actual boolean
		def str_to_bool(value):
			if isinstance(value, bool):
				return value
			if isinstance(value, str):
				return value.lower() in ('true', '1', 'yes')
			return bool(value)
		
		# Helper function to safely convert to int
		def safe_int(value, default=0):
			if value is None or value == '':
				return default
			try:
				return int(value)
			except (ValueError, TypeError):
				return default
		
		# Helper function to safely convert to float
		def safe_float(value, default=0.0):
			if value is None or value == '':
				return default
			try:
				return float(value)
			except (ValueError, TypeError):
				return default
		
		with transaction.atomic():
			# 1. Create Pet record (only using fields that exist in Pet model)
			# Get the pet_status from form data to determine if it's lost or found
			pet_status_from_form = data.get('pet_status', 'lost')
			print(f"DEBUG: pet_status from form: {pet_status_from_form}")
			
			pet_data = {
				'name': data.get('pet_name', data.get('name', '')),
				'type': data.get('pet_type', data.get('type', 'Dog')),
				'breed': data.get('pet_breed', data.get('breed', '')),
				'age': safe_int(data.get('pet_age', data.get('age', ''))),
				'colour': data.get('pet_colour', data.get('color', '')),
				'weight': safe_float(data.get('pet_weight', data.get('weight', ''))),
				'description': data.get('description', ''),
				'status': pet_status_from_form,  # Use status from form (lost/found)
				'gender': data.get('pet_gender', data.get('gender', '')),
				'location': data.get('pet_location', data.get('location', '')),
				'state': data.get('pet_state', data.get('state', '')),
				'city': data.get('pet_city', data.get('city', '')),
				'date': data.get('pet_date', timezone.now().date()),
				'is_vaccinated': str_to_bool(data.get('is_vaccinated', False)),
				'is_diseased': str_to_bool(data.get('is_diseased', False))
			}
			
			# Add image file if uploaded
			if uploaded_file:
				print(f"DEBUG: Adding image to pet_data: {uploaded_file.name if hasattr(uploaded_file, 'name') else uploaded_file}")
				pet_data['image'] = uploaded_file  # Changed from 'photo' to 'image' to match Pet model
			else:
				print(f"DEBUG: No uploaded_file found - pet will have no image")
			
			pet = Pet.objects.create(**pet_data)
			print(f"DEBUG: Pet created with ID: {pet.id}, image: {pet.image}")
			
			# 2. Create PetMedicalHistory record (only using fields that exist in model)
			medical_data = {
				'pet': pet,
				'vaccine_name': data.get('vaccination_details', ''),
				'last_vaccinated_date': data.get('last_vaccinated_date', None),
				'disease_name': data.get('health_conditions', ''),
				'stage': data.get('disease_stage', ''),
				'treatment_name': data.get('treatment_name', ''),
				'no_of_years': int(data.get('treatment_years', 0)) if data.get('treatment_years') else 0
			}
			
			medical_history = PetMedicalHistory.objects.create(**medical_data)
			
			# 3. Create PetReport record
			report_type = 'lost' if data.get('pet_status') == 'lost' else 'found' if data.get('pet_status') == 'found' else 'adopt'
			
			report_data = {
				'pet': pet,
				'user': user,  # Changed from 'reporter' to 'user' to match model
				'status': report_type,  # Changed from 'report_type' to 'status' to match model
				'description': data.get('description', ''),
				'report_status': 'pending',  # Use the correct field name
			}
			
			report = PetReport.objects.create(**report_data)
			
		# 4. Create Notification for ALL Admin users (role='admin', is_staff, or is_superuser)
		notification_message = f"New {report_type} pet request: {pet.name} ({pet.breed}) reported by {user.username}"
		
		# Get all admin users using unified query
		from django.db import models as db_models
		admin_users = User.objects.filter(
			db_models.Q(role='admin') | db_models.Q(is_staff=True) | db_models.Q(is_superuser=True)
		).distinct()
		
		print(f"DEBUG pet_request_form_api: Found {admin_users.count()} admin users:", list(admin_users.values_list('username', 'role', 'is_staff', 'is_superuser')))
		
		notification_id = None
		for admin in admin_users:
			print(f"DEBUG: Creating notification for admin: {admin.username}")
			notification = Notification.objects.create(
				sender=user,
				receiver=admin,
				message=notification_message,
				pet=pet,
				is_read=False
			)
			print(f"DEBUG: Notification created with ID: {notification.id}")
			if not notification_id:  # Store first notification ID for response
				notification_id = notification.id		# Success response in mentor's requested format
		return JsonResponse({
			'success': True,
			'message': f'{report_type.title()} pet request submitted successfully',
			'pet_id': pet.id,
			'medical_history_id': medical_history.id,
			'report_id': report.id,
			'notification_id': notification_id,
			'pet_status': pet.status,
			'reporter': user.username,
			'timestamp': timezone.now().isoformat()
		})
		
	except json.JSONDecodeError:
		return JsonResponse({
			'success': False,
			'error': 'Invalid JSON data'
		}, status=400)
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def admin_notifications_api(request):
	"""
	API 4: Get Notifications for Admin
	GET /api/admin/notifications/
	Headers: Authorization: Bearer <admin_token>
	"""
	try:
		# Import JWT authentication
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		# Authenticate the request
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			
			user, token = user_auth_tuple
			request.user = user  # Set the authenticated user
			
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Check if user is admin (role='admin', is_staff, or is_superuser)
		from django.db import models as db_models
		is_admin = (
			getattr(request.user, 'role', None) == 'admin' or
			getattr(request.user, 'is_staff', False) or 
			getattr(request.user, 'is_superuser', False)
		)
		
		print(f"DEBUG admin_notifications_api: User {request.user.username} - role={getattr(request.user, 'role', None)}, is_staff={getattr(request.user, 'is_staff', False)}, is_superuser={getattr(request.user, 'is_superuser', False)}, is_admin={is_admin}")
		
		if not is_admin:
			return JsonResponse({
				'success': False,
				'error': 'Admin access required.'
			}, status=403)
		
		# Get all notifications for this admin user
		notifications = Notification.objects.filter(
			receiver=request.user  # Changed from 'user' to 'receiver'
		).order_by('-created_at')
		
		print(f"DEBUG admin_notifications_api: Found {notifications.count()} notifications for user {request.user.username}")
		
		notifications_data = []
		for notification in notifications:
			notification_item = {
				'id': notification.id,
				'message': notification.message,  # Only use existing fields
				'is_read': notification.is_read,
				'created_at': notification.created_at.isoformat(),
				'pet_info': None,
				'sender': notification.sender.username if notification.sender else None,
				'report_id': None  # Add report_id field
			}
			
			# If notification has a related pet, include pet details and find report_id
			if notification.pet:
				# Find the PetReport associated with this pet and sender
				try:
					pet_report = PetReport.objects.filter(
						pet=notification.pet,
						user=notification.sender
					).first()
					
					notification_item['pet_info'] = {
						'id': notification.pet.id,
						'name': notification.pet.name,
						'breed': notification.pet.breed,
						'type': notification.pet.type,
						'age': notification.pet.age,
						'color': notification.pet.colour,  # Note: model uses 'colour'
						'status': notification.pet.status,
						'report_id': pet_report.id if pet_report else None
					}
					
					# Also add report_id at the root level for easy access
					notification_item['report_id'] = pet_report.id if pet_report else None
					
				except Exception as e:
					# If there's an error finding the report, still include pet info without report_id
					notification_item['pet_info'] = {
						'id': notification.pet.id,
						'name': notification.pet.name,
						'breed': notification.pet.breed,
						'type': notification.pet.type,
						'age': notification.pet.age,
						'color': notification.pet.colour,
						'status': notification.pet.status,
						'report_id': None
					}
			
			notifications_data.append(notification_item)
		
		return JsonResponse({
			'success': True,
			'notifications': notifications_data,
			'total_count': len(notifications_data),
			'unread_count': notifications.filter(is_read=False).count()
		})
		
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def pet_details_by_id(request, pet_id):
	"""
	API 5: Get Pet Details by ID
	GET /api/pet/details/<pet_id>/
	Headers: Authorization: Bearer <token>
	
	Returns full details from Pet, PetMedicalHistory, and PetReport tables
	"""
	try:
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		# Create DRF request object for JWT authentication
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({
					'success': False,
					'error': 'Authentication required. Please provide valid token.'
				}, status=401)
			user, token = user_auth_tuple
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({
				'success': False,
				'error': f'Authentication failed: {str(e)}'
			}, status=401)
		
		# Get pet with related data
		try:
			pet = Pet.objects.get(id=pet_id)
		except Pet.DoesNotExist:
			return JsonResponse({
				'success': False,
				'error': f'Pet with ID {pet_id} not found.'
			}, status=404)
		
		# Get related medical history
		try:
			medical_history = PetMedicalHistory.objects.get(pet=pet)
			medical_data = {
				'id': medical_history.id,
				'vaccine_name': medical_history.vaccine_name,
				'last_vaccinated_date': medical_history.last_vaccinated_date.isoformat() if medical_history.last_vaccinated_date else None,
				'disease_name': medical_history.disease_name,
				'stage': medical_history.stage,
				'treatment_name': medical_history.treatment_name,
				'no_of_years': medical_history.no_of_years
			}
		except PetMedicalHistory.DoesNotExist:
			medical_data = None
		
		# Get related reports
		reports = PetReport.objects.filter(pet=pet).order_by('-created_at')
		reports_data = []
		for report in reports:
			reports_data.append({
				'id': report.id,
				'status': report.status,
				'report_status': report.report_status,
				'description': report.description,
				'created_at': report.created_at.isoformat(),
				'updated_at': report.updated_at.isoformat(),
				'user_name': report.user.username,
				'user_email': report.user.email,
				'is_resolved': report.is_resolved
			})
		
		# Compile complete pet details
		pet_details = {
			'pet_info': {
				'id': pet.id,
				'name': pet.name,
				'type': pet.type,
				'breed': pet.breed,
				'age': pet.age,
				'colour': pet.colour,
				'weight': pet.weight,
				'description': pet.description,
				'status': pet.status,
				'location': pet.location,
				'city': pet.city,
				'state': pet.state,
				'gender': pet.gender,
				'is_vaccinated': pet.is_vaccinated,
				'is_diseased': pet.is_diseased,
				'image': pet.image.url if pet.image else None,
				'created_at': pet.created_at.isoformat(),
				'updated_at': pet.updated_at.isoformat()
			},
			'medical_history': medical_data,
			'reports': reports_data,
			'total_reports': len(reports_data)
		}
		
		return JsonResponse({
			'success': True,
			'pet_details': pet_details
		})
		
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def unified_pet_request(request):
	"""
	Unified API endpoint for all pet-related requests
	Handles: lost pets, found pets, adoption requests, rescue reports
	"""
	try:
		if request.content_type == 'application/json':
			data = json.loads(request.body)
		else:
			data = request.POST.dict()
		
		request_type = data.get('request_type')
		
		if not request_type:
			return JsonResponse({
				'success': False,
				'error': 'request_type is required'
			}, status=400)
		
		# Get or create user (for testing without authentication)
		if request.user.is_authenticated:
			user = request.user
		else:
			# For testing purposes, create/get a default user
			user, created = User.objects.get_or_create(
				username=data.get('reporter_name', 'anonymous_user'),
				defaults={
					'email': data.get('reporter_email', 'test@example.com'),
					'first_name': data.get('reporter_name', 'Anonymous'),
					'role': 'user'
				}
			)
		
		success_message = ""
		
		if request_type == 'lost_pet':
			# Handle lost pet report
			pet_data = {
				'name': data.get('pet_name', ''),
				'type': data.get('pet_type', ''),
				'breed': data.get('pet_breed', ''),
				'age': data.get('pet_age', 0),
				'weight': data.get('pet_weight', ''),
				'description': data.get('pet_description', ''),
				'last_seen_location': data.get('last_seen_location', ''),
				'last_seen_date': data.get('last_seen_date', timezone.now().date()),
				'contact_phone': data.get('contact_phone', ''),
				'contact_email': data.get('contact_email', user.email),
				'reported_by': user,
				'status': 'lost'
			}
			
			pet = Pet.objects.create(**pet_data)
			
			# Create pet report
			report = PetReport.objects.create(
				pet=pet,
				user=user,
				status='lost',
				description=data.get('pet_description', '')
			)
			
			success_message = "Lost pet report submitted successfully!"
			
		elif request_type == 'found_pet':
			# Handle found pet report
			pet_data = {
				'name': data.get('pet_name', 'Unknown'),
				'type': data.get('pet_type', ''),
				'breed': data.get('pet_breed', ''),
				'age': data.get('pet_age', 0),
				'weight': data.get('pet_weight', ''),
				'description': data.get('pet_description', ''),
				'last_seen_location': data.get('found_location', ''),
				'contact_phone': data.get('contact_phone', ''),
				'contact_email': data.get('contact_email', user.email),
				'reported_by': user,
				'status': 'found'
			}
			
			pet = Pet.objects.create(**pet_data)
			
			# Create pet report
			report = PetReport.objects.create(
				pet=pet,
				user=user,
				status='found',
				description=data.get('pet_description', '')
			)
			
			success_message = "Found pet report submitted successfully!"
			
		elif request_type == 'adoption_request':
			# Handle adoption request
			pet_id = data.get('pet_id')
			if not pet_id:
				return JsonResponse({
					'success': False,
					'error': 'pet_id is required for adoption requests'
				}, status=400)
			
			try:
				pet = Pet.objects.get(id=pet_id, status='available')
			except Pet.DoesNotExist:
				return JsonResponse({
					'success': False,
					'error': 'Pet not found or not available for adoption'
				}, status=404)
			
			# Check if user already has pending adoption for this pet
			existing_adoption = PetAdoption.objects.filter(
				pet=pet,
				adopter=user,
				status='pending'
			).first()
			
			if existing_adoption:
				return JsonResponse({
					'success': False,
					'error': 'You already have a pending adoption request for this pet'
				}, status=400)
			
			adoption = PetAdoption.objects.create(
				pet=pet,
				adopter=user,
				adoption_reason=data.get('adoption_reason', ''),
				living_situation=data.get('living_situation', ''),
				experience_with_pets=data.get('experience_with_pets', ''),
				status='pending',
				request_date=timezone.now()
			)
			
			success_message = "Successfully placed adoption pet request!"
			
		elif request_type == 'rescue_request':
			# Handle rescue request
			pet_data = {
				'name': data.get('pet_name', 'Rescue Pet'),
				'type': data.get('pet_type', ''),
				'breed': data.get('pet_breed', 'Unknown'),
				'description': data.get('pet_description', ''),
				'last_seen_location': data.get('rescue_location', ''),
				'contact_phone': data.get('contact_phone', ''),
				'contact_email': data.get('contact_email', user.email),
				'reported_by': user,
				'status': 'rescue_needed'
			}
			
			pet = Pet.objects.create(**pet_data)
			
			# Create pet report for rescue
			report = PetReport.objects.create(
				pet=pet,
				user=user,
				status='adopt',
				description=data.get('pet_description', '')
			)
			
			success_message = "Rescue request submitted successfully!"
			
		else:
			return JsonResponse({
				'success': False,
				'error': f'Invalid request_type: {request_type}. Valid types: lost_pet, found_pet, adoption_request, rescue_request'
			}, status=400)
		
		return JsonResponse({
			'success': True,
			'message': success_message,
			'request_type': request_type,
			'user_id': user.id,
			'timestamp': timezone.now().isoformat()
		})
		
	except json.JSONDecodeError:
		return JsonResponse({
			'success': False,
			'error': 'Invalid JSON data'
		}, status=400)
	except Exception as e:
		return JsonResponse({
			'success': False,
			'error': f'Server error: {str(e)}'
		}, status=500)


# ==============================================================================
# 📱 NEW API ENDPOINTS FOR ENHANCED FUNCTIONALITY  
# ==============================================================================

@csrf_exempt
@require_http_methods(["PATCH"])
def mark_all_notifications_read_api(request):
	"""Mark all notifications as read for the authenticated user"""
	try:
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({'success': False, 'error': 'Authentication required.'}, status=401)
			user, token = user_auth_tuple
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({'success': False, 'error': f'Authentication failed: {str(e)}'}, status=401)
		
		# Mark all notifications as read for this user
		Notification.objects.filter(receiver=user, is_read=False).update(is_read=True)
		
		return JsonResponse({'success': True, 'message': 'All notifications marked as read'})
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_notification_api(request, notification_id):
	"""Delete a specific notification"""
	try:
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({'success': False, 'error': 'Authentication required.'}, status=401)
			user, token = user_auth_tuple
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({'success': False, 'error': f'Authentication failed: {str(e)}'}, status=401)
		
		try:
			notification = Notification.objects.get(id=notification_id, receiver=user)
			notification.delete()
			return JsonResponse({'success': True, 'message': 'Notification deleted successfully'})
		except Notification.DoesNotExist:
			return JsonResponse({'success': False, 'error': 'Notification not found'}, status=404)
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_report_api(request, report_id):
	"""Delete a user's pet report"""
	try:
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({'success': False, 'error': 'Authentication required.'}, status=401)
			user, token = user_auth_tuple
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({'success': False, 'error': f'Authentication failed: {str(e)}'}, status=401)
		
		try:
			report = PetReport.objects.get(id=report_id, user=user)
			report.delete()
			return JsonResponse({'success': True, 'message': 'Report deleted successfully'})
		except PetReport.DoesNotExist:
			return JsonResponse({'success': False, 'error': 'Report not found or access denied'}, status=404)
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["PATCH"])
def update_report_status_api(request, report_id):
	"""Update status of a user's pet report"""
	try:
		from rest_framework_simplejwt.authentication import JWTAuthentication
		from rest_framework.request import Request
		from rest_framework import exceptions
		
		drf_request = Request(request)
		jwt_auth = JWTAuthentication()
		
		try:
			user_auth_tuple = jwt_auth.authenticate(drf_request)
			if user_auth_tuple is None:
				return JsonResponse({'success': False, 'error': 'Authentication required.'}, status=401)
			user, token = user_auth_tuple
		except exceptions.AuthenticationFailed as e:
			return JsonResponse({'success': False, 'error': f'Authentication failed: {str(e)}'}, status=401)
		
		data = json.loads(request.body)
		new_status = data.get('status')
		
		if new_status not in ['FOUND', 'REUNITED']:
			return JsonResponse({'success': False, 'error': 'Invalid status. Must be FOUND or REUNITED'}, status=400)
		
		try:
			report = PetReport.objects.get(id=report_id, user=user)
			report.status = new_status.lower()
			report.save()
			return JsonResponse({'success': True, 'message': f'Report status updated to {new_status}'})
		except PetReport.DoesNotExist:
			return JsonResponse({'success': False, 'error': 'Report not found or access denied'}, status=404)
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@csrf_exempt  
@require_http_methods(["GET"])
def api_all_lost_reports(request):
	"""Get all APPROVED lost pet reports from all users (public view)"""
	try:
		# Make this endpoint public for community lost pet viewing
		# No authentication required for viewing lost pets
		
		# Get all APPROVED lost pet reports from all users (not pending, found, or reunited)
		lost_reports = PetReport.objects.filter(
			status='lost',
			report_status='accepted'  # Only show approved reports
		).select_related('pet', 'user')
		
		reports_data = []
		for report in lost_reports:
			pet = report.pet
			reports_data.append({
				'id': report.id,
				'pet_id': pet.id,  # Add pet_id for detail view
				'pet_name': pet.name,
				'animal_type': pet.type,
				'pet_breed': pet.breed,
				'pet_location': pet.location,
				'description': pet.description,
				'status': report.status.upper(),
				'report_status': report.report_status.upper(),
				'created_at': report.created_at.isoformat(),
				'photo': pet.image.url if pet.image else None,
				'owner_username': report.user.username,
				'contact_info': True,
				'report_type': 'LOST'
			})
		
		return JsonResponse({
			'success': True,
			'reports': reports_data,
			'total_count': len(reports_data)
		})
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


# Test endpoint for superuser access verification
@api_view(['GET'])
def test_superuser_access(request):
	"""Test endpoint to verify superuser access and permissions"""
	if not request.user.is_authenticated:
		return Response({'error': 'Authentication required'}, status=401)
	
	user_info = {
		'username': request.user.username,
		'is_superuser': request.user.is_superuser,
		'is_staff': request.user.is_staff,
		'role': getattr(request.user, 'role', 'No role field'),
		'permissions': {
			'can_access_admin_functions': request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role == 'admin'),
			'can_manage_all_users': request.user.is_superuser,
			'can_access_django_admin': request.user.is_staff or request.user.is_superuser,
			'full_system_access': request.user.is_superuser
		}
	}
	
	return Response({
		'message': 'Access test completed successfully',
		'user_info': user_info,
		'access_level': 'SUPERUSER' if request.user.is_superuser else ('ADMIN' if (hasattr(request.user, 'role') and request.user.role == 'admin') else 'USER'),
		'superuser_capabilities': {
			'can_access_all_admin_features': True if request.user.is_superuser else False,
			'can_view_all_user_details': True if request.user.is_superuser else False,
			'can_manage_user_roles': True if request.user.is_superuser else False,
			'can_approve_reject_requests': True if request.user.is_superuser else False,
			'has_unrestricted_access': True if request.user.is_superuser else False
		}
	})


@csrf_exempt
@require_http_methods(["GET"])
def api_available_adoption_pets(request):
	"""Get all pets available for adoption (public view)"""
	try:
		# Get all pets with status 'available' and report_status 'accepted'
		# These are pets marked by admin as available for adoption
		adoption_pets = Pet.objects.filter(
			status='available',
			reports__status='available',
			reports__report_status='accepted'
		).distinct()  # Removed .select_related('owner') - Pet has no owner field
		
		pets_data = []
		for pet in adoption_pets:
			# Get the adoption report for this pet
			adoption_report = pet.reports.filter(status='available', report_status='accepted').first()
			
			# Check if user already requested adoption for this pet
			has_pending_request = False
			if request.user.is_authenticated:
				has_pending_request = PetAdoption.objects.filter(
					pet=pet,
					user=request.user,
					status='pending'
				).exists()
			
			pets_data.append({
				'id': pet.id,
				'name': pet.name,
				'type': pet.type,
				'breed': pet.breed,
				'age': pet.age,
				'gender': pet.gender,
				'colour': pet.colour,
				'weight': pet.weight,
				'location': pet.location,
				'city': pet.city,
				'state': pet.state,
				'description': pet.description,
				'is_vaccinated': pet.is_vaccinated,
				'is_diseased': pet.is_diseased,
				'image': pet.image.url if pet.image else None,
				'created_at': pet.date.isoformat() if pet.date else None,
				'report_id': adoption_report.id if adoption_report else None,
				'has_pending_request': has_pending_request
			})
		
		return JsonResponse({
			'success': True,
			'pets': pets_data,
			'total_count': len(pets_data)
		})
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_post_pet_for_adoption(request):
	"""
	Allow users to post their own pets for adoption.
	Admin needs to accept or reject the adoption post.
	"""
	try:
		data = request.data
		user = request.user
		
		# Extract and validate pet data
		name = data.get('name', '').strip()
		pet_type = data.get('type', '').strip()
		breed = data.get('breed', '').strip()
		age = safe_int(data.get('age', ''))
		gender = data.get('gender', '').strip()
		description = data.get('description', '').strip()
		location = data.get('location', '').strip()
		
		# Medical information
		is_vaccinated = str_to_bool(data.get('is_vaccinated', 'false'))
		is_diseased = str_to_bool(data.get('is_diseased', 'false'))
		disease_description = data.get('disease_description', '').strip() if is_diseased else ''
		
		# Vaccination details
		vaccination_date = data.get('vaccination_date', '').strip() if is_vaccinated else None
		vaccination_type = data.get('vaccination_type', '').strip() if is_vaccinated else ''
		vaccination_certificate = request.FILES.get('vaccination_certificate') if is_vaccinated else None
		
		# Handle image upload from FILES
		image = request.FILES.get('image')
		
		# Debug logging
		print(f"📸 Image upload debug:")
		print(f"  - Image received: {image}")
		print(f"  - Image name: {image.name if image else 'None'}")
		print(f"  - Image size: {image.size if image else 'N/A'} bytes")
		print(f"  - All FILES keys: {list(request.FILES.keys())}")
		
		# Validation
		if not name:
			return JsonResponse({'success': False, 'error': 'Pet name is required'}, status=400)
		if not pet_type:
			return JsonResponse({'success': False, 'error': 'Pet type is required'}, status=400)
		if not gender or gender not in ['Male', 'Female']:
			return JsonResponse({'success': False, 'error': 'Valid gender is required (Male/Female)'}, status=400)
		if age is None or age < 0:
			return JsonResponse({'success': False, 'error': 'Valid age is required'}, status=400)
		if not location:
			return JsonResponse({'success': False, 'error': 'Location is required'}, status=400)
		
		# Create pet with status='adopt' (NOT 'available' since it needs admin approval)
		# Pet model doesn't have owner field, so we track via PetReport
		pet = Pet.objects.create(
			name=name,
			type=pet_type,
			breed=breed,
			age=age,
			gender=gender,
			description=description,
			location=location,
			image=image,
			is_vaccinated=is_vaccinated,
			is_diseased=is_diseased,
			status='adopt'  # Mark as adoption pet
		)
		
		# Debug: Check if image was saved
		print(f"✅ Pet created with ID: {pet.id}")
		print(f"📸 Pet image field: {pet.image}")
		print(f"📸 Pet image path: {pet.image.name if pet.image else 'None'}")
		print(f"📸 Pet image URL: {pet.image.url if pet.image else 'None'}")
		
		# Create medical history if vaccination info provided
		if is_vaccinated and (vaccination_date or vaccination_type):
			from .models import PetMedicalHistory
			PetMedicalHistory.objects.create(
				pet=pet,
				vaccine_name=vaccination_type,
				last_vaccinated_date=vaccination_date if vaccination_date else None
			)
		
		# Create medical history for disease if provided
		if is_diseased and disease_description:
			from .models import PetMedicalHistory
			PetMedicalHistory.objects.create(
				pet=pet,
				disease_name=disease_description,
				stage='Active' if is_diseased else 'None'
			)
		
		# Create a pet report with status='adopt' and report_status='pending'
		# This allows admin to review and accept/reject
		# The report links the pet to the user who posted it
		# Note: PetReport doesn't have location field - it's stored in Pet model
		pet_report = PetReport.objects.create(
			pet=pet,
			user=user,
			status='adopt',
			report_status='pending',  # Pending admin approval
			description=f"Posted for adoption: {description}" if description else "Posted for adoption"
		)
		
		# Create notification for admin about new adoption post
		try:
			admin_users = User.objects.filter(role='admin')
			for admin in admin_users:
				Notification.objects.create(
					user=admin,
					message=f"New adoption post from {user.username}: {name} ({pet_type})",
					notification_type='adoption_post',
					is_read=False
				)
		except Exception as notif_error:
			print(f"Error creating admin notification: {notif_error}")
		
		return JsonResponse({
			'success': True,
			'message': 'Pet posted for adoption successfully! Waiting for admin approval.',
			'pet': {
				'id': pet.id,
				'name': pet.name,
				'type': pet.type,
				'breed': pet.breed,
				'age': pet.age,
				'gender': pet.gender,
				'location': pet.location,
				'status': pet.status,
			},
			'report': {
				'id': pet_report.id,
				'report_status': pet_report.report_status,
			}
		}, status=201)
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_my_adoption_posts(request):
	"""
	Get all adoption posts created by the current user.
	Shows pending, accepted, and rejected posts.
	"""
	try:
		user = request.user
		
		# Get all reports where user posted pet for adoption
		reports = PetReport.objects.filter(
			user=user,
			status='adopt'
		).select_related('pet').order_by('-created_at')
		
		adoption_posts = []
		for report in reports:
			pet = report.pet
			
			# Get medical history for vaccination and disease info
			from .models import PetMedicalHistory
			medical_history = PetMedicalHistory.objects.filter(pet=pet)
			vaccination_info = medical_history.filter(vaccine_name__isnull=False).first()
			disease_info = medical_history.filter(disease_name__isnull=False).first()
			
			adoption_posts.append({
				'id': report.id,
				'pet_id': pet.id,
				'name': pet.name,
				'type': pet.type,
				'breed': pet.breed,
				'age': pet.age,
				'gender': pet.gender,
				'location': pet.location,
				'description': pet.description,
				'image': pet.image.url if pet.image else None,
				'is_vaccinated': pet.is_vaccinated,
				'is_diseased': pet.is_diseased,
				'disease_description': disease_info.disease_name if disease_info else '',
				'vaccination_info': {
					'vaccine_name': vaccination_info.vaccine_name if vaccination_info else '',
					'last_vaccinated_date': vaccination_info.last_vaccinated_date.strftime('%Y-%m-%d') if vaccination_info and vaccination_info.last_vaccinated_date else None
				} if vaccination_info else None,
				'report_status': report.report_status,  # pending, accepted, rejected
				'created_at': report.created_at.strftime('%Y-%m-%d %H:%M:%S'),
				'admin_comment': report.admin_comment if report.admin_comment else None,
			})
		
		return JsonResponse({
			'success': True,
			'adoption_posts': adoption_posts,
			'count': len(adoption_posts)
		}, status=200)
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_pending_adoption_posts(request):
	"""
	Admin only: Get all pending adoption posts for review.
	"""
	try:
		user = request.user
		
		# Check if user is admin
		if not user.is_staff:
			return JsonResponse({'success': False, 'error': 'Admin access required'}, status=403)
		
		# Get all pending adoption posts
		reports = PetReport.objects.filter(
			status='adopt',
			report_status='pending'
		).select_related('pet', 'user').order_by('-created_at')
		
		pending_posts = []
		for report in reports:
			pet = report.pet
			
			# Get medical history for vaccination and disease info
			from .models import PetMedicalHistory
			medical_history = PetMedicalHistory.objects.filter(pet=pet)
			vaccination_info = medical_history.filter(vaccine_name__isnull=False).first()
			disease_info = medical_history.filter(disease_name__isnull=False).first()
			
			pending_posts.append({
				'id': report.id,
				'pet_id': pet.id,
				'name': pet.name,
				'type': pet.type,
				'breed': pet.breed,
				'age': pet.age,
				'gender': pet.gender,
				'location': pet.location,
				'description': pet.description,
				'image': pet.image.url if pet.image else None,
				'is_vaccinated': pet.is_vaccinated,
				'is_diseased': pet.is_diseased,
				'disease_description': disease_info.disease_name if disease_info else '',
				'vaccination_date': vaccination_info.last_vaccinated_date.strftime('%Y-%m-%d') if vaccination_info and vaccination_info.last_vaccinated_date else None,
				'vaccination_type': vaccination_info.vaccine_name if vaccination_info else '',
				'report_status': report.report_status,
				'created_at': report.created_at.strftime('%Y-%m-%d %H:%M:%S'),
				'posted_by': {
					'id': report.user.id,
					'username': report.user.username,
					'email': report.user.email,
				}
			})
		
		return JsonResponse({
			'success': True,
			'pending_posts': pending_posts,
			'count': len(pending_posts)
		}, status=200)
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_review_adoption_post(request, report_id):
	"""
	Admin only: Accept or reject an adoption post.
	"""
	try:
		user = request.user
		
		# Check if user is admin
		if not user.is_staff:
			return JsonResponse({'success': False, 'error': 'Admin access required'}, status=403)
		
		data = request.data
		action = data.get('action', '').lower()  # 'accept' or 'reject'
		admin_comment = data.get('comment', '').strip()
		
		if action not in ['accept', 'reject']:
			return JsonResponse({'success': False, 'error': 'Invalid action. Use "accept" or "reject"'}, status=400)
		
		# Get the report
		try:
			report = PetReport.objects.select_related('pet', 'user').get(
				id=report_id,
				status='adopt',
				report_status='pending'
			)
		except PetReport.DoesNotExist:
			return JsonResponse({'success': False, 'error': 'Pending adoption post not found'}, status=404)
		
		# Update report status
		if action == 'accept':
			report.report_status = 'accepted'
			message = f'Adoption post for "{report.pet.name}" has been accepted'
		else:
			report.report_status = 'rejected'
			message = f'Adoption post for "{report.pet.name}" has been rejected'
		
		# Store admin comment if provided
		if admin_comment:
			report.admin_comment = admin_comment
		
		report.save()
		
		return JsonResponse({
			'success': True,
			'message': message,
			'report': {
				'id': report.id,
				'pet_name': report.pet.name,
				'report_status': report.report_status,
				'admin_comment': admin_comment,
			}
		}, status=200)
		
	except Exception as e:
		return JsonResponse({'success': False, 'error': f'Server error: {str(e)}'}, status=500)


