
from rest_framework import serializers
from .models import User, Pet, PetMedicalHistory, PetReport, PetAdoption, Notification
from django.contrib.auth.hashers import make_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'phone_no', 'address', 'profile_picture', 'pincode', 'gender', 'city', 'state', 'date', 'role', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = '__all__'

class PetMedicalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PetMedicalHistory
        fields = '__all__'

class PetReportSerializer(serializers.ModelSerializer):
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    animal_type = serializers.CharField(source='pet.type', read_only=True)
    pet_breed = serializers.CharField(source='pet.breed', read_only=True)
    pet_location = serializers.CharField(source='pet.location', read_only=True)
    owner_username = serializers.CharField(source='user.username', read_only=True)
    photo = serializers.SerializerMethodField()
    
    class Meta:
        model = PetReport
        fields = '__all__'
    
    def get_photo(self, obj):
        if obj.image:
            return obj.image.url
        elif obj.pet and obj.pet.image:
            return obj.pet.image.url
        return None

class PetAdoptionSerializer(serializers.ModelSerializer):
    pet = PetSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = PetAdoption
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
