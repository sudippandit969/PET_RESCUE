# feedback/models.py
from django.db import models

class Feedback(models.Model):
    name = models.CharField(max_length=100, blank=True)
    message = models.TextField()
    image = models.ImageField(upload_to='feedbacks/', null=True, blank=True)  # new
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name or 'Anonymous'} - {self.created_at:%Y-%m-%d %H:%M}"
