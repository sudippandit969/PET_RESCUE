from django.urls import path
from .views import FeedbackListCreate

urlpatterns = [
    path('feedbacks/', FeedbackListCreate.as_view(), name='feedback-list-create'),
]
