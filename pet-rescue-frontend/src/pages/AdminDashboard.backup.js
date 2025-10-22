import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { userAPI, petsAPI, adminAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

// Helper function to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return "/default-pet.png";
  if (imagePath.startsWith("http")) return imagePath;
  return `http://localhost:8000${imagePath}`;
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  console.log("AdminDashboard rendered. User:", user);
  
  // State management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState(null);
  
  // Pending Requests
  const [pendingLostReports, setPendingLostReports] = useState([]);
  const [pendingFoundReports, setPendingFoundReports] = useState([]);
  const [pendingAdoptionRequests, setPendingAdoptionRequests] = useState([]);
  const [pendingAdoptionPosts, setPendingAdoptionPosts] = useState([]);
  
  // All Pets
  const [allLostPets, setAllLostPets] = useState([]);
  const [allAdoptionPets, setAllAdoptionPets] = useState([]);
  
  // Search and Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalType, setModalType] = useState(""); // 'report' or 'adoption'
  
  // Profile Dropdown
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Notification Detail Modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Profile Edit State
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_no: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gender: "",
    profile_picture: null,
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    console.log("Admin check - User role:", user?.role);
    if (user && user.role !== 'admin') {
      console.log("Not admin, redirecting to /dashboard");
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load initial data
  useEffect(() => {
    console.log("Load data effect - User role:", user?.role);
    if (user?.role === 'admin') {
      console.log("Loading admin data...");
      loadAllData();
    }
  }, [user]);

  // Auto-hide messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadAllData = async () => {
    console.log("loadAllData started");
    setLoading(true);
    try {
      await Promise.all([
        loadDashboardStats(),
        loadPendingReports(),
        loadPendingAdoptions(),
        loadAllPets(),
        loadNotifications(),
      ]);
      console.log("loadAllData completed successfully");
    } catch (err) {
      console.error("Error loading admin data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      if (response.data.success) {
        setDashboardStats(response.data.stats);
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const loadPendingReports = async () => {
    try {
      console.log("Loading pending reports from admin API...");
      const response = await adminAPI.getPendingReports();
      console.log("Pending reports response:", response.data);
      
      if (response.data.success) {
        const reports = response.data.reports || [];
        console.log("Total pending reports:", reports.length);
        
        const lost = reports.filter(r => r.report_type === 'LOST');
        const found = reports.filter(r => r.report_type === 'RESCUE' || r.report_type === 'FOUND');
        
        console.log("Lost reports:", lost.length, "Found reports:", found.length);
        
        setPendingLostReports(lost);
        setPendingFoundReports(found);
      }
    } catch (err) {
      console.error("Error loading pending reports:", err);
      console.error("Error details:", err.response?.data);
    }
  };

  const loadPendingAdoptions = async () => {
    try {
      const response = await adminAPI.filterAdoptionRequests({ status: 'pending' });
      if (response.data.success) {
        setPendingAdoptionRequests(response.data.adoptions || []);
      }
      
      const postsResponse = await adminAPI.getPendingAdoptionPosts();
      if (postsResponse.data.success) {
        setPendingAdoptionPosts(postsResponse.data.posts || []);
      }
    } catch (err) {
      console.error("Error loading pending adoptions:", err);
    }
  };

  const loadAllPets = async () => {
    try {
      const lostResponse = await userAPI.getAllLostReports();
      if (lostResponse.data.success) {
        setAllLostPets(lostResponse.data.reports || []);
      }
      
      const adoptResponse = await userAPI.getAvailableAdoptionPets();
      if (adoptResponse.data.success) {
        setAllAdoptionPets(adoptResponse.data.pets || []);
      }
    } catch (err) {
      console.error("Error loading all pets:", err);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await adminAPI.getNotifications();
      if (response.data.success) {
        const notifs = response.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    console.log("Notification clicked:", notification);
    try {
      // Mark notification as read
      await adminAPI.markNotificationRead(notification.id);
      console.log("Notification marked as read");

      // Update local state
      const updatedNotifications = notifications.map((n) =>
        n.id === notification.id
          ? { ...n, is_read: true }
          : n
      );
      setNotifications(updatedNotifications);

      // Update unread count
      const newUnreadCount = updatedNotifications.filter(
        (n) => !n.is_read
      ).length;
      setUnreadCount(newUnreadCount);

      // Show notification details in modal
      setSelectedNotification({ ...notification, is_read: true });
      setShowNotificationModal(true);
      console.log("Opening modal with notification:", { ...notification, is_read: true });
      setShowNotifications(false); // Close the dropdown
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleApproveReport = async (reportId) => {
    try {
      setLoading(true);
      await adminAPI.approveReport(reportId);
      setSuccessMessage("Report approved successfully!");
      await loadAllData();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve report");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReport = async (reportId) => {
    try {
      setLoading(true);
      await adminAPI.rejectReport(reportId);
      setSuccessMessage("Report rejected successfully!");
      await loadAllData();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject report");
    } finally {
      setLoading(false);
    }
  };

  // Profile Management Functions
  const loadProfile = async () => {
    try {
      const response = await userAPI.getUserDetails();
      if (response.data.success) {
        const userData = response.data.user;
        setProfileData({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          phone_no: userData.phone_no || "",
          address: userData.address || "",
          city: userData.city || "",
          state: userData.state || "",
          pincode: userData.pincode || "",
          gender: userData.gender || "",
          profile_picture: userData.profile_picture,
        });

        if (userData.profile_picture) {
          setProfileImagePreview(getImageUrl(userData.profile_picture));
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      Object.keys(profileData).forEach((key) => {
        if (key !== "profile_picture" && profileData[key]) {
          formData.append(key, profileData[key]);
        }
      });

      if (profileImage) {
        formData.append("profile_picture", profileImage);
      }

      const response = await userAPI.updateProfile(formData);
      if (response.data.success) {
        setSuccessMessage("Profile updated successfully!");
        setIsEditingProfile(false);
        setProfileImage(null); // Reset the file input
        await loadProfile();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Load profile when profile tab is active
  useEffect(() => {
    if (activeTab === "profile" && user?.role === 'admin') {
      loadProfile();
    }
  }, [activeTab, user]);

  const handleApproveAdoption = async (adoptionId) => {
    try {
      setLoading(true);
      await adminAPI.approveAdoption(adoptionId);
      setSuccessMessage("Adoption request approved successfully!");
      await loadAllData();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve adoption");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAdoption = async (adoptionId) => {
    try {
      setLoading(true);
      await adminAPI.rejectAdoption(adoptionId);
      setSuccessMessage("Adoption request rejected successfully!");
      await loadAllData();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject adoption");
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setShowDetailModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header - Matching UserDashboard Style */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-slate-50/95 to-blue-50/95 shadow-lg border-b border-blue-200">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                PET_RESCUE_APP - ADMIN
              </div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-lg font-semibold text-primary-blue">
                ADMIN PANEL: {user?.username?.toUpperCase() || "ADMIN"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Refresh Button */}
              <button
                className="p-2 rounded-full hover:bg-blue-100 transition-all duration-300 disabled:opacity-50"
                onClick={loadAllData}
                disabled={loading}
                title="Refresh Data"
              >
                <span className="material-icons text-primary-blue">
                  refresh
                </span>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  className="p-2 rounded-full hover:bg-blue-100 transition-all duration-300 relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <span className="material-icons text-primary-blue">
                    notifications
                  </span>
                  {unreadCount > 0 && !showNotifications && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-2xl border border-blue-200 overflow-hidden z-50 max-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-blue to-primary-teal border-b border-blue-200">
                      <h3 className="text-white font-semibold text-lg">
                        Notifications
                      </h3>
                      <button
                        className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNotifications(false);
                        }}
                      >
                        <span className="text-2xl leading-none">×</span>
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <span className="material-icons text-6xl mb-2">
                            notifications_none
                          </span>
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer ${
                              notif.is_read
                                ? "bg-slate-50"
                                : "bg-blue-50/50"
                            }`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className={`text-sm ${
                                  notif.is_read
                                    ? "text-gray-600"
                                    : "text-gray-800 font-bold"
                                }`}>
                                  {notif.message}
                                </p>
                                <span className="text-xs text-gray-400 mt-2 block">
                                  {new Date(
                                    notif.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-teal text-white font-bold text-lg flex items-center justify-center hover:shadow-lg transition-all duration-300 hover:scale-110"
                  onClick={() => setShowProfileDropdown((prev) => !prev)}
                >
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </button>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-xl border border-blue-200 overflow-hidden z-50">
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-blue-100 transition-colors text-gray-700 hover:text-primary-blue font-medium"
                      onClick={() => {
                        setActiveTab("profile");
                        setShowProfileDropdown(false);
                      }}
                    >
                      Edit Profile
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors text-red-600 hover:text-red-700 font-medium border-t border-gray-100"
                      onClick={() => {
                        localStorage.removeItem("token");
                        window.location.href = "/login";
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Success/Error Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg animate-slideUp">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-lg animate-slideUp">
            <p className="font-bold">Success</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 100px)" }}>
        {/* Horizontal Navigation Bar - Full Width */}
        <nav className="bg-gradient-to-r from-primary-blue via-primary-teal to-primary-teal border-t border-blue-200">
          <ul className="flex items-center justify-center gap-1 px-4 max-w-7xl mx-auto overflow-x-auto">
            <li
              className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="material-icons text-lg">dashboard</span>
              <span className="font-semibold text-xs">DASHBOARD</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                activeTab === "pending-reports"
                  ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => setActiveTab("pending-reports")}
            >
              <span className="material-icons text-lg">pending_actions</span>
              <span className="font-semibold text-xs">PENDING REPORTS</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                activeTab === "pending-adoptions"
                  ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => setActiveTab("pending-adoptions")}
            >
              <span className="material-icons text-lg">home</span>
              <span className="font-semibold text-xs">ADOPTIONS</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                activeTab === "all-pets"
                  ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => setActiveTab("all-pets")}
            >
              <span className="material-icons text-lg">pets</span>
              <span className="font-semibold text-xs">ALL PETS</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                activeTab === "search"
                  ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => setActiveTab("search")}
            >
              <span className="material-icons text-lg">search</span>
              <span className="font-semibold text-xs">SEARCH</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                activeTab === "notifications"
                  ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => setActiveTab("notifications")}
            >
              <span className="material-icons text-lg">notifications</span>
              <span className="font-semibold text-xs">NOTIFICATIONS</span>
            </li>
          </ul>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <main>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Dashboard Overview */}
            {activeTab === "dashboard" && (
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl p-8 border border-blue-100">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <span className="material-icons text-3xl text-primary-blue">dashboard</span>
                  <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                    DASHBOARD OVERVIEW
                  </span>
                </h2>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-icons text-4xl text-primary-blue">pending_actions</span>
                      <span className="text-3xl font-bold text-primary-blue">
                        {pendingLostReports.length + pendingFoundReports.length}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Pending Reports
                    </h3>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-icons text-4xl text-primary-teal">home</span>
                      <span className="text-3xl font-bold text-primary-teal">
                        {pendingAdoptionRequests.length + pendingAdoptionPosts.length}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Adoption Requests
                    </h3>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-icons text-4xl text-purple-600">pets</span>
                      <span className="text-3xl font-bold text-purple-600">
                        {allLostPets.length}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Lost Reports
                    </h3>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-icons text-4xl text-pink-600">favorite</span>
                      <span className="text-3xl font-bold text-pink-600">
                        {allAdoptionPets.length}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Adoption Pets
                    </h3>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="material-icons text-primary-blue">flash_on</span>
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab("pending-reports")}
                      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary-blue to-primary-teal text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      <span className="material-icons">pending_actions</span>
                      <span className="font-semibold">View Reports</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("pending-adoptions")}
                      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      <span className="material-icons">home</span>
                      <span className="font-semibold">Adoptions</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("all-pets")}
                      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      <span className="material-icons">pets</span>
                      <span className="font-semibold">All Pets</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("search")}
                      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      <span className="material-icons">search</span>
                      <span className="font-semibold">Search</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Reports Section */}
            {activeTab === "pending-reports" && (
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl p-8 border border-blue-100">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <span className="material-icons text-3xl text-primary-blue">pending_actions</span>
                  <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                    PENDING REPORTS
                  </span>
                </h2>

                {/* Lost Pet Reports */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 text-primary-blue flex items-center gap-2">
                    <span className="material-icons">report</span>
                    Lost Pet Reports ({pendingLostReports.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingLostReports.length > 0 ? (
                      pendingLostReports.map((report) => (
                        <div
                          key={report.id}
                          className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100"
                        >
                          <div className="relative h-56 overflow-hidden">
                            <img
                              src={getImageUrl(report.photo)}
                              alt={report.pet_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = "/default-pet.png";
                              }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                              <h3 className="text-white font-bold text-lg">
                                {report.pet_name}
                              </h3>
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
                                PENDING
                              </span>
                            </div>
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="inline-block px-3 py-1 bg-blue-100 text-primary-blue rounded-full text-sm font-semibold">
                              {report.animal_type}
                            </div>
                            <div className="space-y-2">
                              {report.pet_breed && (
                                <span className="block text-gray-700 text-sm">
                                  <span className="font-semibold">Breed:</span> {report.pet_breed}
                                </span>
                              )}
                              {report.pet_location && (
                                <span className="flex items-center gap-1 text-gray-700 text-sm">
                                  <span className="material-icons text-xs">location_on</span>
                                  {report.pet_location}
                                </span>
                              )}
                              <span className="block text-gray-600 text-sm">
                                <span className="font-semibold">By:</span> {report.owner_username || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-500">
                                {new Date(report.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-2 pt-3">
                              <button
                                onClick={() => handleApproveReport(report.id)}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleRejectReport(report.id)}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <span className="text-6xl block mb-4">✅</span>
                    <p className="text-gray-500 text-lg">No pending lost pet reports</p>
                  </div>
                )}
              </div>
            </div>

            {/* Found/Rescue Pet Reports */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
                <span className="material-icons">visibility</span>
                Pending Rescue Reports ({pendingFoundReports.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingFoundReports.length > 0 ? (
                  pendingFoundReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-green-100"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={getImageUrl(report.photo)}
                          alt={report.pet_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "/default-pet.png";
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <h3 className="text-white font-bold text-lg">
                            {report.pet_name}
                          </h3>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
                            PENDING
                          </span>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                          {report.animal_type}
                        </div>
                        <div className="space-y-2">
                          {report.pet_breed && (
                            <span className="block text-gray-700 text-sm">
                              <span className="font-semibold">Breed:</span> {report.pet_breed}
                            </span>
                          )}
                          {report.pet_location && (
                            <span className="flex items-center gap-1 text-gray-700 text-sm">
                              <span className="material-icons text-xs">location_on</span>
                              {report.pet_location}
                            </span>
                          )}
                          <span className="block text-gray-600 text-sm">
                            <span className="font-semibold">By:</span> {report.owner_username || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-3">
                          <button
                            onClick={() => handleApproveReport(report.id)}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRejectReport(report.id)}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <span className="text-6xl block mb-4">✅</span>
                    <p className="text-gray-500 text-lg">No pending rescue reports</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending Adoptions Tab */}
        {activeTab === "pending-adoptions" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
              Pending Adoption Requests
            </h2>

            {/* Adoption Requests */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-purple-600 flex items-center gap-2">
                <span>🏠</span>
                Adoption Requests ({pendingAdoptionRequests.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {pendingAdoptionRequests.length > 0 ? (
                  pendingAdoptionRequests.map((adoption) => (
                    <div
                      key={adoption.id}
                      className="bg-gradient-to-r from-purple-50 to-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-purple-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            src={getImageUrl(adoption.pet_image)}
                            alt={adoption.pet_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "/default-pet.png";
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-xl font-bold text-gray-800">
                                {adoption.pet_name}
                              </h4>
                              <p className="text-gray-600">
                                Requested by: <strong>{adoption.user_name}</strong>
                              </p>
                              <p className="text-gray-600 mt-2">
                                <strong>Reason:</strong> {adoption.reason || "No reason provided"}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Requested on: {new Date(adoption.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                              PENDING
                            </span>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => viewDetails(adoption, 'adoption-request')}
                              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleApproveAdoption(adoption.id)}
                              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleRejectAdoption(adoption.id)}
                              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <span className="text-6xl block mb-4">✅</span>
                    <p className="text-gray-500 text-lg">No pending adoption requests</p>
                  </div>
                )}
              </div>
            </div>

            {/* Adoption Posts */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-pink-600 flex items-center gap-2">
                <span>❤️</span>
                Pending Adoption Posts ({pendingAdoptionPosts.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingAdoptionPosts.length > 0 ? (
                  pendingAdoptionPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-gradient-to-br from-pink-50 to-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-pink-200"
                    >
                      <div className="relative h-56 overflow-hidden rounded-t-xl">
                        <img
                          src={getImageUrl(post.image)}
                          alt={post.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "/default-pet.png";
                          }}
                        />
                        <div className="absolute top-2 right-2">
                          <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                            PENDING
                          </span>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <h4 className="text-xl font-bold text-gray-800">
                          {post.name}
                        </h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Type:</strong> {post.type}</p>
                          {post.breed && <p><strong>Breed:</strong> {post.breed}</p>}
                          <p><strong>Age:</strong> {post.age} years</p>
                          <p><strong>Posted by:</strong> {post.owner_username || "Unknown"}</p>
                        </div>
                        <div className="flex gap-2 pt-3">
                          <button
                            onClick={() => viewDetails(post, 'adoption-post')}
                            className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-semibold"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleApproveReport(post.report_id)}
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRejectReport(post.report_id)}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <span className="text-6xl block mb-4">✅</span>
                    <p className="text-gray-500 text-lg">No pending adoption posts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* All Pets Tab */}
        {activeTab === "all-pets" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
              All Pets
            </h2>

            {/* Lost Pets */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-blue-600 flex items-center gap-2">
                <span>🔍</span>
                All Lost Pets ({allLostPets.filter(p => p.report_status === 'ACCEPTED').length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {allLostPets.filter(p => p.report_status === 'ACCEPTED').map((pet) => (
                  <div
                    key={pet.id}
                    className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200"
                  >
                    <div className="relative h-48 overflow-hidden rounded-t-xl">
                      <img
                        src={getImageUrl(pet.photo)}
                        alt={pet.pet_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "/default-pet.png";
                        }}
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-gray-800">{pet.pet_name}</h4>
                      <p className="text-sm text-gray-600">{pet.animal_type}</p>
                      <p className="text-xs text-gray-500">{pet.pet_location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adoption Pets */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-pink-600 flex items-center gap-2">
                <span>❤️</span>
                Pets Available for Adoption ({allAdoptionPets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {allAdoptionPets.map((pet) => (
                  <div
                    key={pet.id}
                    className="bg-gradient-to-br from-pink-50 to-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-pink-200"
                  >
                    <div className="relative h-48 overflow-hidden rounded-t-xl">
                      <img
                        src={getImageUrl(pet.image)}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "/default-pet.png";
                        }}
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-gray-800">{pet.name}</h4>
                      <p className="text-sm text-gray-600">{pet.type}</p>
                      <p className="text-xs text-gray-500">{pet.age} years • {pet.gender}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
              Search & Filter Pets
            </h2>

            {/* Search Filters */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Search by name, breed, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="bird">Bird</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="lost">Lost</option>
                  <option value="adopt">Available for Adoption</option>
                </select>
              </div>
            </div>

            {/* Search Results */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">
                Search Results
              </h3>
              <p className="text-gray-600">
                Showing results for: <strong>{searchQuery || "All"}</strong>
              </p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Search results will be filtered here */}
                <div className="col-span-full text-center py-16">
                  <span className="text-6xl block mb-4">🔍</span>
                  <p className="text-gray-500 text-lg">Enter search criteria to find pets</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl p-8 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-icons text-3xl text-primary-blue">person</span>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                PROFILE MANAGEMENT
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Profile Image Section */}
              <div className="md:col-span-1 flex flex-col items-center">
                <div className="relative w-48 h-48 mb-6">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover border-4 border-primary-blue shadow-xl"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center border-4 border-primary-blue shadow-xl">
                      <span className="material-icons text-6xl text-primary-blue">person</span>
                    </div>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="w-full">
                    <label
                      htmlFor="profile-image-input"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-blue to-primary-teal text-white rounded-xl cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      <span className="material-icons">photo_camera</span>
                      <span className="font-semibold">Change Photo</span>
                    </label>
                    <input
                      id="profile-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Profile Details Section */}
              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 mb-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">
                        {profileData.first_name}{" "}
                        {profileData.last_name || user?.username}
                      </h3>
                      <p className="text-gray-500 mt-1">{profileData.email}</p>
                    </div>

                    {!isEditingProfile ? (
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-blue to-primary-teal text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <span className="material-icons text-sm">edit</span>
                        <span className="font-semibold">Edit Profile</span>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleProfileSubmit}
                          disabled={submitLoading}
                        >
                          <span className="material-icons text-sm">save</span>
                          <span className="font-semibold">{submitLoading ? "Saving..." : "Save"}</span>
                        </button>
                        <button
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                          onClick={() => {
                            setIsEditingProfile(false);
                            setProfileImage(null);
                            setProfileImagePreview(getImageUrl(profileData.profile_picture));
                          }}
                        >
                          <span className="material-icons text-sm">cancel</span>
                          <span className="font-semibold">Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            First Name
                          </label>
                          <input
                            type="text"
                            name="first_name"
                            value={profileData.first_name}
                            onChange={handleProfileInputChange}
                            placeholder="Enter first name"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            name="last_name"
                            value={profileData.last_name}
                            onChange={handleProfileInputChange}
                            placeholder="Enter last name"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={profileData.email}
                            onChange={handleProfileInputChange}
                            placeholder="Enter email address"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone_no"
                            value={profileData.phone_no}
                            onChange={handleProfileInputChange}
                            placeholder="Enter phone number"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={profileData.city}
                            onChange={handleProfileInputChange}
                            placeholder="Enter city"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            State
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={profileData.state}
                            onChange={handleProfileInputChange}
                            placeholder="Enter state"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            PIN Code
                          </label>
                          <input
                            type="text"
                            name="pincode"
                            value={profileData.pincode}
                            onChange={handleProfileInputChange}
                            placeholder="Enter PIN code"
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Gender
                          </label>
                          <select
                            name="gender"
                            value={profileData.gender}
                            onChange={handleProfileInputChange}
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200 bg-white"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Address
                        </label>
                        <textarea
                          name="address"
                          value={profileData.address}
                          onChange={handleProfileInputChange}
                          placeholder="Enter complete address"
                          rows="3"
                          className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all duration-200 resize-none"
                        />
                      </div>
                    </form>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Phone</span>
                        <p className="text-lg font-semibold text-gray-800 mt-1">
                          {profileData.phone_no || "Not provided"}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">City</span>
                        <p className="text-lg font-semibold text-gray-800 mt-1">
                          {profileData.city || "Not provided"}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">State</span>
                        <p className="text-lg font-semibold text-gray-800 mt-1">
                          {profileData.state || "Not provided"}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">PIN Code</span>
                        <p className="text-lg font-semibold text-gray-800 mt-1">
                          {profileData.pincode || "Not provided"}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Gender</span>
                        <p className="text-lg font-semibold text-gray-800 mt-1">
                          {profileData.gender || "Not provided"}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl md:col-span-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Address</span>
                        <p className="text-lg font-semibold text-gray-800 mt-1">
                          {profileData.address || "Not provided"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl p-8 border border-blue-100">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="material-icons text-3xl text-primary-blue">notifications</span>
              <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                NOTIFICATIONS
              </span>
            </h2>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔕</div>
                  <p className="text-gray-500 text-lg">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                      notification.is_read
                        ? "bg-gray-50 border-gray-300"
                        : "bg-blue-50 border-primary-blue shadow-sm"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? "text-gray-600"
                              : "text-gray-800 font-bold"
                          }`}
                        >
                          {notification.message}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(
                          notification.created_at
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  </div>

  {/* Notification Detail Modal */}
  {showNotificationModal && selectedNotification && (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={() => setShowNotificationModal(false)}
    >
      <div
        className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-blue-200 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary-blue to-primary-teal p-6 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-icons text-white text-3xl">
                notifications_active
              </span>
              <h2 className="text-2xl font-bold text-white">
                Notification Details
              </h2>
            </div>
            <button
              onClick={() => setShowNotificationModal(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <span className="material-icons text-white">close</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Notification Status */}
            <div className="flex items-center gap-2">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  selectedNotification.is_read
                    ? "bg-gray-200 text-gray-700"
                    : "bg-blue-500 text-white"
                }`}
              >
                {selectedNotification.is_read ? "Read" : "Unread"}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(selectedNotification.created_at).toLocaleString()}
              </span>
            </div>

            {/* Notification Title (if exists) */}
            {selectedNotification.title && (
              <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="material-icons text-primary-blue">title</span>
                  {selectedNotification.title}
                </h3>
              </div>
            )}

            {/* Notification Message */}
            <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="material-icons text-primary-blue text-sm">message</span>
                Message
              </h4>
              <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                {selectedNotification.message}
              </p>
            </div>

            {/* Additional Info (if exists) */}
            {selectedNotification.notification_type && (
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-primary-blue">info</span>
                  <span className="text-sm font-semibold text-gray-700">
                    Type:
                  </span>
                  <span className="text-sm text-gray-600">
                    {selectedNotification.notification_type}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-4 border-t border-blue-200 flex justify-end gap-3">
          <button
            onClick={() => setShowNotificationModal(false)}
            className="px-6 py-2 bg-gradient-to-r from-primary-blue to-primary-teal text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <span className="material-icons text-sm">check</span>
            Close
          </button>
        </div>
      </div>
    </div>
  )}
</div>
);
};

export default AdminDashboard;
