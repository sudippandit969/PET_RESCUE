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
        if self.request.user.role == 'admin':
            return User.objects.all()  
        else:
            return User.objects.filter(id=self.request.user.id)  
    
    def perform_create(self, serializer):
        if self.request.user.role != 'admin' and self.request.user.is_authenticated:
            # If not admin and already authenticated, deny creation of other users
            return Response({'error': 'Only admins can create users via API'}, status=403)
        serializer.save()
    
    def perform_update(self, serializer):
        """Users can only update their own profile, admins can update any user"""
        if self.request.user.role != 'admin' and serializer.instance.id != self.request.user.id:
            return Response({'error': 'You can only update your own profile'}, status=403)
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only admins can delete users, and can't delete themselves"""
        if self.request.user.role != 'admin':
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
        if request.user.role != 'admin':
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
        if request.user.role != 'admin':
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
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        
        admins = User.objects.filter(role='admin')
        serializer = self.get_serializer(admins, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics (admin only)"""
        if request.user.role != 'admin':
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

# ----------------------------------------
# 1.2 PET MANAGEMENT & CORE OPERATIONS
# ----------------------------------------

# Pet ViewSet - Core pet management functionality
class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get only available pets for adoption"""
        available_pets = Pet.objects.filter(status='available')
        serializer = self.get_serializer(available_pets, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def adopt(self, request, pk=None):
        """Request adoption for a specific pet"""
        pet = self.get_object()
        if pet.status == 'available':
            adoption, created = PetAdoption.objects.get_or_create(
                user=request.user,
                pet=pet,
                defaults={'status': 'pending'}
            )
            if created:
                # Create notification for admins
                admins = User.objects.filter(role='admin')
                for admin in admins:
                    Notification.objects.create(
                        sender=request.user,
                        receiver=admin,
                        message=f"New adoption request for {pet.name} by {request.user.username}",
                        is_read=False
                    )
                return Response({'message': 'Adoption request submitted successfully'})
            else:
                return Response({'message': 'You have already requested adoption for this pet'})
        return Response({'error': 'Pet is not available for adoption'}, status=400)

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
        if request.user.role != 'admin':
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
        if request.user.role != 'admin':
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

@login_required
@csrf_exempt
def request_adoption(request):
	"""Basic adoption request function"""
	if request.method == 'POST':
		pet_id = request.POST.get('pet_id')
		reason = request.POST.get('reason', '')  # Add reason field
		from .models import Pet, PetAdoption, Notification, User
		pet = Pet.objects.filter(id=pet_id).first()
		if pet:
			# Prevent duplicate requests for same pet by same user
			existing = PetAdoption.objects.filter(user=request.user, pet=pet).first()
			if not existing:
				adoption = PetAdoption.objects.create(
					user=request.user, 
					pet=pet, 
					status='pending',
					reason=reason  # Include reason in creation
				)
				
				# Create notification for all admin users
				admins = User.objects.filter(role='admin')
				for admin in admins:
					Notification.objects.create(
						sender=request.user,
						receiver=admin,
						message=f"New adoption request for {pet.name} by {request.user.username}",
						is_read=False
					)
		return HttpResponseRedirect('/api/dashboard/')
	return HttpResponseRedirect('/api/dashboard/')

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
		
		# Create notification for admin
		from .models import Notification, User
		admins = User.objects.filter(role='admin')
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
		
		# Create notification for admin
		from .models import Notification, User
		admins = User.objects.filter(role='admin')
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
		
		# Create notification for admin
		from .models import Notification, User
		admins = User.objects.filter(role='admin')
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

@login_required
@csrf_exempt
def admin_approve_adoption(request, adoption_id):
	if request.user.role == 'admin':
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
		
		return redirect('dashboard')
	return redirect('dashboard')

@login_required
@csrf_exempt
def admin_reject_adoption(request, adoption_id):
	if request.user.role == 'admin':
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
		
		return redirect('dashboard')
	return redirect('dashboard')

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
		
		# Check if user is admin
		if request.user.role != 'admin':
			return JsonResponse({
				'success': False,
				'error': 'Admin access required.'
			}, status=403)
		
		# Get and approve report
		try:
			report = PetReport.objects.get(id=report_id)
			report.report_status = 'approved'
			report.save()
			
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

@login_required
@csrf_exempt
def admin_reject_report(request, report_id):
	if request.user.role == 'admin':
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
		
		return redirect('dashboard')
	return redirect('dashboard')

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

@login_required
def filter_adoption_requests(request):
	if request.user.role != 'admin':
		return redirect('dashboard')
	
	from .models import PetAdoption
	status = request.GET.get('status', '')
	
	adoptions = PetAdoption.objects.all()
	
	if status:
		adoptions = adoptions.filter(status=status)
	
	context = {'adoptions': adoptions, 'status': status}
	return JsonResponse(context)

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
		# Check if user is authenticated via JWT
		if not request.user.is_authenticated:
			return JsonResponse({
				'success': False,
				'error': 'Authentication required. Please provide valid token.'
			}, status=401)
		
		user = request.user
		
		# Return user details in the exact format requested by mentor
		user_data = {
			'id': user.id,
			'name': f"{user.first_name} {user.last_name}".strip() or user.username,
			'username': user.username,
			'email': user.email,
			'phone': getattr(user, 'phone', ''),  # Add phone field if exists
			'address': getattr(user, 'address', ''),  # Add address field if exists
			'role': user.role,
			'created_on': user.date_joined.isoformat(),
			'is_active': user.is_active,
			'first_name': user.first_name,
			'last_name': user.last_name
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
		elif request.content_type == 'application/json':
			data = json.loads(request.body)
			uploaded_file = None
		else:
			data = request.POST.dict()
			uploaded_file = request.FILES.get('pet_image')
		
		user = request.user
		
		# Use database transaction to ensure all data is saved together
		from django.db import transaction
		
		with transaction.atomic():
			# 1. Create Pet record (only using fields that exist in Pet model)
			pet_data = {
				'name': data.get('pet_name', data.get('name', '')),
				'type': data.get('pet_type', data.get('type', 'Dog')),
				'breed': data.get('pet_breed', data.get('breed', '')),
				'age': int(data.get('pet_age', data.get('age', 0))),
				'colour': data.get('pet_colour', data.get('color', '')),
				'weight': float(data.get('pet_weight', data.get('weight', 0.0))),
				'description': data.get('description', ''),
				'status': 'lost',  # Default to lost for pet request
				'gender': data.get('pet_gender', data.get('gender', '')),
				'location': data.get('pet_location', data.get('location', '')),
				'state': data.get('pet_state', data.get('state', '')),
				'city': data.get('pet_city', data.get('city', '')),
				'date': data.get('pet_date', timezone.now().date()),
				'is_vaccinated': data.get('is_vaccinated', False),
				'is_diseased': data.get('is_diseased', False)
			}
			
			# Add image file if uploaded
			if uploaded_file:
				pet_data['photo'] = uploaded_file
			
			pet = Pet.objects.create(**pet_data)
			
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
			
			# 4. Create Notification for Admin
			notification_message = f"New {report_type} pet request: {pet.name} ({pet.breed}) reported by {user.username}"
			
			# Get all admin users
			admin_users = User.objects.filter(role='admin')
			
			notification_id = None
			for admin in admin_users:
				notification = Notification.objects.create(
					sender=user,
					receiver=admin,
					message=notification_message,
					pet=pet,
					is_read=False
				)
				if not notification_id:  # Store first notification ID for response
					notification_id = notification.id
		
		# Success response in mentor's requested format
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
		
		# Check if user is admin
		if request.user.role != 'admin':
			return JsonResponse({
				'success': False,
				'error': 'Admin access required.'
			}, status=403)
		
		# Get all notifications for this admin user
		notifications = Notification.objects.filter(
			receiver=request.user  # Changed from 'user' to 'receiver'
		).order_by('-created_at')
		
		notifications_data = []
		for notification in notifications:
			notification_item = {
				'id': notification.id,
				'message': notification.message,  # Only use existing fields
				'is_read': notification.is_read,
				'created_at': notification.created_at.isoformat(),
				'pet_info': None,
				'sender': notification.sender.username if notification.sender else None
			}
			
			# If notification has a related pet, include pet details
			if notification.pet:
				notification_item['pet_info'] = {
					'id': notification.pet.id,
					'name': notification.pet.name,
					'breed': notification.pet.breed,
					'type': notification.pet.type,
					'age': notification.pet.age,
					'color': notification.pet.colour,  # Note: model uses 'colour'
					'status': notification.pet.status
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
		# Check authentication
		if not request.user.is_authenticated:
			return JsonResponse({
				'success': False,
				'error': 'Authentication required. Please provide valid token.'
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
				'is_vaccinated': medical_history.is_vaccinated,
				'vaccination_details': medical_history.vaccination_details,
				'health_conditions': medical_history.health_conditions,
				'medical_notes': medical_history.medical_notes,
				'vet_contact': medical_history.vet_contact,
				'last_checkup_date': medical_history.last_checkup_date.isoformat() if medical_history.last_checkup_date else None,
				'created_at': medical_history.created_at.isoformat() if hasattr(medical_history, 'created_at') else None
			}
		except PetMedicalHistory.DoesNotExist:
			medical_data = None
		
		# Get related reports
		reports = PetReport.objects.filter(pet=pet).order_by('-report_date')
		reports_data = []
		for report in reports:
			reports_data.append({
				'id': report.id,
				'status': report.status,
				'description': report.description,
				'created_at': report.created_at.isoformat(),
				'updated_at': report.updated_at.isoformat(),
				'user_name': report.user.username,
				'user_email': report.user.email
			})
		
		# Compile complete pet details
		pet_details = {
			'pet_info': {
				'id': pet.id,
				'name': pet.name,
				'type': pet.type,
				'breed': pet.breed,
				'age': pet.age,
				'color': pet.color,
				'weight': pet.weight,
				'description': pet.description,
				'status': pet.status,
				'contact_phone': pet.contact_phone,
				'contact_email': pet.contact_email,
				'last_seen_location': pet.last_seen_location,
				'last_seen_date': pet.last_seen_date.isoformat() if pet.last_seen_date else None,
				'reported_by': pet.reported_by.username if pet.reported_by else None,
				'created_at': pet.created_at.isoformat() if hasattr(pet, 'created_at') else None
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

#   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 #   � x �   N E W   A P I   E N D P O I N T S   F O R   E N H A N C E D   F U N C T I O N A L I T Y      
 #   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 @ c s r f _ e x e m p t  
 @ r e q u i r e _ h t t p _ m e t h o d s ( [ " P A T C H " ] )  
 d e f   m a r k _ a l l _ n o t i f i c a t i o n s _ r e a d _ a p i ( r e q u e s t ) :  
 	 " " " M a r k   a l l   n o t i f i c a t i o n s   a s   r e a d   f o r   t h e   a u t h e n t i c a t e d   u s e r " " "  
 	 t r y :  
 	 	 f r o m   r e s t _ f r a m e w o r k _ s i m p l e j w t . a u t h e n t i c a t i o n   i m p o r t   J W T A u t h e n t i c a t i o n  
 	 	 f r o m   r e s t _ f r a m e w o r k . r e q u e s t   i m p o r t   R e q u e s t  
 	 	 f r o m   r e s t _ f r a m e w o r k   i m p o r t   e x c e p t i o n s  
 	 	  
 	 	 d r f _ r e q u e s t   =   R e q u e s t ( r e q u e s t )  
 	 	 j w t _ a u t h   =   J W T A u t h e n t i c a t i o n ( )  
 	 	  
 	 	 t r y :  
 	 	 	 u s e r _ a u t h _ t u p l e   =   j w t _ a u t h . a u t h e n t i c a t e ( d r f _ r e q u e s t )  
 	 	 	 i f   u s e r _ a u t h _ t u p l e   i s   N o n e :  
 	 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' A u t h e n t i c a t i o n   r e q u i r e d . ' } ,   s t a t u s = 4 0 1 )  
 	 	 	 u s e r ,   t o k e n   =   u s e r _ a u t h _ t u p l e  
 	 	 e x c e p t   e x c e p t i o n s . A u t h e n t i c a t i o n F a i l e d   a s   e :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' A u t h e n t i c a t i o n   f a i l e d :   { s t r ( e ) } ' } ,   s t a t u s = 4 0 1 )  
 	 	  
 	 	 #   M a r k   a l l   n o t i f i c a t i o n s   a s   r e a d   f o r   t h i s   u s e r  
 	 	 N o t i f i c a t i o n . o b j e c t s . f i l t e r ( r e c e i v e r = u s e r ,   i s _ r e a d = F a l s e ) . u p d a t e ( i s _ r e a d = T r u e )  
 	 	  
 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   T r u e ,   ' m e s s a g e ' :   ' A l l   n o t i f i c a t i o n s   m a r k e d   a s   r e a d ' } )  
 	 	  
 	 e x c e p t   E x c e p t i o n   a s   e :  
 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' S e r v e r   e r r o r :   { s t r ( e ) } ' } ,   s t a t u s = 5 0 0 )  
  
  
 @ c s r f _ e x e m p t  
 @ r e q u i r e _ h t t p _ m e t h o d s ( [ " D E L E T E " ] )  
 d e f   d e l e t e _ n o t i f i c a t i o n _ a p i ( r e q u e s t ,   n o t i f i c a t i o n _ i d ) :  
 	 " " " D e l e t e   a   s p e c i f i c   n o t i f i c a t i o n " " "  
 	 t r y :  
 	 	 f r o m   r e s t _ f r a m e w o r k _ s i m p l e j w t . a u t h e n t i c a t i o n   i m p o r t   J W T A u t h e n t i c a t i o n  
 	 	 f r o m   r e s t _ f r a m e w o r k . r e q u e s t   i m p o r t   R e q u e s t  
 	 	 f r o m   r e s t _ f r a m e w o r k   i m p o r t   e x c e p t i o n s  
 	 	  
 	 	 d r f _ r e q u e s t   =   R e q u e s t ( r e q u e s t )  
 	 	 j w t _ a u t h   =   J W T A u t h e n t i c a t i o n ( )  
 	 	  
 	 	 t r y :  
 	 	 	 u s e r _ a u t h _ t u p l e   =   j w t _ a u t h . a u t h e n t i c a t e ( d r f _ r e q u e s t )  
 	 	 	 i f   u s e r _ a u t h _ t u p l e   i s   N o n e :  
 	 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' A u t h e n t i c a t i o n   r e q u i r e d . ' } ,   s t a t u s = 4 0 1 )  
 	 	 	 u s e r ,   t o k e n   =   u s e r _ a u t h _ t u p l e  
 	 	 e x c e p t   e x c e p t i o n s . A u t h e n t i c a t i o n F a i l e d   a s   e :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' A u t h e n t i c a t i o n   f a i l e d :   { s t r ( e ) } ' } ,   s t a t u s = 4 0 1 )  
 	 	  
 	 	 t r y :  
 	 	 	 n o t i f i c a t i o n   =   N o t i f i c a t i o n . o b j e c t s . g e t ( i d = n o t i f i c a t i o n _ i d ,   r e c e i v e r = u s e r )  
 	 	 	 n o t i f i c a t i o n . d e l e t e ( )  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   T r u e ,   ' m e s s a g e ' :   ' N o t i f i c a t i o n   d e l e t e d   s u c c e s s f u l l y ' } )  
 	 	 e x c e p t   N o t i f i c a t i o n . D o e s N o t E x i s t :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' N o t i f i c a t i o n   n o t   f o u n d ' } ,   s t a t u s = 4 0 4 )  
 	 	  
 	 e x c e p t   E x c e p t i o n   a s   e :  
 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' S e r v e r   e r r o r :   { s t r ( e ) } ' } ,   s t a t u s = 5 0 0 )  
  
  
 @ c s r f _ e x e m p t  
 @ r e q u i r e _ h t t p _ m e t h o d s ( [ " D E L E T E " ] )  
 d e f   d e l e t e _ r e p o r t _ a p i ( r e q u e s t ,   r e p o r t _ i d ) :  
 	 " " " D e l e t e   a   u s e r ' s   p e t   r e p o r t " " "  
 	 t r y :  
 	 	 f r o m   r e s t _ f r a m e w o r k _ s i m p l e j w t . a u t h e n t i c a t i o n   i m p o r t   J W T A u t h e n t i c a t i o n  
 	 	 f r o m   r e s t _ f r a m e w o r k . r e q u e s t   i m p o r t   R e q u e s t  
 	 	 f r o m   r e s t _ f r a m e w o r k   i m p o r t   e x c e p t i o n s  
 	 	  
 	 	 d r f _ r e q u e s t   =   R e q u e s t ( r e q u e s t )  
 	 	 j w t _ a u t h   =   J W T A u t h e n t i c a t i o n ( )  
 	 	  
 	 	 t r y :  
 	 	 	 u s e r _ a u t h _ t u p l e   =   j w t _ a u t h . a u t h e n t i c a t e ( d r f _ r e q u e s t )  
 	 	 	 i f   u s e r _ a u t h _ t u p l e   i s   N o n e :  
 	 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' A u t h e n t i c a t i o n   r e q u i r e d . ' } ,   s t a t u s = 4 0 1 )  
 	 	 	 u s e r ,   t o k e n   =   u s e r _ a u t h _ t u p l e  
 	 	 e x c e p t   e x c e p t i o n s . A u t h e n t i c a t i o n F a i l e d   a s   e :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' A u t h e n t i c a t i o n   f a i l e d :   { s t r ( e ) } ' } ,   s t a t u s = 4 0 1 )  
 	 	  
 	 	 t r y :  
 	 	 	 r e p o r t   =   P e t R e p o r t . o b j e c t s . g e t ( i d = r e p o r t _ i d ,   u s e r = u s e r )  
 	 	 	 r e p o r t . d e l e t e ( )  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   T r u e ,   ' m e s s a g e ' :   ' R e p o r t   d e l e t e d   s u c c e s s f u l l y ' } )  
 	 	 e x c e p t   P e t R e p o r t . D o e s N o t E x i s t :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' R e p o r t   n o t   f o u n d   o r   a c c e s s   d e n i e d ' } ,   s t a t u s = 4 0 4 )  
 	 	  
 	 e x c e p t   E x c e p t i o n   a s   e :  
 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' S e r v e r   e r r o r :   { s t r ( e ) } ' } ,   s t a t u s = 5 0 0 )  
  
  
 @ c s r f _ e x e m p t  
 @ r e q u i r e _ h t t p _ m e t h o d s ( [ " P A T C H " ] )  
 d e f   u p d a t e _ r e p o r t _ s t a t u s _ a p i ( r e q u e s t ,   r e p o r t _ i d ) :  
 	 " " " U p d a t e   s t a t u s   o f   a   u s e r ' s   p e t   r e p o r t " " "  
 	 t r y :  
 	 	 f r o m   r e s t _ f r a m e w o r k _ s i m p l e j w t . a u t h e n t i c a t i o n   i m p o r t   J W T A u t h e n t i c a t i o n  
 	 	 f r o m   r e s t _ f r a m e w o r k . r e q u e s t   i m p o r t   R e q u e s t  
 	 	 f r o m   r e s t _ f r a m e w o r k   i m p o r t   e x c e p t i o n s  
 	 	  
 	 	 d r f _ r e q u e s t   =   R e q u e s t ( r e q u e s t )  
 	 	 j w t _ a u t h   =   J W T A u t h e n t i c a t i o n ( )  
 	 	  
 	 	 t r y :  
 	 	 	 u s e r _ a u t h _ t u p l e   =   j w t _ a u t h . a u t h e n t i c a t e ( d r f _ r e q u e s t )  
 	 	 	 i f   u s e r _ a u t h _ t u p l e   i s   N o n e :  
 	 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' A u t h e n t i c a t i o n   r e q u i r e d . ' } ,   s t a t u s = 4 0 1 )  
 	 	 	 u s e r ,   t o k e n   =   u s e r _ a u t h _ t u p l e  
 	 	 e x c e p t   e x c e p t i o n s . A u t h e n t i c a t i o n F a i l e d   a s   e :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' A u t h e n t i c a t i o n   f a i l e d :   { s t r ( e ) } ' } ,   s t a t u s = 4 0 1 )  
 	 	  
 	 	 d a t a   =   j s o n . l o a d s ( r e q u e s t . b o d y )  
 	 	 n e w _ s t a t u s   =   d a t a . g e t ( ' s t a t u s ' )  
 	 	  
 	 	 i f   n e w _ s t a t u s   n o t   i n   [ ' F O U N D ' ,   ' R E U N I T E D ' ] :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' I n v a l i d   s t a t u s .   M u s t   b e   F O U N D   o r   R E U N I T E D ' } ,   s t a t u s = 4 0 0 )  
 	 	  
 	 	 t r y :  
 	 	 	 r e p o r t   =   P e t R e p o r t . o b j e c t s . g e t ( i d = r e p o r t _ i d ,   u s e r = u s e r )  
 	 	 	 r e p o r t . s t a t u s   =   n e w _ s t a t u s . l o w e r ( )  
 	 	 	 r e p o r t . s a v e ( )  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   T r u e ,   ' m e s s a g e ' :   f ' R e p o r t   s t a t u s   u p d a t e d   t o   { n e w _ s t a t u s } ' } )  
 	 	 e x c e p t   P e t R e p o r t . D o e s N o t E x i s t :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' R e p o r t   n o t   f o u n d   o r   a c c e s s   d e n i e d ' } ,   s t a t u s = 4 0 4 )  
 	 	  
 	 e x c e p t   E x c e p t i o n   a s   e :  
 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' S e r v e r   e r r o r :   { s t r ( e ) } ' } ,   s t a t u s = 5 0 0 )  
  
  
 @ c s r f _ e x e m p t      
 @ r e q u i r e _ h t t p _ m e t h o d s ( [ " G E T " ] )  
 d e f   a p i _ a l l _ l o s t _ r e p o r t s ( r e q u e s t ) :  
 	 " " " G e t   a l l   l o s t   p e t   r e p o r t s   f r o m   a l l   u s e r s   ( p u b l i c   v i e w ) " " "  
 	 t r y :  
 	 	 f r o m   r e s t _ f r a m e w o r k _ s i m p l e j w t . a u t h e n t i c a t i o n   i m p o r t   J W T A u t h e n t i c a t i o n  
 	 	 f r o m   r e s t _ f r a m e w o r k . r e q u e s t   i m p o r t   R e q u e s t  
 	 	 f r o m   r e s t _ f r a m e w o r k   i m p o r t   e x c e p t i o n s  
 	 	  
 	 	 d r f _ r e q u e s t   =   R e q u e s t ( r e q u e s t )  
 	 	 j w t _ a u t h   =   J W T A u t h e n t i c a t i o n ( )  
 	 	  
 	 	 t r y :  
 	 	 	 u s e r _ a u t h _ t u p l e   =   j w t _ a u t h . a u t h e n t i c a t e ( d r f _ r e q u e s t )  
 	 	 	 i f   u s e r _ a u t h _ t u p l e   i s   N o n e :  
 	 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   ' A u t h e n t i c a t i o n   r e q u i r e d . ' } ,   s t a t u s = 4 0 1 )  
 	 	 	 u s e r ,   t o k e n   =   u s e r _ a u t h _ t u p l e  
 	 	 e x c e p t   e x c e p t i o n s . A u t h e n t i c a t i o n F a i l e d   a s   e :  
 	 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' A u t h e n t i c a t i o n   f a i l e d :   { s t r ( e ) } ' } ,   s t a t u s = 4 0 1 )  
 	 	  
 	 	 #   G e t   a l l   l o s t   p e t   r e p o r t s   f r o m   a l l   u s e r s  
 	 	 l o s t _ r e p o r t s   =   P e t R e p o r t . o b j e c t s . f i l t e r ( s t a t u s = ' l o s t ' ) . s e l e c t _ r e l a t e d ( ' p e t ' ,   ' u s e r ' )  
 	 	  
 	 	 r e p o r t s _ d a t a   =   [ ]  
 	 	 f o r   r e p o r t   i n   l o s t _ r e p o r t s :  
 	 	 	 p e t   =   r e p o r t . p e t  
 	 	 	 r e p o r t s _ d a t a . a p p e n d ( {  
 	 	 	 	 ' i d ' :   r e p o r t . i d ,  
 	 	 	 	 ' p e t _ n a m e ' :   p e t . n a m e ,  
 	 	 	 	 ' a n i m a l _ t y p e ' :   p e t . t y p e ,  
 	 	 	 	 ' p e t _ b r e e d ' :   p e t . b r e e d ,  
 	 	 	 	 ' p e t _ l o c a t i o n ' :   p e t . l o c a t i o n ,  
 	 	 	 	 ' d e s c r i p t i o n ' :   p e t . d e s c r i p t i o n ,  
 	 	 	 	 ' s t a t u s ' :   r e p o r t . s t a t u s . u p p e r ( ) ,  
 	 	 	 	 ' c r e a t e d _ a t ' :   r e p o r t . c r e a t e d _ a t . i s o f o r m a t ( ) ,  
 	 	 	 	 ' p h o t o ' :   p e t . p h o t o . u r l   i f   p e t . p h o t o   e l s e   N o n e ,  
 	 	 	 	 ' o w n e r _ u s e r n a m e ' :   r e p o r t . u s e r . u s e r n a m e ,  
 	 	 	 	 ' c o n t a c t _ i n f o ' :   T r u e ,  
 	 	 	 	 ' r e p o r t _ t y p e ' :   ' L O S T '  
 	 	 	 } )  
 	 	  
 	 	 r e t u r n   J s o n R e s p o n s e ( {  
 	 	 	 ' s u c c e s s ' :   T r u e ,  
 	 	 	 ' r e p o r t s ' :   r e p o r t s _ d a t a ,  
 	 	 	 ' t o t a l _ c o u n t ' :   l e n ( r e p o r t s _ d a t a )  
 	 	 } )  
 	 	  
 	 e x c e p t   E x c e p t i o n   a s   e :  
 	 	 r e t u r n   J s o n R e s p o n s e ( { ' s u c c e s s ' :   F a l s e ,   ' e r r o r ' :   f ' S e r v e r   e r r o r :   { s t r ( e ) } ' } ,   s t a t u s = 5 0 0 )  
 # ==============================================================================
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
	"""Get all lost pet reports from all users (public view)"""
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
		
		# Get all lost pet reports from all users
		lost_reports = PetReport.objects.filter(status='lost').select_related('pet', 'user')
		
		reports_data = []
		for report in lost_reports:
			pet = report.pet
			reports_data.append({
				'id': report.id,
				'pet_name': pet.name,
				'animal_type': pet.type,
				'pet_breed': pet.breed,
				'pet_location': pet.location,
				'description': pet.description,
				'status': report.status.upper(),
				'created_at': report.created_at.isoformat(),
				'photo': pet.photo.url if pet.photo else None,
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
