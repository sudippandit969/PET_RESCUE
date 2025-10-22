from django.core.management.base import BaseCommand
from api.models import PetReport, Pet, User

class Command(BaseCommand):
    help = 'Delete all lost pet requests and associated pets from user neon_user.'

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username='neon_user')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("User 'neon_user' does not exist."))
            return

        lost_reports = PetReport.objects.filter(user=user, status='lost')
        pet_ids = list(lost_reports.values_list('pet_id', flat=True))
        count_reports = lost_reports.count()
        count_pets = Pet.objects.filter(id__in=pet_ids).count()
        lost_reports.delete()
        Pet.objects.filter(id__in=pet_ids).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count_reports} lost reports and {count_pets} pets for user 'neon_user'."))