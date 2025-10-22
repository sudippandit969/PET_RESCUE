# 🐾 Pet Rescue Application

A comprehensive full-stack web application for reporting lost/found pets and facilitating pet adoptions. Built with Django REST Framework backend and React frontend.

## ✨ Features

### User Features

- 🔐 User authentication (Register/Login/Logout)
- 📝 Report lost pets with detailed information
- 👀 Report found pets
- 🔍 Browse all lost/found pet reports
- ❤️ Explore pets available for adoption
- 📤 Post pets for adoption
- 🔔 Real-time notifications
- 👤 User profile management
- 🌙 Dark mode support
- 📱 Responsive design

### Admin Features

- 📊 Comprehensive admin dashboard
- ✅ Approve/Reject lost/found reports
- ✅ Manage adoption requests
- 👥 User management
- 🔍 Advanced search and filtering
- 📈 Dashboard statistics
- 🌙 Dark mode support

## 🛠️ Tech Stack

### Backend

- **Django 4.x** - Web framework
- **Django REST Framework** - RESTful API
- **SQLite** - Database
- **JWT Authentication** - Token-based auth
- **Pillow** - Image processing

### Frontend

- **React 18** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Material Icons** - Icons

## 📋 Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

## 🚀 Installation & Setup

### Backend Setup

1. Navigate to project root:

```bash
cd PET_RESCUE1
```

2. Create and activate virtual environment:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. Install Python dependencies:

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers pillow
```

4. Run migrations:

```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create superuser (admin):

```bash
python manage.py createsuperuser
```

6. Start Django server:

```bash
python manage.py runserver
```

Backend will run at: `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd pet-rescue-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start React development server:

```bash
npm start
```

Frontend will run at: `http://localhost:3000`

## 📁 Project Structure

```
PET_RESCUE1/
├── api/                          # Django app
│   ├── models.py                # Database models
│   ├── serializers.py           # DRF serializers
│   ├── views.py                 # API endpoints
│   └── urls.py                  # API routes
├── pet-rescue-frontend/         # React app
│   ├── public/
│   └── src/
│       ├── components/          # Reusable components
│       ├── context/             # React context (Auth)
│       ├── pages/               # Page components
│       │   ├── AdminDashboard.js
│       │   ├── UserDashboard.js
│       │   ├── HomePage.js
│       │   ├── LoginPage.js
│       │   └── RegisterPage.js
│       ├── services/            # API services
│       └── App.js               # Main app component
├── media/                       # User uploaded files
├── manage.py
└── README.md
```

## 🔑 Environment Variables

Create a `.env` file in the root directory (optional):

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

## 👥 User Roles

### Regular User

- Report lost/found pets
- View all reports
- Request pet adoption
- Manage own reports
- Update profile

### Admin

- All user features
- Approve/reject reports
- Manage adoption requests
- Access admin dashboard
- View statistics

## 🎨 Key Features Details

### Dark Mode

- System-wide dark mode toggle
- Persists across sessions
- Available in both User and Admin dashboards

### Toast Notifications

- Success/error messages as elegant popups
- Auto-dismiss after 2 seconds
- Smooth slide-in animations

### Real-time Updates

- Notification system for important events
- Adoption request status updates
- Report approval notifications

## 🐛 Known Issues & Solutions

### CORS Issues

If you face CORS errors, ensure `django-cors-headers` is properly configured in `settings.py`.

### Port Already in Use

- Backend: Change port with `python manage.py runserver 8001`
- Frontend: Change port in `package.json` or when prompted

## 📝 API Endpoints

### Authentication

- `POST /api/register/` - User registration
- `POST /api/login/` - User login
- `POST /api/logout/` - User logout

### Pets

- `GET /api/lost_reports/` - Get lost reports
- `POST /api/report_lost/` - Report lost pet
- `GET /api/found_reports/` - Get found reports
- `POST /api/report_found/` - Report found pet
- `GET /api/available_pets/` - Get pets for adoption
- `POST /api/post_adoption/` - Post pet for adoption

### Admin

- `POST /api/admin/approve-report/<id>/` - Approve report
- `POST /api/admin/reject-report/<id>/` - Reject report
- `GET /api/admin/dashboard-stats/` - Get dashboard statistics

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For questions or support, please open an issue on GitHub.

## 📄 License

This project is open source and available under the MIT License.

---

**Made with ❤️ for Pet Lovers**
