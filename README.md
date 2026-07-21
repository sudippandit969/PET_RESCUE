# 🐾 Pet Rescue & Adoption Portal

![Live Demo](https://img.shields.io/badge/Live_Demo-petrescue--seven.vercel.app-brightgreen)
![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Django](https://img.shields.io/badge/Django-5.1-092E20.svg)
![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)

**[Visit the Live Application Here](https://petrescue-seven.vercel.app/)**

Welcome to the **Pet Rescue & Adoption Portal**! This is a full-stack web application designed to connect pet lovers, facilitate animal adoptions, and help reunite lost pets with their owners.

## 🚀 Features

*   **Pet Adoption System:** Browse available pets for adoption, submit adoption requests, and view detailed pet profiles.
*   **Lost & Found Reports:** Report lost or found pets with images, descriptions, and locations to alert the community.
*   **User Dashboards:** Dedicated profiles for users to track their adoption requests, rescue reports, and favorite pets.
*   **Admin Dashboard:** A comprehensive administrative panel to review adoption requests, moderate reports, and manage user accounts.
*   **Community Stories:** Share rescue success stories and experiences.
*   **Real-time Notifications:** Receive updates on the status of your adoption requests and reports.

## 💻 Tech Stack

### Frontend
*   **React (v18)** - Component-based UI
*   **React Router** - Client-side routing
*   **Axios** - API communication
*   **Framer Motion** - Animations and transitions

### Backend
*   **Django & Django REST Framework** - Robust backend API and business logic
*   **PostgreSQL** - Relational database for structured data storage
*   **JWT (Simple JWT)** - Secure user authentication

### Deployment
*   **Frontend Hosting:** Vercel
*   **Backend Hosting:** Render
*   **Database Hosting:** Neon (PostgreSQL)

## 🛠️ Local Development Setup

If you want to run this project locally on your machine, follow these steps:

### Backend Setup
1. Navigate to the root directory.
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Run database migrations:
   ```bash
   python manage.py migrate
   ```
4. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd pet-rescue-frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```

---
*Built with ❤️ for animals in need.*
