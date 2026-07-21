# Pet Rescue Project Interview Preparation

This note is based on the current project structure and implementation. The answers are written in simple language so you can revise quickly and explain the project clearly in an interview.

## 1. Project Overview

### 1. What is this project about?
This is a full-stack Pet Rescue application built to help users report lost pets, report found pets, post pets for adoption, and request adoptions. It also has an admin side to review reports, manage users, handle adoption requests, and monitor activity through dashboard metrics.

### 2. What problem does your project solve?
It solves three connected problems in one system: lost pet reporting, found pet reporting, and pet adoption management. Instead of using separate tools or manual communication, users and admins can manage the whole flow from reporting to approval and notification in one platform.

### 3. What technologies did you use in this project?
I used Django and Django REST Framework for the backend, React for the frontend, PostgreSQL as the database, JWT for authentication, Axios and fetch for API calls, and Tailwind CSS for frontend styling. I also used Pillow for image uploads.

### 4. Why did you choose Django REST Framework for the backend?
Django REST Framework helped me build APIs faster because it already provides serializers, authentication support, permissions, generic views, and viewsets. Since my project had many endpoints and role-based access, DRF was a practical choice.

### 5. Why did you choose React for the frontend?
React was useful because the project has multiple dashboards, dynamic forms, protected routes, tab-based screens, and API-driven UI updates. Component-based development made the frontend easier to organize and reuse.

### 6. What was your role in this project?
I worked on the project individually, so I handled both backend and frontend development. That included database design, API creation, authentication, admin workflow, frontend pages, state handling, integration, and testing.

## 2. System Design

### 7. How is your project architecture organized?
The project follows a client-server structure. The React frontend sends requests to Django REST APIs. The backend handles business logic, database operations, authentication, file uploads, and admin actions. The database stores users, pets, reports, adoptions, notifications, and feedback.

### 8. What are the main modules in the backend?
The main backend app is the `api` app, which contains models, serializers, views, and URLs for the core pet rescue features. There is also a separate `feedback` app to manage community feedback with optional images.

### 9. What are the main modules in the frontend?
The frontend has pages like HomePage, LoginPage, RegisterPage, UserDashboard, and AdminDashboard. It also uses an AuthContext for authentication state and a services layer to centralize API calls.

### 10. What are the core entities in your database?
The core entities are User, Pet, PetMedicalHistory, PetReport, PetAdoption, Notification, UserStory, FavouritePet, and Feedback. Each entity supports a specific part of the platform such as pet reporting, adoption flow, user activity, or communication.

## 3. Authentication And Authorization

### 11. How did you implement authentication?
I used JWT authentication with `rest_framework_simplejwt`. On login and registration, the backend returns access and refresh tokens. The frontend stores them in local storage and sends the access token in the `Authorization` header for protected API calls.

### 12. How did you manage authorization in the system?
I used role-based access control. The custom User model has a `role` field with values like `admin` and `user`. On the backend, I check `role`, `is_staff`, and `is_superuser` where needed. On the frontend, protected routes redirect users based on their role.

### 13. How does the frontend keep the user logged in?
The frontend stores `access_token`, `refresh_token`, and user details in local storage. When the app loads, AuthContext reads that data, restores the user session, and sets authentication state without asking the user to log in again immediately.

### 14. How did you handle token expiry?
I used an Axios response interceptor. If an API request returns `401`, the frontend tries to refresh the access token using the refresh token. If refresh also fails, the tokens are cleared and the user is redirected to the login page.

### 15. What is the advantage of using JWT in this project?
JWT made the frontend-backend integration easier because the React app can work with APIs in a stateless way. It is also suitable for role-based routes, dashboard access, and mobile-friendly API usage.

## 4. Database And Models

### 16. Why did you create a custom User model?
I needed extra fields beyond Django’s default user, such as phone number, address, profile picture, city, state, pincode, gender, and role. A custom user model made the application more suitable for real user profiles and admin control.

### 17. How are pets and reports connected?
The `PetReport` model has a foreign key to `Pet`, and it also stores the reporting user and report type such as lost, found, or adopt. This separation helps keep the pet’s core data separate from the reporting workflow and approval status.

### 18. Why did you keep medical history in a separate model?
Medical history is optional and has multiple health-related fields, so keeping it separate avoids overloading the Pet model. It also gives flexibility to extend health information later without affecting the basic pet data structure.

### 19. How is the adoption flow represented in the database?
The `PetAdoption` model links a user to a pet and stores the request status such as pending, approved, rejected, or cancelled. This makes it easy to track request history and admin decisions.

### 20. What is the purpose of the Notification model?
The Notification model stores system messages between users and admins. It includes sender, receiver, message, related pet, read status, and creation time. This supports approval updates, adoption updates, and general workflow communication.

## 5. Backend API Design

### 21. What are the most important APIs in your project?
The most important APIs are user registration, login, user details by token, lost and found pet request submission, admin notifications, pet details by ID, user notifications, adoption request APIs, and admin approval or rejection APIs.

### 22. What is the unified pet request API and why is it important?
The unified pet request API is one of the main parts of the project. It accepts lost, found, or adopt-related pet form data, creates records in multiple tables, and sends admin notifications. It reduces duplication and centralizes the request creation logic.

### 23. How did you handle complex form submission in the backend?
I designed the backend to accept both JSON and multipart form-data. That allowed me to support standard text fields as well as file uploads for pet images in the same endpoint.

### 24. Why did you use database transactions in the unified request API?
I used `transaction.atomic()` so that pet data, medical history, and report creation happen as one unit. If one part fails, the whole transaction is rolled back, which prevents partial or inconsistent data from being saved.

### 25. How did you validate incoming data types?
I added helper functions like `safe_int`, `safe_float`, and `str_to_bool` to safely convert input values. This made the API more reliable when data came from forms, JSON payloads, or file upload requests.

### 26. Why did you use both viewsets and function-based APIs?
I used viewsets for standard CRUD patterns like pets, users, notifications, and reports. I used function-based endpoints where the business logic was more custom, such as unified form submission, admin review flows, token-based detail APIs, and specialized actions.

## 6. Admin Workflow

### 27. What can an admin do in your system?
An admin can view dashboard statistics, review pending pet reports, approve or reject reports, review adoption requests, manage users, search pet records, and access system notifications. The admin side is designed to control quality and keep reports trustworthy.

### 28. What happens when an admin approves a pet report?
When an admin approves a report, the report status is updated and the related pet status is also adjusted depending on the report type. After that, the system creates a notification for the user so they know the report has been processed.

### 29. Did you implement bulk actions for admins?
Yes. I added helper functions to bulk approve or reject multiple reports and adoption requests. This makes admin work more efficient when there are many pending items.

### 30. What kind of metrics are shown in the admin dashboard?
The dashboard shows metrics such as total pets, approved adoptions, lost and found counts, total users, resolved cases, pending reports, adoption statistics, and some recent activity numbers. These help the admin understand system usage and workload quickly.

## 7. Search, Matching, And Notifications

### 31. How did you implement search functionality?
I added search endpoints that can filter pets by query text, breed, location, and type. I used Django ORM filters with `Q` objects to combine multiple search conditions in a readable way.

### 32. What is the reunification system in your project?
The reunification system is a matching feature that tries to connect lost and found pet reports. It compares approved unresolved reports and ranks possible matches using a similarity score.

### 33. How do you calculate the similarity score for lost and found pets?
The score is based on breed, location, color, and age. Breed has high weight, location and color have medium weight, and age has lower weight. This gives a practical rule-based matching approach without needing machine learning.

### 34. Why did you call it an AI-like matching system instead of real AI?
Because it behaves like a smart matching feature, but it is not trained using machine learning models. It uses weighted rule-based comparison logic, which is simpler to build and explain while still being useful.

### 35. How does the notification system help the workflow?
Notifications connect users and admins across the full process. For example, when a user submits a request, admins receive alerts. When admins approve or reject a report or adoption request, users receive updates. This keeps the system interactive and transparent.

## 8. Frontend Implementation

### 36. How did you protect routes in the frontend?
In `App.js`, I used conditional routing based on authentication state and user role. Regular users are directed to the user dashboard, admins are redirected to the admin dashboard, and unauthenticated users are sent to the login page.

### 37. What is the purpose of AuthContext in your frontend?
AuthContext centralizes authentication state and methods like login, register, logout, and session restoration. It avoids passing auth data through many components and keeps the app easier to maintain.

### 38. Why did you use both Axios and fetch in the frontend?
I used Axios for most standard API calls because interceptors made authentication and token refresh easier. I used fetch for some multipart file uploads because it handled FormData more directly without content-type issues.

### 39. What features are available in the user dashboard?
The user dashboard includes lost reports, rescue or found-related actions, available pets for adoption, adoption posts, adoption requests, notifications, profile options, dark mode, community feedback, and a chatbot-like helper component.

### 40. What features are available in the admin dashboard?
The admin dashboard includes metrics, pending lost and found reports, adoption requests, adoption posts, search and filters, notifications, profile management, records views, and community feedback handling.

### 41. How did you support dark mode?
I stored theme preference in local storage and used state to restore the selected mode when the dashboard loads. This improved user experience because the visual preference remains consistent across sessions.

## 9. File Uploads And Media

### 42. How did you manage image uploads in this project?
I used Django `ImageField` for pet images, profile pictures, and feedback images. On the backend, media files are served through Django in development mode, and on the frontend I built helper functions to generate full image URLs.

### 43. What challenges usually come with file upload APIs?
The main challenges are handling multipart requests, ensuring correct content type handling, storing files safely, and returning valid image URLs back to the frontend. I addressed this by supporting `FormData` and checking uploaded files explicitly in the backend.

## 10. Security, Validation, And Reliability

### 44. What security measures did you apply in this project?
I applied JWT-based authentication, role-based authorization, password hashing through Django’s user system, protected routes, and permission checks on admin endpoints. I also configured CORS to allow the frontend to communicate with the backend during development.

### 45. What validations did you add in the project?
I added required field checks for login, registration, and password reset, duplicate checks for username and email, duplicate prevention for some adoption requests and favourites, and safe input conversion for numeric and boolean fields.

### 46. How did you make the backend more reliable?
I used serializers for model conversion, transactions for multi-table operations, helper functions for safer type handling, separate endpoints for special workflows, and consistent notification creation after key actions.

### 47. If asked about improvements, what would you say?
I would say I would move all sensitive values like secret keys and database credentials into environment variables, add more automated tests, improve permission consistency across all endpoints, and clean up some duplicated logic in the views file into dedicated service layers.

## 11. Challenges And Decisions

### 48. What was the most challenging part of the project?
One challenging part was handling a large workflow that touches multiple features at once, such as form submission, image upload, pet creation, report creation, medical data storage, notification generation, and admin review. Making that reliable required careful backend design.

### 49. What was a good technical decision you made in this project?
Creating a unified request flow was a strong decision because it simplified the frontend and centralized the backend logic. It also made the feature easier to extend later.

### 50. Why is this project stronger than a simple CRUD project?
This project goes beyond CRUD because it has role-based access, JWT auth, dashboard-specific flows, approval pipelines, notifications, file uploads, search and filtering, matching logic, feedback handling, and a more realistic multi-user workflow.

## 12. Testing, Deployment, And Ownership

### 51. How did you test your project?
I tested the project by running the frontend and backend together, calling APIs through the UI and direct endpoints, checking role-based access, verifying token flow, testing image uploads, and validating notification and approval workflows.

### 52. What database are you using now?
The current settings show PostgreSQL, specifically a hosted Neon database. That is better than SQLite for a more realistic multi-user application and remote deployment scenarios.

### 53. What would you say if the interviewer asks whether the project is production-ready?
I would say the project has strong core features and real workflow handling, but for production I would still improve secret management, deployment settings, automated testing, logging, and endpoint cleanup. So it is a solid working application, but not the final production version yet.

### 54. What did you learn from building this project alone?
I learned how to manage both backend and frontend responsibilities, design a data model around a real problem, connect authentication with UI state, build admin workflows, and think beyond isolated features by focusing on complete user journeys.

### 55. How would you summarize this project in an interview?
I would say this is a full-stack pet rescue and adoption platform where users can report lost or found pets, post pets for adoption, and track updates, while admins manage approvals and system activity. I built it end to end using Django REST Framework, React, PostgreSQL, JWT authentication, notifications, and dashboard workflows.

## 13. Short HR-Style Project Questions

### 56. Why did you choose this project idea?
I chose this project because it solves a real-world community problem and gave me a chance to build something with practical workflows instead of only basic CRUD screens.

### 57. What makes your project different from a basic student project?
It includes a custom user model, role-based dashboards, token authentication, file uploads, notifications, admin review flows, matching logic, and a full frontend-backend integration. That makes it closer to a real product.

### 58. If you had more time, what would you add?
I would add email notifications, stronger testing, better activity logs, deployment-ready environment configuration, improved analytics, and maybe a more advanced matching system using image or location intelligence.

### 59. What part of the project are you most confident explaining?
I am most confident explaining the backend workflow, especially the unified pet request API, authentication, data model design, admin approval flow, and notification system because those are central to how the application works.

### 60. What should an interviewer remember most about this project?
They should remember that it is a complete workflow-based full-stack application, not just isolated pages. It shows that I can design models, build APIs, handle auth, connect a React frontend, and manage user and admin use cases in one system.
