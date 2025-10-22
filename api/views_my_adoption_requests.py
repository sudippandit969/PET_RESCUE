# Required imports
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import PetAdoption

# Function to get user's adoption requests
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_adoption_requests(request):
    """
    Get all adoption requests made by the current user
    """
    try:
        # Fetch adoption requests for the current user
        adoption_requests = PetAdoption.objects.filter(user=request.user).order_by('-created_at')
        
        # Serialize the data with additional pet details
        serialized_requests = []
        for request_obj in adoption_requests:
            pet_data = None
            if request_obj.pet:
                pet_data = {
                    'id': request_obj.pet.id,
                    'name': request_obj.pet.name,
                    'type': request_obj.pet.type,
                    'breed': request_obj.pet.breed,
                    'age': request_obj.pet.age,
                    'gender': request_obj.pet.gender,
                    'image': request_obj.pet.image.url if request_obj.pet.image else None,
                }
            
            serialized_requests.append({
                'id': request_obj.id,
                'status': request_obj.status,
                'created_at': request_obj.created_at,
                'updated_at': request_obj.updated_at,
                'pet': pet_data,
                'reason': request_obj.reason
            })
        
        return Response({
            'success': True,
            'adoption_requests': serialized_requests
        })
    except Exception as e:
        print(f"Error retrieving adoption requests: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_adoption_request(request, request_id):
    """
    Cancel an adoption request made by the current user
    """
    try:
        # Find the adoption request
        adoption_request = PetAdoption.objects.get(id=request_id, user=request.user)
        
        # Only allow cancellation of pending requests
        if adoption_request.status != 'pending':
            return Response({
                'success': False,
                'error': f'Cannot cancel request with status: {adoption_request.status}. Only pending requests can be cancelled.'
            }, status=400)
        
        # Update status to cancelled
        adoption_request.status = 'cancelled'
        adoption_request.save()
        
        return Response({
            'success': True,
            'message': 'Adoption request cancelled successfully'
        })
    except PetAdoption.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Adoption request not found or you do not have permission to cancel it'
        }, status=404)
    except Exception as e:
        print(f"Error cancelling adoption request: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)