import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuth } from "./context/AuthContext";

function App() {
  const { isAuthenticated, loading, user } = useAuth();

  console.log(
    "App.js - isAuthenticated:",
    isAuthenticated,
    "user:",
    user,
    "loading:",
    loading
  );

  if (loading) {
    return <div className="app">Loading...</div>;
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              user?.role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <UserDashboard />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isAuthenticated && user?.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
      </Routes>
    </div>
  );
}

export default App;
