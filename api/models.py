
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    phone_no = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    state = models.CharField(max_length=50, blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')

class Pet(models.Model):
    STATUS_CHOICES = (
        ('available', 'Available for Adoption'),
        ('adopted', 'Adopted'),
        ('lost', 'Lost'),
        ('found', 'Found'),
        ('reunited', 'Reunited'),
        ('unavailable', 'Unavailable'),
        ('adopt', 'For Adoption'),  # Added for user-posted adoption pets
    )
    name = models.CharField(max_length=100)
    breed = models.CharField(max_length=100)
    type = models.CharField(max_length=50)
    colour = models.CharField(max_length=50)
    location = models.CharField(max_length=100)
    image = models.ImageField(upload_to='pets/', blank=True, null=True)
    age = models.PositiveIntegerField(blank=True, null=True)
    weight = models.FloatField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    state = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    is_vaccinated = models.BooleanField(default=False)
    is_diseased = models.BooleanField(default=False)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='unavailable')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

class PetMedicalHistory(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='medical_history')
    vaccine_name = models.CharField(max_length=100, blank=True, null=True)
    last_vaccinated_date = models.DateField(blank=True, null=True)
    disease_name = models.CharField(max_length=100, blank=True, null=True)
    stage = models.CharField(max_length=50, blank=True, null=True)
    treatment_name = models.CharField(max_length=100, blank=True, null=True)
    no_of_years = models.PositiveIntegerField(blank=True, null=True)

class PetReport(models.Model):
    STATUS_CHOICES = (
        ('lost', 'Lost'),
        ('found', 'Found'),
        ('adopt', 'Adopt'),
    )
    REPORT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('reunited', 'Reunited'),
        ('resolved', 'Resolved'),
    )
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='reports')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    report_status = models.CharField(max_length=10, choices=REPORT_STATUS_CHOICES, default='pending')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pet_reports')
    image = models.ImageField(upload_to='reports/', blank=True, null=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.TextField(blank=True, null=True)
    admin_comment = models.TextField(blank=True, null=True)  # Admin review comment

class PetAdoption(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    )
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='adoptions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='adoptions')
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


class Notification(models.Model):
    message = models.TextField()
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='notifications', blank=True, null=True)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

# User Story / Feedback Model
class UserStory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stories')
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='stories', blank=True, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

# Favourite Pets Model
class FavouritePet(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favourites')
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='favourited_by')
    created_at = models.DateTimeField(default=timezone.now)
