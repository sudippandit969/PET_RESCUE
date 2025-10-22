from django.shortcuts import render

# Create your views here.
from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Feedback
from .serializers import FeedbackSerializer

class FeedbackListCreate(generics.ListCreateAPIView):
    queryset = Feedback.objects.all().order_by('-created_at')
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # disable auth for public endpoints / avoids CSRF issues
