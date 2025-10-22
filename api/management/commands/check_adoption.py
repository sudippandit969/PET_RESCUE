from django.core.management.base import BaseCommand
from api.models import PetReport, Pet, User

class Command(BaseCommand):
    help = 'Check adoption data and status'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔍 CHECKING ADOPTION DATA'))
        self.stdout.write('=' * 60)
        
        try:
            # Check all PetReport statuses
            self.stdout.write('\n📊 All PetReport Status Distribution:')
            statuses = PetReport.objects.values_list('status', flat=True).distinct()
            for status in statuses:
                count = PetReport.objects.filter(status=status).count()
                self.stdout.write(f'  - Status "{status}": {count} reports')
            
            # Check for adoption-related reports
            self.stdout.write('\n🏠 Adoption Related Reports:')
            adopt_reports = PetReport.objects.filter(status='adopt')
            self.stdout.write(f'Reports with status="adopt": {adopt_reports.count()}')
            
            approved_reports = PetReport.objects.filter(status='approved')
            self.stdout.write(f'Reports with status="approved": {approved_reports.count()}')
            
            pending_reports = PetReport.objects.filter(status='pending')
            self.stdout.write(f'Reports with status="pending": {pending_reports.count()}')
            
            # Show details of any adoption-related reports
            if adopt_reports.exists():
                self.stdout.write('\n📝 Adopt Reports Details:')
                for report in adopt_reports:
                    self.stdout.write(f'  - ID: {report.id}, Pet: {report.pet.name if report.pet else "Unknown"}, User: {report.user.username}')
            
            if approved_reports.exists():
                self.stdout.write('\n✅ Approved Reports Details:')
                for report in approved_reports:
                    self.stdout.write(f'  - ID: {report.id}, Pet: {report.pet.name if report.pet else "Unknown"}, User: {report.user.username}')
            
            # Check pets with adoption status
            self.stdout.write('\n🐕 Pet Status Check:')
            all_pet_statuses = Pet.objects.values_list('status', flat=True).distinct()
            for status in all_pet_statuses:
                count = Pet.objects.filter(status=status).count()
                self.stdout.write(f'  - Pet status "{status}": {count} pets')
                
            # Show recent reports
            self.stdout.write('\n📅 Recent Reports (Last 10):')
            recent_reports = PetReport.objects.order_by('-created_at')[:10]
            for report in recent_reports:
                self.stdout.write(f'  - ID: {report.id}, Status: {report.status}, Pet: {report.pet.name if report.pet else "Unknown"}, Created: {report.created_at}')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS('\n🎉 Data check completed!'))