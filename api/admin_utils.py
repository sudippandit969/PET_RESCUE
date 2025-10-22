# Admin utility functions for dashboard statistics and management
from django.db.models import Count, Q
from .models import User, Pet, PetReport, PetAdoption, Notification
from datetime import datetime, timedelta

def get_admin_dashboard_stats():
    """Get comprehensive statistics for admin dashboard"""
    
    # Basic counts
    total_pets = Pet.objects.count()
    total_users = User.objects.filter(role='user').count()
    total_admins = User.objects.filter(role='admin').count()
    
    # Pet statistics
    available_pets = Pet.objects.filter(adoptions__isnull=True).count()
    adopted_pets = PetAdoption.objects.filter(status='approved').count()
    
    # Report statistics
    pending_reports = PetReport.objects.filter(report_status='pending').count()
    approved_reports = PetReport.objects.filter(report_status='approved').count()
    lost_pets = PetReport.objects.filter(status='lost', report_status='approved').count()
    found_pets = PetReport.objects.filter(status='found', report_status='approved').count()
    
    # Adoption statistics
    pending_adoptions = PetAdoption.objects.filter(status='pending').count()
    approved_adoptions = PetAdoption.objects.filter(status='approved').count()
    rejected_adoptions = PetAdoption.objects.filter(status='rejected').count()
    
    # Recent activity (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    new_users_this_week = User.objects.filter(date_joined__gte=week_ago, role='user').count()
    new_reports_this_week = PetReport.objects.filter(pet__date__gte=week_ago.date()).count()
    new_adoptions_this_week = PetAdoption.objects.filter(id__gte=week_ago.day).count()  # Approximation
    
    # Notification statistics
    unread_admin_notifications = Notification.objects.filter(
        receiver__role='admin', 
        is_read=False
    ).count()
    
    return {
        'total_counts': {
            'total_pets': total_pets,
            'total_users': total_users,
            'total_admins': total_admins,
            'available_pets': available_pets,
            'adopted_pets': adopted_pets
        },
        'reports': {
            'pending_reports': pending_reports,
            'approved_reports': approved_reports,
            'lost_pets': lost_pets,
            'found_pets': found_pets
        },
        'adoptions': {
            'pending_adoptions': pending_adoptions,
            'approved_adoptions': approved_adoptions,
            'rejected_adoptions': rejected_adoptions
        },
        'recent_activity': {
            'new_users_this_week': new_users_this_week,
            'new_reports_this_week': new_reports_this_week,
            'new_adoptions_this_week': new_adoptions_this_week
        },
        'notifications': {
            'unread_admin_notifications': unread_admin_notifications
        }
    }

def get_user_management_data():
    """Get user data for admin user management"""
    users = User.objects.filter(role='user').annotate(
        adoption_count=Count('adoptions'),
        report_count=Count('pet_reports')
    ).order_by('-date_joined')
    
    return users

def get_pet_management_data():
    """Get pet data with status for admin management"""
    pets = Pet.objects.annotate(
        adoption_count=Count('adoptions'),
        report_count=Count('reports')
    ).order_by('-date')
    
    return pets

def bulk_approve_reports(report_ids, admin_user):
    """Bulk approve multiple reports"""
    from .models import Notification
    
    reports = PetReport.objects.filter(id__in=report_ids, report_status='pending')
    updated_count = 0
    
    for report in reports:
        report.report_status = 'accepted'  # Changed from 'approved' to 'accepted'
        
        # **FIX: Update Pet status based on report type**
        pet = report.pet
        if report.status == 'adopt':
            # If user posted pet for adoption, make it available for others to adopt
            pet.status = 'available'
            report.status = 'available'  # Also update report status to 'available'
        elif report.status in ['lost', 'found', 'adopted', 'available']:
            pet.status = report.status  # Sync pet status with report status
        pet.save()
        
        report.save()
        
        # Create notification for user
        Notification.objects.create(
            sender=admin_user,
            receiver=report.user,
            message=f'Your pet report for {report.pet.name} has been approved!',
            is_read=False
        )
        updated_count += 1
    
    return updated_count

def bulk_reject_reports(report_ids, admin_user):
    """Bulk reject multiple reports"""
    from .models import Notification
    
    reports = PetReport.objects.filter(id__in=report_ids, report_status='pending')
    updated_count = 0
    
    for report in reports:
        report.report_status = 'rejected'
        report.save()
        
        # Create notification for user
        Notification.objects.create(
            sender=admin_user,
            receiver=report.user,
            message=f'Your pet report for {report.pet.name} has been rejected.',
            is_read=False
        )
        updated_count += 1
    
    return updated_count

def bulk_approve_adoptions(adoption_ids, admin_user):
    """Bulk approve multiple adoptions"""
    from .models import Notification
    
    adoptions = PetAdoption.objects.filter(id__in=adoption_ids, status='pending')
    updated_count = 0
    
    for adoption in adoptions:
        adoption.status = 'approved'
        adoption.save()
        
        # Create notification for user
        Notification.objects.create(
            sender=admin_user,
            receiver=adoption.user,
            message=f'Your adoption request for {adoption.pet.name} has been approved!',
            is_read=False
        )
        updated_count += 1
    
    return updated_count

def bulk_reject_adoptions(adoption_ids, admin_user):
    """Bulk reject multiple adoptions"""
    from .models import Notification
    
    adoptions = PetAdoption.objects.filter(id__in=adoption_ids, status='pending')
    updated_count = 0
    
    for adoption in adoptions:
        adoption.status = 'rejected'
        adoption.save()
        
        # Create notification for user
        Notification.objects.create(
            sender=admin_user,
            receiver=adoption.user,
            message=f'Your adoption request for {adoption.pet.name} has been rejected.',
            is_read=False
        )
        updated_count += 1
    
    return updated_count