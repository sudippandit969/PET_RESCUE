RENAME TO: d:\All Projects\PET_RESCUE1\README_API_BACKEND_UPDATES.md

# PET RESCUE - API ENDPOINTS REFERENCE

## 🔐 Authentication

### 1. User Registration

```
POST http://127.0.0.1:8000/api/register/
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "address": "123 Main St"
}
```

### 2. User Login

```
POST http://127.0.0.1:8000/api/login/
Content-Type: application/json

{
  "username": "neon_user",
  "password": "neon123"
}
```

**Response:** Save `access` token for API calls

---

## 📝 USER APIs (Use user token)

### 3. Submit Lost Pet Request

```
POST http://127.0.0.1:8000/api/pet/pet-request-form/
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "pet_name": "Max",
  "pet_type": "Dog",
  "pet_breed": "Labrador",
  "pet_age": 5,
  "pet_colour": "Brown",
  "pet_weight": 25.5,
  "pet_gender": "Male",
  "pet_location": "Central Park",
  "pet_city": "Mumbai",
  "pet_state": "Maharashtra",
  "description": "Lost near gate 2",
  "pet_status": "lost",
  "is_vaccinated": true,
  "is_diseased": false
}
```

### 4. Get User Notifications

```
GET http://127.0.0.1:8000/api/user_notifications/
Authorization: Bearer {{user_token}}
```

### 5. Get User Reports (All)

```
GET http://127.0.0.1:8000/api/user_reports/
Authorization: Bearer {{user_token}}
```

### 6. Get User Reports by Tab

```
GET http://127.0.0.1:8000/api/user_reports/?tab=lost
GET http://127.0.0.1:8000/api/user_reports/?tab=found
GET http://127.0.0.1:8000/api/user_reports/?tab=adopt
Authorization: Bearer {{user_token}}
```

### 7. Mark Specific Notification as Read

```
PATCH http://127.0.0.1:8000/api/notifications/13/mark_read/
Authorization: Bearer {{user_token}}
```

_(Replace 13 with actual notification_id)_

### 8. Mark All Notifications as Read

```
PATCH http://127.0.0.1:8000/api/notifications/mark_all_read/
Authorization: Bearer {{user_token}}
```

### 9. Get User Profile

```
GET http://127.0.0.1:8000/api/user-details/
Authorization: Bearer {{user_token}}
```

### 10. Update User Profile

```
PATCH http://127.0.0.1:8000/api/profile/update/
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Updated",
  "phone_no": "9876543210",
  "city": "Delhi",
  "address": "456 New St"
}
```

---

## 👨‍💼 ADMIN APIs (Use admin token)

### 11. Get Admin Notifications

```
GET http://127.0.0.1:8000/api/admin/notifications/
Authorization: Bearer {{admin_token}}
```

### 12. Get Pet Details by ID

```
GET http://127.0.0.1:8000/api/pet/details/7/
Authorization: Bearer {{admin_token}}
```

_(Replace 7 with actual pet_id)_

### 13. Approve Pet Report

```
POST http://127.0.0.1:8000/api/admin/approve_report/7/
Authorization: Bearer {{admin_token}}
```

_(Replace 7 with actual report_id)_

### 14. Admin Dashboard Metrics

```
GET http://127.0.0.1:8000/api/admin/dashboard/metrics/
Authorization: Bearer {{admin_token}}
```

---

## 🔄 Complete Notification Flow

### Step 1: User submits lost pet

```
POST /api/pet/pet-request-form/
→ Returns: pet_id, report_id, notification_id
```

### Step 2: Admin gets notification

```
GET /api/admin/notifications/
→ Shows: New lost pet report notification
```

### Step 3: Admin views pet details

```
GET /api/pet/details/{pet_id}/
→ Shows: Complete pet and medical info
```

### Step 4: Admin approves report

```
POST /api/admin/approve_report/{report_id}/
→ Creates notification for user
```

### Step 5: User gets approval notification

```
GET /api/user_notifications/
→ Shows: Report approved notification
```

---

## 📌 Quick Testing Checklist

- [ ] Register new user
- [ ] Login as user → Get token
- [ ] Submit lost pet request
- [ ] Login as admin → Get admin token
- [ ] Check admin notifications
- [ ] View pet details
- [ ] Approve report
- [ ] Check user notifications
- [ ] Mark notification as read
- [ ] View user profile
- [ ] Update user profile

---

## 🔑 Test Credentials

**Regular User:**

- Username: `neon_user`
- Password: `neon123`

**Admin User:**

- Username: `admin` (or your created admin)
- Must have: `is_staff=True` OR `is_superuser=True` OR `role='admin'`

---

## 🚨 Common Issues & Solutions

### 401 Unauthorized

- Token expired → Login again
- Missing token → Add `Authorization: Bearer <token>` header

### 403 Forbidden (Admin endpoints)

- User not admin → Check `is_staff`, `is_superuser`, or `role='admin'`

### 404 Not Found

- Check URL path
- Ensure Django server is running
- Replace {id} placeholders with actual IDs

### 405 Method Not Allowed

- Check HTTP method (GET/POST/PATCH)
- Some endpoints require specific methods

---

Last Updated: October 8, 2025
