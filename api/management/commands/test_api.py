from django.core.management.base import BaseCommand
from api.models import PetReport, PetAdoption
from api.models import User

class Command(BaseCommand):
    help = 'Test the fixed Lost/Found/Adopt APIs functionality'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔧 Testing Lost/Found/Adopt API functionality'))
        self.stdout.write('=' * 60)
        
        # Test if we can query lost reports
        try:
            lost_reports = PetReport.objects.filter(status='lost')
            self.stdout.write(self.style.SUCCESS(f'✅ Lost reports query works: Found {lost_reports.count()} reports'))
            
            found_reports = PetReport.objects.filter(status='found')
            self.stdout.write(self.style.SUCCESS(f'✅ Found reports query works: Found {found_reports.count()} reports'))
            
            adopt_reports = PetReport.objects.filter(status='adopt')
            self.stdout.write(self.style.SUCCESS(f'✅ Adopt reports query works: Found {adopt_reports.count()} reports'))
            
            # Check ACTUAL adoptions (approved by admin)
            approved_adoptions = PetAdoption.objects.filter(status='approved')
            self.stdout.write(self.style.SUCCESS(f'✅ APPROVED ADOPTIONS: Found {approved_adoptions.count()} approved adoptions'))
            
            all_adoptions = PetAdoption.objects.all()
            self.stdout.write(self.style.SUCCESS(f'📊 Total adoption applications: {all_adoptions.count()}'))
            
            # Show detailed adoption status breakdown
            for status in ['pending', 'approved', 'rejected', 'cancelled']:
                count = PetAdoption.objects.filter(status=status).count()
                self.stdout.write(f'   - {status.title()}: {count}')
            
            # Show some sample data
            if lost_reports.exists():
                self.stdout.write('\nSample lost reports:')
                for report in lost_reports[:3]:
                    self.stdout.write(f'  - ID: {report.id}, Pet: {report.pet.name if report.pet else "Unknown"}, User: {report.user.username}')
            
            if found_reports.exists():
                self.stdout.write('\nSample found reports:')
                for report in found_reports[:3]:
                    self.stdout.write(f'  - ID: {report.id}, Pet: {report.pet.name if report.pet else "Unknown"}, User: {report.user.username}')
                    
            if approved_adoptions.exists():
                self.stdout.write('\nApproved adoptions:')
                for adoption in approved_adoptions[:5]:
                    self.stdout.write(f'  - ID: {adoption.id}, Pet: {adoption.pet.name}, User: {adoption.user.username}, Status: {adoption.status}')
            else:
                self.stdout.write(self.style.WARNING('\n⚠️  No approved adoptions found!'))
                if all_adoptions.exists():
                    self.stdout.write('But there are adoption applications:')
                    for adoption in all_adoptions[:5]:
                        self.stdout.write(f'  - ID: {adoption.id}, Pet: {adoption.pet.name}, User: {adoption.user.username}, Status: {adoption.status}')
                    
            # Test user authentication
            admin_user = User.objects.filter(username='admin').first()
            if admin_user:
                self.stdout.write(self.style.SUCCESS(f'✅ Admin user found: {admin_user.username}'))
            else:
                self.stdout.write(self.style.ERROR('❌ Admin user not found'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Database error: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS('\n🎉 Test completed!'))