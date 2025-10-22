# Test adoption request to verify the admin dashboard functionality
from django.core.management.base import BaseCommand
from api.models import User, Pet, PetAdoption, Notification

class Command(BaseCommand):
    help = 'Create test adoption requests and notifications'

    def handle(self, *args, **options):
        # Create a test user if doesn't exist
        test_user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User',
                'role': 'user'
            }
        )
        if created:
            test_user.set_password('testpass123')
            test_user.save()
            self.stdout.write(f"Created test user: {test_user.username}")

        # Create test pets if they don't exist
        test_pets = [
            {
                'name': 'Buddy',
                'breed': 'Golden Retriever',
                'type': 'Dog',
                'colour': 'Golden',
                'location': 'Downtown',
                'age': 3,
                'weight': 25.5,
                'description': 'Friendly and energetic dog',
                'gender': 'Male',
                'is_vaccinated': True,
                'is_diseased': False,
                'status': 'available'
            },
            {
                'name': 'Whiskers',
                'breed': 'Persian',
                'type': 'Cat',
                'colour': 'White',
                'location': 'Uptown',
                'age': 2,
                'weight': 4.2,
                'description': 'Calm and affectionate cat',
                'gender': 'Female',
                'is_vaccinated': True,
                'is_diseased': False,
                'status': 'available'
            }
        ]

        created_pets = []
        for pet_data in test_pets:
            pet, created = Pet.objects.get_or_create(
                name=pet_data['name'],
                defaults=pet_data
            )
            if created:
                created_pets.append(pet)
                self.stdout.write(f"Created test pet: {pet.name}")

        # Create test adoption requests
        for pet in created_pets:
            adoption, created = PetAdoption.objects.get_or_create(
                user=test_user,
                pet=pet,
                defaults={
                    'reason': f'I would love to adopt {pet.name} because they seem perfect for my family.',
                    'status': 'pending'
                }
            )
            if created:
                self.stdout.write(f"Created adoption request for {pet.name}")
                
                # Create notifications for admin users
                admins = User.objects.filter(role='admin')
                for admin in admins:
                    notification, created = Notification.objects.get_or_create(
                        sender=test_user,
                        receiver=admin,
                        message=f"New adoption request for {pet.name} by {test_user.username}",
                        defaults={'is_read': False}
                    )
                    if created:
                        self.stdout.write(f"Created notification for admin {admin.username}")

        self.stdout.write(
            self.style.SUCCESS('Successfully created test adoption requests and notifications!')
        )