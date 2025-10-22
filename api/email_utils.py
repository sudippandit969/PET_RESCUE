# Email notification utilities
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def send_adoption_approval_email(adoption):
    """Send email notification for adoption approval"""
    subject = f'Adoption Request Approved - {adoption.pet.name}'
    html_message = render_to_string('api/emails/adoption_approved.html', {
        'user': adoption.user,
        'pet': adoption.pet,
        'adoption': adoption
    })
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [adoption.user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_adoption_rejection_email(adoption):
    """Send email notification for adoption rejection"""
    subject = f'Adoption Request Update - {adoption.pet.name}'
    html_message = render_to_string('api/emails/adoption_rejected.html', {
        'user': adoption.user,
        'pet': adoption.pet,
        'adoption': adoption
    })
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [adoption.user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_report_approval_email(report):
    """Send email notification for report approval"""
    subject = f'Pet Report Approved - {report.pet.name}'
    html_message = render_to_string('api/emails/report_approved.html', {
        'user': report.user,
        'pet': report.pet,
        'report': report
    })
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [report.user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_report_rejection_email(report):
    """Send email notification for report rejection"""
    subject = f'Pet Report Update - {report.pet.name}'
    html_message = render_to_string('api/emails/report_rejected.html', {
        'user': report.user,
        'pet': report.pet,
        'report': report
    })
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [report.user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_reunification_email(lost_user, found_user, pet_name):
    """Send email notification for pet reunification"""
    # Email to pet owner
    subject_owner = f'Great News! {pet_name} has been reunited!'
    html_message_owner = render_to_string('api/emails/reunification_owner.html', {
        'user': lost_user,
        'pet_name': pet_name,
        'finder': found_user
    })
    plain_message_owner = strip_tags(html_message_owner)
    
    # Email to finder
    subject_finder = f'Thank you for helping reunite {pet_name}!'
    html_message_finder = render_to_string('api/emails/reunification_finder.html', {
        'user': found_user,
        'pet_name': pet_name,
        'owner': lost_user
    })
    plain_message_finder = strip_tags(html_message_finder)
    
    try:
        # Send to owner
        send_mail(
            subject_owner,
            plain_message_owner,
            settings.DEFAULT_FROM_EMAIL,
            [lost_user.email],
            html_message=html_message_owner,
            fail_silently=False,
        )
        
        # Send to finder
        send_mail(
            subject_finder,
            plain_message_finder,
            settings.DEFAULT_FROM_EMAIL,
            [found_user.email],
            html_message=html_message_finder,
            fail_silently=False,
        )
        
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_welcome_email(user):
    """Send welcome email to new users"""
    subject = 'Welcome to Pet Rescue Platform!'
    html_message = render_to_string('api/emails/welcome.html', {
        'user': user
    })
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_admin_notification_email(admin_users, message, subject):
    """Send notification email to all admin users"""
    admin_emails = [admin.email for admin in admin_users if admin.email]
    
    if not admin_emails:
        return False
    
    html_message = render_to_string('api/emails/admin_notification.html', {
        'message': message,
        'subject': subject
    })
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            admin_emails,
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False