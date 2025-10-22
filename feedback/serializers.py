# feedback/serializers.py
from rest_framework import serializers
from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Feedback
        fields = ['id', 'name', 'message', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']
