import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { userAPI, petsAPI, adminAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

// Helper function to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return "/default-pet.png";
  if (imagePath.startsWith("http")) return imagePath;
  const backendBase = process.env.REACT_APP_API_URL || "http://localhost:8000";
  return `${backendBase}${imagePath}`;
};

// Helper function to get default images based on pet type
const getDefaultImage = (animalType) => {
  const defaultImages = {
    CAT: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=200&fit=crop",
    DOG: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=200&fit=crop",
    BIRD: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=300&h=200&fit=crop",
    OTHER:
      "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=300&h=200&fit=crop",
  };
  // Normalize animal type to uppercase for matching
  const normalizedType = animalType ? animalType.toUpperCase() : "OTHER";
  return defaultImages[normalizedType] || defaultImages["OTHER"];
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  console.log("AdminDashboard rendered. User:", user);

  // State management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activePendingTab, setActivePendingTab] = useState("lost-reports"); // Sub-tab for pending requests
  const [activeRecordsTab, setActiveRecordsTab] = useState("all-lost"); // Sub-tab for all records
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem("adminTheme");
    return savedTheme === "dark";
  });

  // Dashboard Stats (comprehensive)
  const [dashboardStats, setDashboardStats] = useState(null);

  // Pending Requests (all types)
  const [pendingLostReports, setPendingLostReports] = useState([]);
  const [pendingFoundReports, setPendingFoundReports] = useState([]);
  const [pendingAdoptionRequests, setPendingAdoptionRequests] = useState([]);
  const [pendingAdoptionPosts, setPendingAdoptionPosts] = useState([]);

  // All Records by Status
  const [allLostPets, setAllLostPets] = useState([]);
  const [allFoundPets, setAllFoundPets] = useState([]);
  const [allAdoptedPets, setAllAdoptedPets] = useState([]);
  const [allAvailablePets, setAllAvailablePets] = useState([]);
  const [allAdoptionRequests, setAllAdoptionRequests] = useState([]); // All adoption requests (approved, rejected, pending)
  const [allAdoptionPosts, setAllAdoptionPosts] = useState([]); // All adoption posts

  // Feedback management
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [feedbackForm, setFeedbackForm] = useState({
    name: "",
    message: "",
  });
  const [feedbackFormErrors, setFeedbackFormErrors] = useState({});
  const [expandedFeedbacks, setExpandedFeedbacks] = useState({});

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGender, setFilterGender] = useState("");
  const [filterBreed, setFilterBreed] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterReportStatus, setFilterReportStatus] = useState("accepted");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);

  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalType, setModalType] = useState(""); // 'report' or 'adoption'

  // Profile Dropdown
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Reference for profile dropdown
  const profileRef = useRef(null);

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

  // Collapsible sections
  const [showMetrics, setShowMetrics] = useState(true);
  const [showPetOverview, setShowPetOverview] = useState(true);
  const [showUsersOverview, setShowUsersOverview] = useState(true);

  // Check if user is admin
  useEffect(() => {
    console.log("Admin check - User role:", user?.role);
    if (user && user.role !== "admin") {
      console.log("Not admin, redirecting to /dashboard");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Load initial data
  useEffect(() => {
    console.log("Load data effect - User role:", user?.role);
    if (user?.role === "admin") {
      console.log("Loading admin data...");
      loadAllData();
    }
  }, [user]);

  // Auto-hide messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle outside clicks for notification and profile dropdowns
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close notification dropdown if clicked outside
      if (
        showNotifications &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      // Close profile dropdown if clicked outside
      if (
        showProfileDropdown &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications, showProfileDropdown]);

  // Fetch feedback
  const fetchFeedbacks = async () => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const url = `${API_BASE}/api/feedbacks/`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch feedback data");
      }

      const data = await response.json();
      setAllFeedbacks(
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      );
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      setError("Could not load community feedback. Please try again later.");
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    const errors = {};
    if (!feedbackForm.name.trim()) errors.name = "Name is required";
    if (!feedbackForm.message.trim()) errors.message = "Message is required";

    if (Object.keys(errors).length > 0) {
      setFeedbackFormErrors(errors);
      return;
    }

    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const url = `${API_BASE}/api/feedbacks/`;

      const formData = new FormData();
      formData.append("name", feedbackForm.name);
      formData.append("message", feedbackForm.message);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      // Reset form and fetch updated feedbacks
      setFeedbackForm({ name: "", message: "" });
      setFeedbackFormErrors({});
      setSuccessMessage("Feedback submitted successfully!");
      fetchFeedbacks();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setError("Failed to submit feedback. Please try again.");
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel for much faster performance
      await Promise.all([
        loadDashboardStats(),
        loadPendingReports(),
        loadPendingAdoptions(),
        loadAllPets(),
        loadAllAdoptionData(),
        loadNotifications(),
        fetchFeedbacks(),
      ]);
    } catch (err) {
      console.error("Error loading admin data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await adminAPI.getComprehensiveDashboardStats();
      console.log("Dashboard stats response:", response.data);
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

        // Filter by status field (lost/found)
        const lost = reports.filter((r) => r.status === "lost");
        const found = reports.filter((r) => r.status === "found");

        console.log(
          "Lost reports:",
          lost.length,
          "Found reports:",
          found.length
        );

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
      // Load pending adoption requests and posts in parallel
      const [response, postsResponse] = await Promise.all([
        adminAPI.filterAdoptionRequests({ status: "pending" }),
        adminAPI.getPendingAdoptionPostsNew(),
      ]);

      if (response.data.success) {
        setPendingAdoptionRequests(response.data.adoptions || []);
      }

      if (postsResponse.data && postsResponse.data.success) {
        setPendingAdoptionPosts(postsResponse.data.posts || []);
      }
    } catch (err) {
      console.error("Error loading pending adoptions:", err);
    }
  };

  const loadAllPets = async () => {
    try {
      console.log("Loading all accepted pets in parallel...");

      // Load all pet statuses in parallel for faster performance
      const [lostResponse, foundResponse, adoptedResponse, availableResponse] =
        await Promise.all([
          adminAPI.getAllPetsByStatus("lost"),
          adminAPI.getAllPetsByStatus("found"),
          adminAPI.getAllPetsByStatus("adopted"),
          adminAPI.getAllPetsByStatus("available"),
        ]);

      if (lostResponse.data.success) {
        setAllLostPets(lostResponse.data.pets || []);
        console.log(
          `✅ Loaded ${lostResponse.data.pets?.length || 0} accepted lost pets`
        );
      }

      if (foundResponse.data.success) {
        setAllFoundPets(foundResponse.data.pets || []);
        console.log(
          `✅ Loaded ${
            foundResponse.data.pets?.length || 0
          } accepted found pets`
        );
      }

      if (adoptedResponse.data.success) {
        setAllAdoptedPets(adoptedResponse.data.pets || []);
        console.log(
          `✅ Loaded ${
            adoptedResponse.data.pets?.length || 0
          } accepted adopted pets`
        );
      }

      if (availableResponse.data.success) {
        setAllAvailablePets(availableResponse.data.pets || []);
        console.log(
          `✅ Loaded ${
            availableResponse.data.pets?.length || 0
          } accepted available pets`
        );
      }
    } catch (err) {
      console.error("Error loading all pets:", err);
    }
  };

  const loadAllAdoptionData = async () => {
    try {
      // Load adoption requests and posts in parallel
      const [requestsResponse, postsResponse] = await Promise.all([
        adminAPI.filterAdoptionRequests({ status: "all" }),
        adminAPI.getAllAdoptionPosts("all"),
      ]);

      if (requestsResponse.data.success) {
        setAllAdoptionRequests(requestsResponse.data.adoptions || []);
      }

      if (postsResponse.data.success) {
        setAllAdoptionPosts(postsResponse.data.posts || []);
      }
    } catch (err) {
      console.error("Error loading all adoption data:", err);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await adminAPI.getNotifications();
      if (response.data.success) {
        const allNotifications = response.data.notifications || [];
        setNotifications(allNotifications);

        const unreadNotifs = allNotifications.filter((n) => !n.is_read);
        setUnreadNotifications(unreadNotifs);
        setUnreadCount(unreadNotifs.length);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  const handleNotificationDropdownToggle = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read
      await adminAPI.markNotificationRead(notification.id);

      // Update local state
      const updatedNotifications = notifications.map((n) =>
        n.id === notification.id ? { ...n, is_read: true } : n
      );
      setNotifications(updatedNotifications);

      // Update unread notifications
      const updatedUnreadNotifications = unreadNotifications.filter(
        (n) => n.id !== notification.id
      );
      setUnreadNotifications(updatedUnreadNotifications);

      // Update unread count
      setUnreadCount(updatedUnreadNotifications.length);

      // Show notification details in modal
      setSelectedNotification({ ...notification, is_read: true });
      setShowNotificationModal(true);
      setShowNotifications(false); // Close the dropdown
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      // Delete notification via API
      await adminAPI.deleteNotification(notificationId);

      // Update notifications state
      const updatedNotifications = notifications.filter(
        (n) => n.id !== notificationId
      );
      setNotifications(updatedNotifications);

      // Update unread notifications
      const updatedUnreadNotifications = unreadNotifications.filter(
        (n) => n.id !== notificationId
      );
      setUnreadNotifications(updatedUnreadNotifications);

      // Update unread count
      setUnreadCount(updatedUnreadNotifications.length);

      setSuccessMessage("Notification deleted successfully");
    } catch (err) {
      console.error("Error deleting notification:", err);
      setError("Failed to delete notification");
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

  const handleSearch = async () => {
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const filters = {
        query: searchQuery,
        type: filterType,
        status: filterStatus,
        breed: filterBreed,
        location: filterLocation,
        gender: filterGender,
        report_status: filterReportStatus,
      };

      console.log("Searching with filters:", filters);
      const response = await adminAPI.searchPets(filters);
      console.log("Search response:", response.data);

      if (response.data.success) {
        setSearchResults(response.data.pets || []);
      }
    } catch (err) {
      console.error("Error searching pets:", err);
      setError("Failed to search pets");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("adminTheme", newTheme ? "dark" : "light");
  };

  // Load profile once when component mounts
  useEffect(() => {
    if (user?.role === "admin") {
      loadProfile();
    }
  }, [user?.id]); // Only reload if user ID changes (login/logout)

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
    <div className={isDarkMode ? "dark" : ""}>
      <div className={`min-h-screen transition-colors duration-300`}>
        {/* Hero-style background: using new background image from public folder */}
        {/* Header - Purple Gradient Theme */}
        <header
          className={`sticky top-0 z-50 backdrop-blur-sm shadow-lg border-b transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-gray-900/95 to-purple-900/95 border-purple-800"
              : "bg-gradient-to-r from-purple-300 to-purple-700 border-purple-400"
          }`}
        >
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">
                  <span className="text-white">pet</span>
                  <span className="text-purple-700">rescue</span>
                  <span className="text-white ml-2">- ADMIN</span>
                </div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-lg font-semibold text-white">
                  ADMIN PANEL: {user?.username?.toUpperCase() || "ADMINUSER"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {/* Refresh Button */}
                <button
                  className="p-2 rounded-full hover:bg-purple-700 dark:hover:bg-purple-800 transition-all duration-300 disabled:opacity-50"
                  onClick={loadAllData}
                  disabled={loading}
                  title="Refresh Data"
                >
                  <span className="material-icons text-white">refresh</span>
                </button>

                {/* Theme Toggle Button */}
                <button
                  className="p-2 rounded-full hover:bg-purple-700 dark:hover:bg-purple-800 transition-all duration-300"
                  onClick={toggleTheme}
                  title={
                    isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                  }
                >
                  <span className="material-icons text-white">
                    {isDarkMode ? "light_mode" : "dark_mode"}
                  </span>
                </button>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                  <button
                    className="p-2 rounded-full hover:bg-purple-700 dark:hover:bg-purple-800 transition-all duration-300 relative"
                    onClick={handleNotificationDropdownToggle}
                  >
                    <span className="material-icons text-white">
                      notifications
                    </span>
                    {unreadCount > 0 && !showNotifications && (
                      <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-purple-200 dark:border-slate-600 overflow-hidden z-50 max-h-[500px] flex flex-col">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-slate-700 dark:to-slate-600 border-b border-purple-500 dark:border-slate-500">
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
                        {unreadNotifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-300">
                            <span className="material-icons text-6xl mb-2">
                              notifications_none
                            </span>
                            <p className="text-sm">No unread notifications</p>
                          </div>
                        ) : (
                          unreadNotifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-4 border-b border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer bg-purple-50/50 dark:bg-purple-900/40`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div
                                  className="flex-1"
                                  onClick={() => handleNotificationClick(notif)}
                                >
                                  <p
                                    className={`text-sm ${
                                      notif.is_read
                                        ? "text-gray-600"
                                        : "text-gray-800 font-bold"
                                    }`}
                                  >
                                    {notif.message}
                                  </p>
                                  <span className="text-xs text-gray-400 mt-2 block">
                                    {new Date(
                                      notif.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotification(notif.id);
                                  }}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                  title="Delete notification"
                                >
                                  <span className="material-icons text-red-500 text-sm">
                                    delete
                                  </span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Menu */}
                <div className="relative" ref={profileRef}>
                  <button
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-purple to-primary-indigo dark:from-purple-800 dark:to-indigo-800 text-white font-bold text-lg flex items-center justify-center hover:shadow-lg transition-all duration-300 hover:scale-110"
                    onClick={() => {
                      const newProfileState = !showProfileDropdown;
                      setShowProfileDropdown(newProfileState);
                      // Close other dropdown if it's open
                      if (newProfileState && showNotifications) {
                        setShowNotifications(false);
                      }
                    }}
                  >
                    {user?.username?.charAt(0).toUpperCase() || "A"}
                  </button>
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-xl border border-purple-200 dark:border-purple-600 overflow-hidden z-50">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          {user?.username || "Admin"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email || "admin@petrescue.com"}
                        </p>
                      </div>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-purple-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-white hover:text-primary-purple dark:hover:text-accent-purple font-medium flex items-center gap-2"
                        onClick={() => {
                          setActiveTab("profile");
                          setShowProfileDropdown(false);
                        }}
                      >
                        <span className="material-icons text-sm">person</span>{" "}
                        Edit Profile
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium border-t border-gray-100 dark:border-slate-600 flex items-center gap-2"
                        onClick={() => {
                          localStorage.removeItem("token");
                          window.location.href = "/login";
                        }}
                      >
                        <span className="material-icons text-sm">logout</span>{" "}
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Toast Notifications - Fixed Position */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {error && (
            <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] animate-slideInRight">
              <span className="material-icons text-2xl">error</span>
              <div>
                <p className="font-bold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] animate-slideInRight">
              <span className="material-icons text-2xl">check_circle</span>
              <div>
                <p className="font-bold">Success</p>
                <p className="text-sm">{successMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Navigation Bar - Sticky at Top */}
        <nav className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 border-t border-purple-500 shadow-lg sticky top-0 z-40">
          <ul className="flex items-center justify-center gap-2 px-4 w-full flex-wrap py-2">
            <li
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-300 rounded-lg ${
                activeTab === "dashboard"
                  ? "bg-white dark:bg-slate-700 text-purple-900 dark:text-purple-300 shadow-lg transform scale-105"
                  : "text-white hover:bg-purple-700 dark:hover:bg-purple-900"
              }`}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="material-icons text-lg">dashboard</span>
              <span className="font-semibold text-sm">Dashboard</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-300 rounded-lg ${
                activeTab === "pending-requests"
                  ? "bg-white dark:bg-slate-700 text-purple-900 dark:text-purple-300 shadow-lg transform scale-105"
                  : "text-white hover:bg-purple-700 dark:hover:bg-purple-900"
              }`}
              onClick={() => setActiveTab("pending-requests")}
            >
              <span className="material-icons text-lg">pending_actions</span>
              <span className="font-semibold text-sm">Pending Requests</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-300 rounded-lg ${
                activeTab === "all-records"
                  ? "bg-white dark:bg-slate-700 text-purple-900 dark:text-purple-300 shadow-lg transform scale-105"
                  : "text-white hover:bg-purple-700 dark:hover:bg-purple-900"
              }`}
              onClick={() => setActiveTab("all-records")}
            >
              <span className="material-icons text-lg">storage</span>
              <span className="font-semibold text-sm">All Records</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-300 rounded-lg ${
                activeTab === "search"
                  ? "bg-white dark:bg-slate-700 text-purple-900 dark:text-purple-300 shadow-lg transform scale-105"
                  : "text-white hover:bg-purple-700 dark:hover:bg-purple-900"
              }`}
              onClick={() => setActiveTab("search")}
            >
              <span className="material-icons text-lg">search</span>
              <span className="font-semibold text-sm">Search</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-300 rounded-lg ${
                activeTab === "feedbacks"
                  ? "bg-white dark:bg-slate-700 text-purple-900 dark:text-purple-300 shadow-lg transform scale-105"
                  : "text-white hover:bg-purple-700 dark:hover:bg-purple-900"
              }`}
              onClick={() => setActiveTab("feedbacks")}
            >
              <span className="material-icons text-lg">chat</span>
              <span className="font-semibold text-sm">Feedbacks</span>
            </li>
            <li
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-300 rounded-lg ${
                activeTab === "notifications"
                  ? "bg-white dark:bg-slate-700 text-purple-900 dark:text-purple-300 shadow-lg transform scale-105"
                  : "text-white hover:bg-purple-700 dark:hover:bg-purple-900"
              }`}
              onClick={() => setActiveTab("notifications")}
            >
              <span className="material-icons text-lg">notifications</span>
              <span className="font-semibold text-sm">Notifications</span>
            </li>
          </ul>
        </nav>

        {/* Main Content Container */}
        <div
          className="overflow-y-auto"
          style={{ height: "calc(100vh - 160px)" }}
        >
          {/* Hero-style background: using background image from public folder */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('${
                process.env.PUBLIC_URL + "/bgimage.jpg"
              }')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/75 via-purple-800/70 to-indigo-900/75"></div>
          </div>

          <div className="relative z-10 w-full px-0 py-8">
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
                <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 overflow-hidden">
                  <div className="p-8">
                    <h2
                      className="text-2xl font-bold mb-6 flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => setShowMetrics(!showMetrics)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-purple-600 dark:text-purple-400 text-3xl">
                          dashboard
                        </span>
                        <span className="text-gray-800 dark:text-white">
                          DASHBOARD OVERVIEW
                        </span>
                      </div>
                      <span className="material-icons text-purple-500">
                        {showMetrics ? "expand_less" : "expand_more"}
                      </span>
                    </h2>

                    {/* Stats Grid - Uniform Cards */}
                    {showMetrics && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Pending Requests */}
                        <div
                          className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 rounded-xl p-6 border-2 border-orange-200 dark:border-orange-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                          onClick={() => setActiveTab("pending-requests")}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="material-icons text-4xl text-orange-600 dark:text-orange-400">
                              pending_actions
                            </span>
                            <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                              {dashboardStats?.pending?.total ||
                                pendingLostReports.length +
                                  pendingFoundReports.length +
                                  pendingAdoptionRequests.length +
                                  pendingAdoptionPosts.length}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2">
                            Pending Requests
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Lost:{" "}
                            {dashboardStats?.pending?.lost_reports ||
                              pendingLostReports.length}{" "}
                            | Found:{" "}
                            {dashboardStats?.pending?.found_reports ||
                              pendingFoundReports.length}
                          </p>
                        </div>

                        {/* Lost Pets (Accepted Only) */}
                        <div
                          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40 rounded-xl p-6 border-2 border-red-200 dark:border-red-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                          onClick={() => {
                            setActiveTab("all-records");
                            setActiveRecordsTab("all-lost");
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="material-icons text-4xl text-red-600 dark:text-red-400">
                              search
                            </span>
                            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                              {dashboardStats?.accepted?.lost ||
                                allLostPets.length}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Lost Pets
                          </h3>
                        </div>

                        {/* Found Pets (Accepted Only) */}
                        <div
                          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 rounded-xl p-6 border-2 border-green-200 dark:border-green-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                          onClick={() => {
                            setActiveTab("all-records");
                            setActiveRecordsTab("all-found");
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="material-icons text-4xl text-green-600 dark:text-green-400">
                              pets
                            </span>
                            <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                              {dashboardStats?.accepted?.found ||
                                allFoundPets.length}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Found Pets
                          </h3>
                        </div>

                        {/* Adopted Pets */}
                        <div
                          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                          onClick={() => {
                            setActiveTab("all-records");
                            setActiveRecordsTab("all-adopted");
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="material-icons text-4xl text-purple-600 dark:text-purple-400">
                              favorite
                            </span>
                            <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                              {dashboardStats?.accepted?.adopted ||
                                allAdoptedPets.length}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Adopted Pets
                          </h3>
                        </div>

                        {/* Available for Adoption */}
                        <div
                          className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/40 dark:to-pink-800/40 rounded-xl p-6 border-2 border-pink-200 dark:border-pink-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                          onClick={() => {
                            setActiveTab("all-records");
                            setActiveRecordsTab("available");
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="material-icons text-4xl text-pink-600 dark:text-pink-400">
                              home
                            </span>
                            <span className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                              {dashboardStats?.accepted?.available ||
                                allAvailablePets.length}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Available Pets
                          </h3>
                        </div>

                        {/* Total Pets */}
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-800/40 rounded-xl p-6 border-2 border-indigo-200 dark:border-indigo-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className="material-icons text-4xl text-indigo-600 dark:text-indigo-400">
                              storage
                            </span>
                            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                              {dashboardStats?.totals?.pets || 0}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Total Pets
                          </h3>
                        </div>

                        {/* Total Reports */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className="material-icons text-4xl text-blue-600 dark:text-blue-400">
                              description
                            </span>
                            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              {dashboardStats?.totals?.reports || 0}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Total Reports
                          </h3>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}{" "}
              {/* Pending Requests Section (All Types) */}
              {activeTab === "pending-requests" && (
                <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg p-8 border border-blue-100 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="material-icons text-3xl text-orange-600 dark:text-orange-400">
                      pending_actions
                    </span>
                    <span className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
                      PENDING REQUESTS (NEW)
                    </span>
                  </h2>

                  {/* Sub-tabs for different request types */}
                  <div className="flex gap-4 mb-6 flex-wrap">
                    <button
                      onClick={() => setActivePendingTab("lost-reports")}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activePendingTab === "lost-reports"
                          ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700"
                      }`}
                    >
                      Lost Reports ({pendingLostReports.length})
                    </button>
                    <button
                      onClick={() => setActivePendingTab("found-reports")}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activePendingTab === "found-reports"
                          ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-700"
                      }`}
                    >
                      Found Reports ({pendingFoundReports.length})
                    </button>
                    <button
                      onClick={() => setActivePendingTab("adoption-requests")}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activePendingTab === "adoption-requests"
                          ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-700"
                      }`}
                    >
                      Want to Adopt ({pendingAdoptionRequests.length})
                    </button>
                    <button
                      onClick={() => setActivePendingTab("adoption-posts")}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activePendingTab === "adoption-posts"
                          ? "bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg shadow-pink-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 border border-pink-200 dark:border-pink-700"
                      }`}
                    >
                      Adoption Posts ({pendingAdoptionPosts.length})
                    </button>
                  </div>

                  {/* Lost Pet Reports */}
                  {activePendingTab === "lost-reports" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                        <span className="material-icons">report</span>
                        Lost Pet Reports ({pendingLostReports.length})
                      </h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {pendingLostReports.length > 0 ? (
                          pendingLostReports.map((report) => (
                            <div
                              key={report.id}
                              className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
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
                                <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                                  {report.animal_type}
                                </div>
                                <div className="space-y-2">
                                  {report.pet_breed && (
                                    <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="font-semibold">
                                        Breed:
                                      </span>{" "}
                                      {report.pet_breed}
                                    </span>
                                  )}
                                  {report.pet_location && (
                                    <span className="flex items-center gap-1 text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="material-icons text-xs">
                                        location_on
                                      </span>
                                      {report.pet_location}
                                    </span>
                                  )}
                                  <span className="block text-gray-600 dark:text-gray-300 text-sm">
                                    <span className="font-semibold">By:</span>{" "}
                                    {report.owner_username || "Unknown"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(
                                      report.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        viewDetails(report, "report")
                                      }
                                      title="View details"
                                      aria-label="View details"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        visibility
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleApproveReport(report.id)
                                      }
                                      title="Approve"
                                      aria-label="Approve"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 dark:bg-green-400 text-white shadow-md hover:bg-green-600 dark:hover:bg-green-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        check_circle
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleRejectReport(report.id)
                                      }
                                      title="Reject"
                                      aria-label="Reject"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 dark:bg-red-400 text-white shadow-md hover:bg-red-600 dark:hover:bg-red-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        cancel
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-16">
                            <span className="text-6xl block mb-4">✅</span>
                            <p className="text-gray-500 text-lg">
                              No pending lost pet reports
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Found/Rescue Pet Reports */}
                  {activePendingTab === "found-reports" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
                        <span className="material-icons">visibility</span>
                        Pending Rescue Reports ({pendingFoundReports.length})
                      </h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {pendingFoundReports.length > 0 ? (
                          pendingFoundReports.map((report) => (
                            <div
                              key={report.id}
                              className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
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
                                    <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="font-semibold">
                                        Breed:
                                      </span>{" "}
                                      {report.pet_breed}
                                    </span>
                                  )}
                                  {report.pet_location && (
                                    <span className="flex items-center gap-1 text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="material-icons text-xs">
                                        location_on
                                      </span>
                                      {report.pet_location}
                                    </span>
                                  )}
                                  <span className="block text-gray-600 dark:text-gray-300 text-sm">
                                    <span className="font-semibold">By:</span>{" "}
                                    {report.owner_username || "Unknown"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(
                                      report.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        viewDetails(report, "report")
                                      }
                                      title="View details"
                                      aria-label="View details"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        visibility
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleApproveReport(report.id)
                                      }
                                      title="Approve"
                                      aria-label="Approve"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 dark:bg-green-400 text-white shadow-md hover:bg-green-600 dark:hover:bg-green-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        check_circle
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleRejectReport(report.id)
                                      }
                                      title="Reject"
                                      aria-label="Reject"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 dark:bg-red-400 text-white shadow-md hover:bg-red-600 dark:hover:bg-red-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        cancel
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-16">
                            <span className="text-6xl block mb-4">✅</span>
                            <p className="text-gray-500 text-lg">
                              No pending rescue reports
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Adoption Requests Sub-tab */}
                  {activePendingTab === "adoption-requests" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-purple-600 flex items-center gap-2">
                        <span className="material-icons">home</span>
                        Adoption Requests ({pendingAdoptionRequests.length})
                      </h3>
                      <div className="flex flex-wrap justify-center gap-4">
                        {pendingAdoptionRequests.length > 0 ? (
                          pendingAdoptionRequests.map((adoption) => (
                            <div
                              key={adoption.id}
                              className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-200 dark:border-purple-700"
                            >
                              <div className="relative h-48 overflow-hidden">
                                <img
                                  src={
                                    adoption.pet?.image
                                      ? getImageUrl(adoption.pet.image)
                                      : "/default-pet.png"
                                  }
                                  alt={adoption.pet?.name || "Pet"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = "/default-pet.png";
                                  }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                  <h3 className="text-white font-bold text-lg">
                                    {adoption.pet?.name || "Pet"}
                                  </h3>
                                </div>
                                <div className="absolute top-2 right-2">
                                  <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
                                    PENDING
                                  </span>
                                </div>
                              </div>
                              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                                <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-2">
                                  {adoption.pet?.type || "Pet"}
                                </div>
                                <div className="space-y-1">
                                  {adoption.pet?.breed && (
                                    <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="font-semibold">
                                        Breed:
                                      </span>{" "}
                                      {adoption.pet.breed}
                                    </span>
                                  )}
                                  {adoption.pet?.age && (
                                    <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="font-semibold">
                                        Age:
                                      </span>{" "}
                                      {adoption.pet.age} years
                                    </span>
                                  )}
                                  {adoption.pet?.gender && (
                                    <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="font-semibold">
                                        Gender:
                                      </span>{" "}
                                      {adoption.pet.gender}
                                    </span>
                                  )}
                                  <span className="block text-gray-600 dark:text-gray-300 text-sm">
                                    <span className="font-semibold">
                                      Requested by:
                                    </span>{" "}
                                    {adoption.user?.username || "User"}
                                  </span>
                                  <span className="block text-gray-500 dark:text-gray-400 text-sm mt-1">
                                    {adoption.reason}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-3">
                                  <div className="flex items-center gap-2 w-full justify-between">
                                    <button
                                      onClick={() =>
                                        viewDetails(
                                          adoption,
                                          "adoption-request"
                                        )
                                      }
                                      title="View details"
                                      aria-label="View details"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        visibility
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleApproveAdoption(adoption.id)
                                      }
                                      title="Approve"
                                      aria-label="Approve"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 dark:bg-green-400 text-white shadow-md hover:bg-green-600 dark:hover:bg-green-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        check_circle
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleRejectAdoption(adoption.id)
                                      }
                                      title="Reject"
                                      aria-label="Reject"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 dark:bg-red-400 text-white shadow-md hover:bg-red-600 dark:hover:bg-red-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        cancel
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-16">
                            <span className="text-6xl block mb-4">✅</span>
                            <p className="text-gray-500 text-lg">
                              No pending adoption requests
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Post to Adopt Sub-tab */}
                  {activePendingTab === "adoption-posts" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-pink-600 flex items-center gap-2">
                        <span className="material-icons">pets</span>
                        Post to Adopt ({pendingAdoptionPosts.length})
                      </h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {pendingAdoptionPosts.length > 0 ? (
                          pendingAdoptionPosts.map((pet) => (
                            <div
                              key={pet.id}
                              className="w-80 h-[420px] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-pink-100 dark:border-pink-900"
                            >
                              <div className="relative h-48">
                                <img
                                  src={getImageUrl(pet.image)}
                                  alt={pet.name}
                                  className="w-full h-full object-cover"
                                  onLoad={() => {
                                    console.log(
                                      `✅ Admin: Image loaded for pending adoption post ${pet.name}`
                                    );
                                  }}
                                  onError={(e) => {
                                    console.log(
                                      `❌ Admin: Image failed for pending adoption post ${pet.name}, using ${pet.type} fallback`
                                    );
                                    e.target.src = getDefaultImage(pet.type);
                                  }}
                                />
                                <div className="absolute top-2 right-2">
                                  <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                                    PENDING
                                  </span>
                                </div>
                              </div>
                              <div className="p-5 space-y-3">
                                <h4 className="font-bold text-lg text-gray-800">
                                  {pet.name}
                                </h4>
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold">Type:</span>{" "}
                                    {pet.type}
                                  </p>
                                  {pet.breed && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                      <span className="font-semibold">
                                        Breed:
                                      </span>{" "}
                                      {pet.breed}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold">Age:</span>{" "}
                                    {pet.age} years
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold">
                                      Gender:
                                    </span>{" "}
                                    {pet.gender}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Posted for adoption
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        viewDetails(pet, "adoption-post")
                                      }
                                      title="View details"
                                      aria-label="View details"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        visibility
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleApproveReport(pet.report_id)
                                      }
                                      title="Approve"
                                      aria-label="Approve"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 dark:bg-green-400 text-white shadow-md hover:bg-green-600 dark:hover:bg-green-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        check_circle
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleRejectReport(pet.report_id)
                                      }
                                      title="Reject"
                                      aria-label="Reject"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 dark:bg-red-400 text-white shadow-md hover:bg-red-600 dark:hover:bg-red-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        cancel
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-16">
                            <span className="text-6xl block mb-4">✅</span>
                            <p className="text-gray-500 text-lg">
                              No pending adoption posts
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* OLD Pending Adoptions Tab - REMOVE OR RENAME */}
              {activeTab === "old-pending-adoptions-DISABLED" && (
                <div className="space-y-6">
                  {/* Adoption Requests */}
                  <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 overflow-hidden">
                    <div className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-primary-blue text-3xl">
                          home
                        </span>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                          ADOPTION REQUESTS ({pendingAdoptionRequests.length})
                        </h2>
                      </div>
                    </div>
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
                                      Requested by:{" "}
                                      <strong>{adoption.user_name}</strong>
                                    </p>
                                    <p className="text-gray-600 mt-2">
                                      <strong>Reason:</strong>{" "}
                                      {adoption.reason || "No reason provided"}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      Requested on:{" "}
                                      {new Date(
                                        adoption.created_at
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                                    PENDING
                                  </span>
                                </div>
                                <div className="flex gap-2 mt-4">
                                  <button
                                    onClick={() =>
                                      viewDetails(adoption, "adoption-request")
                                    }
                                    className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleApproveAdoption(adoption.id)
                                    }
                                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRejectAdoption(adoption.id)
                                    }
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
                          <p className="text-gray-500 text-lg">
                            No pending adoption requests
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Adoption Posts */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                    <h3 className="text-2xl font-bold mb-4 text-pink-600 flex items-center gap-2">
                      <span>❤️</span>
                      Pending Adoption Posts ({pendingAdoptionPosts.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 justify-items-start">
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
                                onLoad={() => {
                                  console.log(
                                    `✅ Admin Dashboard: Image loaded for ${post.name}`
                                  );
                                }}
                                onError={(e) => {
                                  console.log(
                                    `❌ Admin Dashboard: Image failed for ${post.name}, using ${post.type} fallback`
                                  );
                                  e.target.src = getDefaultImage(post.type);
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
                              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <p>
                                  <strong>Type:</strong> {post.type}
                                </p>
                                {post.breed && (
                                  <p>
                                    <strong>Breed:</strong> {post.breed}
                                  </p>
                                )}
                                <p>
                                  <strong>Age:</strong> {post.age} years
                                </p>
                                <p>
                                  <strong>Posted by:</strong>{" "}
                                  {post.owner_username || "Unknown"}
                                </p>
                              </div>
                              <div className="flex gap-2 pt-3">
                                <button
                                  onClick={() =>
                                    viewDetails(post, "adoption-post")
                                  }
                                  className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 font-semibold"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() =>
                                    handleApproveReport(post.report_id)
                                  }
                                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() =>
                                    handleRejectReport(post.report_id)
                                  }
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
                          <p className="text-gray-500 text-lg">
                            No pending adoption posts
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* ALL RECORDS Section (Accepted Pets Only) */}
              {activeTab === "all-records" && (
                <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg p-8 border border-blue-100 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="material-icons text-3xl text-purple-600 dark:text-purple-400">
                      storage
                    </span>
                    <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                      ALL RECORDS (ACCEPTED PETS)
                    </span>
                  </h2>

                  {/* Sub-tabs for different pet categories */}
                  <div className="flex gap-2 mb-6 flex-wrap">
                    <button
                      onClick={() => setActiveRecordsTab("all-lost")}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activeRecordsTab === "all-lost"
                          ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700"
                      }`}
                    >
                      Lost Pets ({allLostPets.length})
                    </button>
                    <button
                      onClick={() => setActiveRecordsTab("all-found")}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activeRecordsTab === "all-found"
                          ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-700"
                      }`}
                    >
                      Found Pets ({allFoundPets.length})
                    </button>
                    <button
                      onClick={() => setActiveRecordsTab("available")}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activeRecordsTab === "available"
                          ? "bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg shadow-pink-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 border border-pink-200 dark:border-pink-700"
                      }`}
                    >
                      Available for Adoption ({allAvailablePets.length})
                    </button>
                    <button
                      onClick={() =>
                        setActiveRecordsTab("all-adoption-requests")
                      }
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        activeRecordsTab === "all-adoption-requests"
                          ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-700"
                      }`}
                    >
                      Adoption Requests ({allAdoptionRequests.length})
                    </button>
                  </div>

                  {/* All Lost Pets */}
                  {activeRecordsTab === "all-lost" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                        <span className="material-icons">search</span>
                        All Lost Pets ({allLostPets.length})
                      </h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {allLostPets.length > 0 ? (
                          allLostPets.map((pet) => (
                            <div
                              key={pet.id}
                              className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                            >
                              <div className="relative h-56 overflow-hidden">
                                <img
                                  src={getImageUrl(pet.image)}
                                  alt={pet.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = "/default-pet.png";
                                  }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                  <h3 className="text-white font-bold text-lg">
                                    {pet.name}
                                  </h3>
                                </div>
                                <div className="absolute top-2 right-2">
                                  <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg">
                                    LOST
                                  </span>
                                </div>
                              </div>
                              <div className="p-5 space-y-3">
                                <div className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                                  {pet.type}
                                </div>
                                <div className="space-y-2">
                                  {pet.breed && (
                                    <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                      <span className="font-semibold">
                                        Breed:
                                      </span>{" "}
                                      {pet.breed}
                                    </span>
                                  )}
                                  {pet.location && (
                                    <span className="block text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                                      <span className="material-icons text-sm">
                                        location_on
                                      </span>
                                      {pet.location}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => viewDetails(pet, "pet")}
                                  title="View details"
                                  aria-label="View details"
                                  className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                >
                                  <span className="material-icons text-sm">
                                    visibility
                                  </span>
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-16">
                            <span className="text-6xl block mb-4">📭</span>
                            <p className="text-gray-500 text-lg">
                              No lost pets
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Found Pets */}
                  {activeRecordsTab === "all-found" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
                        <span className="material-icons">pets</span>
                        All Found Pets (
                        {
                          allFoundPets.filter(
                            (pet) => pet.status !== "REJECTED"
                          ).length
                        }
                        )
                      </h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {allFoundPets.filter((pet) => pet.status !== "REJECTED")
                          .length > 0 ? (
                          allFoundPets
                            .filter((pet) => pet.status !== "REJECTED")
                            .map((pet) => (
                              <div
                                key={pet.id}
                                className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                              >
                                <div className="relative h-56 overflow-hidden">
                                  <img
                                    src={getImageUrl(pet.image)}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = "/default-pet.png";
                                    }}
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                    <h3 className="text-white font-bold text-lg">
                                      {pet.name}
                                    </h3>
                                  </div>
                                  <div className="absolute top-2 right-2">
                                    <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-lg">
                                      FOUND
                                    </span>
                                  </div>
                                </div>
                                <div className="p-5 space-y-3">
                                  <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                    {pet.type}
                                  </div>
                                  <div className="space-y-2">
                                    {pet.breed && (
                                      <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                        <span className="font-semibold">
                                          Breed:
                                        </span>{" "}
                                        {pet.breed}
                                      </span>
                                    )}
                                    {pet.location && (
                                      <span className="block text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                                        <span className="material-icons text-sm">
                                          location_on
                                        </span>
                                        {pet.location}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => viewDetails(pet, "pet")}
                                    title="View details"
                                    aria-label="View details"
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                  >
                                    <span className="material-icons text-sm">
                                      visibility
                                    </span>
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="col-span-full text-center py-16">
                            <span className="text-6xl block mb-4">📭</span>
                            <p className="text-gray-500 text-lg">
                              No found pets
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Adopted Pets */}
                  {activeRecordsTab === "all-adopted" &&
                    {
                      /* Removed Adopted Pets tab and content for unified design */
                    }}

                  {/* Available for Adoption */}
                  {activeRecordsTab === "available" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-pink-600 flex items-center gap-2">
                        <span className="material-icons">home</span>
                        Available for Adoption ({allAvailablePets.length})
                      </h3>
                      <div className="flex flex-wrap justify-center gap-2">
                        {allAvailablePets.filter(
                          (pet) => pet.status !== "REJECTED"
                        ).length > 0 ? (
                          allAvailablePets
                            .filter((pet) => pet.status !== "REJECTED")
                            .map((pet) => (
                              <div
                                key={pet.id}
                                className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                              >
                                <div className="relative h-56 overflow-hidden">
                                  <img
                                    src={getImageUrl(pet.image)}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = "/default-pet.png";
                                    }}
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                    <h3 className="text-white font-bold text-lg">
                                      {pet.name}
                                    </h3>
                                  </div>
                                  <div className="absolute top-2 right-2">
                                    <span className="px-3 py-1 bg-pink-600 text-white text-xs font-bold rounded-full shadow-lg">
                                      AVAILABLE
                                    </span>
                                  </div>
                                </div>
                                <div className="p-5 space-y-3">
                                  <div className="inline-block px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                                    {pet.type}
                                  </div>
                                  <div className="space-y-2">
                                    {pet.breed && (
                                      <span className="block text-gray-700 dark:text-gray-200 text-sm">
                                        <span className="font-semibold">
                                          Breed:
                                        </span>{" "}
                                        {pet.breed}
                                      </span>
                                    )}
                                    {pet.location && (
                                      <span className="block text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                                        <span className="material-icons text-sm">
                                          location_on
                                        </span>
                                        {pet.location}
                                      </span>
                                    )}
                                    {pet.age && (
                                      <span className="block text-gray-600 dark:text-gray-300 text-sm">
                                        <span className="font-semibold">
                                          Age:
                                        </span>{" "}
                                        {pet.age} years
                                      </span>
                                    )}
                                    {pet.gender && (
                                      <span className="block text-gray-600 dark:text-gray-300 text-sm">
                                        <span className="font-semibold">
                                          Gender:
                                        </span>{" "}
                                        {pet.gender}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => viewDetails(pet, "pet")}
                                    title="View details"
                                    aria-label="View details"
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                  >
                                    <span className="material-icons text-sm">
                                      visibility
                                    </span>
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="col-span-full text-center py-16">
                            <span className="text-6xl block mb-4">📭</span>
                            <p className="text-gray-500 text-lg">
                              No pets available for adoption
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Adoption Requests */}
                  {activeRecordsTab === "all-adoption-requests" && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-indigo-600 flex items-center gap-2">
                        <span className="material-icons">assignment</span>
                        All Adoption Requests (
                        {
                          allAdoptionRequests.filter(
                            (adoption) =>
                              adoption.status !== "rejected" &&
                              adoption.status !== "cancelled"
                          ).length
                        }
                        )
                      </h3>
                      <div className="space-y-4">
                        {allAdoptionRequests.filter(
                          (adoption) =>
                            adoption.status !== "rejected" &&
                            adoption.status !== "cancelled"
                        ).length > 0 ? (
                          allAdoptionRequests
                            .filter(
                              (adoption) =>
                                adoption.status !== "rejected" &&
                                adoption.status !== "cancelled"
                            )
                            .map((adoption) => (
                              <div
                                key={adoption.id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border border-indigo-100"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <h4 className="font-bold text-lg text-gray-800">
                                        {adoption.pet?.name || "Pet"}
                                      </h4>
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                                          adoption.status === "approved"
                                            ? "bg-green-100 text-green-700"
                                            : adoption.status === "rejected"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                      >
                                        {adoption.status?.toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                      <span className="font-semibold">
                                        Requested by:
                                      </span>{" "}
                                      {adoption.user?.username || "User"}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                      <span className="font-semibold">
                                        Email:
                                      </span>{" "}
                                      {adoption.user?.email || "N/A"}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                      <span className="font-semibold">
                                        Reason:
                                      </span>{" "}
                                      {adoption.reason || "N/A"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                      Submitted:{" "}
                                      {new Date(
                                        adoption.created_at
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 mt-3">
                                    <button
                                      title="View details"
                                      aria-label="View details"
                                      onClick={() =>
                                        viewDetails(
                                          adoption,
                                          "adoption-request"
                                        )
                                      }
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        visibility
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-16">
                            <span className="text-6xl block mb-4">📋</span>
                            <p className="text-gray-500 text-lg">
                              No adoption requests found
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Adoption Posts History */}
                  {/* Removed All Adoption Posts History tab and content for unified design */}
                </div>
              )}
              {/* All Pets Tab (OLD - Keep for backward compatibility) */}
              {activeTab === "all-pets" && (
                <div className="space-y-6">
                  <h2
                    className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 bg-clip-text text-transparent flex items-center justify-between cursor-pointer"
                    onClick={() => setShowPetOverview(!showPetOverview)}
                  >
                    <span>All Pets - Complete Overview</span>
                    <span className="material-icons text-purple-500">
                      {showPetOverview ? "expand_less" : "expand_more"}
                    </span>
                  </h2>

                  {showPetOverview && (
                    <>
                      {/* Lost Pets */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-purple-200">
                        <h3 className="text-2xl font-bold mb-4 text-purple-600 flex items-center gap-2">
                          <span className="material-icons">search</span>
                          Lost Pets ({allLostPets.length})
                        </h3>
                        {allLostPets.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 justify-items-start">
                            {allLostPets.map((pet) => (
                              <div
                                key={pet.id}
                                className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-slate-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-purple-200 dark:border-purple-800"
                              >
                                <div className="relative h-48 overflow-hidden rounded-t-xl">
                                  <img
                                    src={getImageUrl(pet.photo || pet.image)}
                                    alt={pet.pet_name || pet.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = "/default-pet.png";
                                    }}
                                  />
                                  <div className="absolute top-2 right-2">
                                    <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                                      LOST
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4 space-y-2">
                                  <h4 className="font-bold text-gray-800">
                                    {pet.pet_name || pet.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {pet.animal_type || pet.type}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span className="material-icons text-xs">
                                      location_on
                                    </span>
                                    {pet.pet_location ||
                                      pet.location ||
                                      "Unknown"}
                                  </p>
                                  <button
                                    onClick={() => viewDetails(pet, "report")}
                                    className="w-full mt-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-all"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <span className="material-icons text-5xl mb-2">
                              search_off
                            </span>
                            <p>No lost pets found</p>
                          </div>
                        )}
                      </div>

                      {/* Found Pets */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-green-200">
                        <h3 className="text-2xl font-bold mb-4 text-green-600 flex items-center gap-2">
                          <span className="material-icons">check_circle</span>
                          Found Pets ({allFoundPets.length})
                        </h3>
                        {allFoundPets.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 justify-items-start">
                            {allFoundPets.map((pet) => (
                              <div
                                key={pet.id}
                                className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-green-200"
                              >
                                <div className="relative h-48 overflow-hidden rounded-t-xl">
                                  <img
                                    src={getImageUrl(pet.photo || pet.image)}
                                    alt={pet.pet_name || pet.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = "/default-pet.png";
                                    }}
                                  />
                                  <div className="absolute top-2 right-2">
                                    <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                                      FOUND
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4 space-y-2">
                                  <h4 className="font-bold text-gray-800">
                                    {pet.pet_name || pet.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {pet.animal_type || pet.type}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span className="material-icons text-xs">
                                      location_on
                                    </span>
                                    {pet.pet_location ||
                                      pet.location ||
                                      "Unknown"}
                                  </p>
                                  <button
                                    onClick={() => viewDetails(pet, "report")}
                                    className="w-full mt-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <span className="material-icons text-5xl mb-2">
                              pets
                            </span>
                            <p>No found pets</p>
                          </div>
                        )}
                      </div>

                      {/* Adopted Pets */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-purple-200">
                        <h3 className="text-2xl font-bold mb-4 text-purple-600 flex items-center gap-2">
                          <span className="material-icons">favorite</span>
                          Adopted Pets ({allAdoptedPets.length})
                        </h3>
                        {allAdoptedPets.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 justify-items-start">
                            {allAdoptedPets.map((pet) => (
                              <div
                                key={pet.id}
                                className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-200"
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
                                  <div className="absolute top-2 right-2">
                                    <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                                      ADOPTED
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4 space-y-2">
                                  <h4 className="font-bold text-gray-800">
                                    {pet.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {pet.type}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {pet.age} years • {pet.gender}
                                  </p>
                                  <button
                                    onClick={() => viewDetails(pet, "pet")}
                                    className="w-full mt-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-all"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <span className="material-icons text-5xl mb-2">
                              favorite_border
                            </span>
                            <p>No adopted pets yet</p>
                          </div>
                        )}
                      </div>

                      {/* Available Pets */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-pink-200">
                        <h3 className="text-2xl font-bold mb-4 text-pink-600 flex items-center gap-2">
                          <span className="material-icons">pets</span>
                          Available for Adoption ({allAvailablePets.length})
                        </h3>
                        {allAvailablePets.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                            {allAvailablePets.map((pet) => (
                              <div
                                key={pet.id}
                                className="w-80 h-[400px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                              >
                                <div className="relative h-40 overflow-hidden">
                                  <img
                                    src={getImageUrl(pet.image)}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = "/default-pet.png";
                                    }}
                                  />
                                  {/* Top right controls: favourite and delete */}
                                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle favorite toggling here if needed
                                      }}
                                      title="Add to favourites"
                                      className="w-10 h-10 flex items-center justify-center rounded-full shadow-md bg-white text-gray-800 dark:bg-slate-700 dark:text-white"
                                    >
                                      <span className="material-icons">
                                        favorite
                                      </span>
                                    </button>
                                    <button
                                      title="Delete pet"
                                      aria-label="Delete pet"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (
                                          window.confirm(
                                            `Are you sure you want to delete ${pet.name}? This cannot be undone.`
                                          )
                                        ) {
                                          try {
                                            await petsAPI.deletePet(pet.id);
                                            setSuccessMessage(
                                              "Pet deleted successfully."
                                            );
                                            loadAllData();
                                          } catch (err) {
                                            setError("Failed to delete pet.");
                                            console.error(err);
                                          }
                                        }
                                      }}
                                      className="w-10 h-10 flex items-center justify-center rounded-full shadow-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                                    >
                                      <span className="material-icons">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                    <h3 className="text-white font-bold text-lg">
                                      {pet.name}
                                    </h3>
                                  </div>
                                </div>
                                <div className="p-4 space-y-2 flex-1 overflow-hidden">
                                  <div className="flex items-center justify-between">
                                    <div className="inline-block px-3 py-1 bg-blue-100 text-primary-blue rounded-full text-sm font-semibold">
                                      {pet.type}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-slate-300">
                                      {pet.age} years • {pet.gender}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    {pet.breed && (
                                      <span className="block text-gray-700 dark:text-white text-sm">
                                        <span className="font-semibold">
                                          Breed:
                                        </span>{" "}
                                        {pet.breed}
                                      </span>
                                    )}
                                    {pet.location && (
                                      <span className="flex items-center gap-1 text-gray-700 dark:text-white text-sm">
                                        <span className="material-icons text-xs">
                                          location_on
                                        </span>
                                        {pet.location}
                                      </span>
                                    )}
                                  </div>

                                  <div className="px-3 py-2 rounded-lg text-center font-semibold text-sm bg-pink-100 text-pink-700 dark:bg-pink-800 dark:text-pink-100 mt-2">
                                    <strong>AVAILABLE</strong>
                                  </div>

                                  {/* Bottom controls: icons only */}
                                  <div className="flex items-center justify-center mt-3 gap-2">
                                    <button
                                      title="View details"
                                      aria-label="View details"
                                      onClick={() => viewDetails(pet, "pet")}
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                                    >
                                      <span className="material-icons">
                                        visibility
                                      </span>
                                    </button>
                                    <button
                                      title="Delete pet"
                                      aria-label="Delete pet"
                                      onClick={async () => {
                                        if (
                                          window.confirm(
                                            `Are you sure you want to delete ${pet.name}? This cannot be undone.`
                                          )
                                        ) {
                                          try {
                                            await petsAPI.deletePet(pet.id);
                                            setSuccessMessage(
                                              "Pet deleted successfully."
                                            );
                                            loadAllData();
                                          } catch (err) {
                                            setError("Failed to delete pet.");
                                            console.error(err);
                                          }
                                        }
                                      }}
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                                    >
                                      <span className="material-icons">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <span className="material-icons text-5xl mb-2">
                              pets
                            </span>
                            <p>No pets available for adoption</p>
                          </div>
                        )}
                      </div>

                      {/* Summary Stats */}
                      <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-slate-800 rounded-2xl shadow-xl p-6 border-2 border-purple-200 dark:border-purple-800">
                        <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <span className="material-icons dark:text-purple-400">
                            insights
                          </span>
                          Summary
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-purple-600">
                              {allLostPets.length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Lost
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-green-600">
                              {allFoundPets.length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Found
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-purple-600">
                              {allAdoptedPets.length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Adopted
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-pink-600">
                              {allAvailablePets.length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Available
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl text-center">
                          <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 bg-clip-text text-transparent">
                            {allLostPets.length +
                              allFoundPets.length +
                              allAdoptedPets.length +
                              allAvailablePets.length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Total Pets in System
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Search Tab */}
              {activeTab === "search" && (
                <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 space-y-6">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
                    <span className="material-icons text-4xl text-purple-600">
                      search
                    </span>
                    Search & Filter Pets
                  </h2>

                  {/* Search Filters */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <span className="material-icons dark:text-purple-400">
                        tune
                      </span>
                      Search Filters
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Search Query */}
                      <div className="lg:col-span-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Search by Name, Breed, or Location
                        </label>
                        <input
                          type="text"
                          placeholder="Enter search terms..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSearch()
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Pet Type */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Pet Type
                        </label>
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="all">All Types</option>
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                          <option value="bird">Bird</option>
                          <option value="rabbit">Rabbit</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {/* Pet Status */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Pet Status
                        </label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="all">All Status</option>
                          <option value="lost">Lost</option>
                          <option value="found">Found</option>
                          <option value="adopted">Adopted</option>
                          <option value="available">
                            Available for Adoption
                          </option>
                        </select>
                      </div>

                      {/* Report Status */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Report Status
                        </label>
                        <select
                          value={filterReportStatus}
                          onChange={(e) =>
                            setFilterReportStatus(e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="all">All Reports</option>
                          <option value="accepted">Accepted Only</option>
                          <option value="pending">Pending Only</option>
                          <option value="rejected">Rejected Only</option>
                        </select>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Gender
                        </label>
                        <select
                          value={filterGender}
                          onChange={(e) => setFilterGender(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Any Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      {/* Breed */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Breed
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Labrador, Persian..."
                          value={filterBreed}
                          onChange={(e) => setFilterBreed(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          placeholder="City, state, or area..."
                          value={filterLocation}
                          onChange={(e) => setFilterLocation(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Search Buttons */}
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={handleSearch}
                        disabled={searchLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-icons">search</span>
                        <span className="font-semibold">
                          {searchLoading ? "Searching..." : "Search Pets"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setFilterType("all");
                          setFilterStatus("all");
                          setFilterGender("");
                          setFilterBreed("");
                          setFilterLocation("");
                          setFilterReportStatus("accepted");
                          setSearchResults([]);
                          setHasSearched(false);
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 transition-all duration-200 font-semibold"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                    <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                      <span className="material-icons">pets</span>
                      Search Results{" "}
                      {hasSearched && `(${searchResults.length} found)`}
                    </h3>

                    {searchLoading ? (
                      <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        <p className="text-gray-600 mt-4">Searching...</p>
                      </div>
                    ) : hasSearched ? (
                      searchResults.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-6">
                          {searchResults.map((pet) => (
                            <div
                              key={pet.id}
                              className="w-80 h-[450px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                            >
                              <div className="relative h-40 overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                                <img
                                  src={getImageUrl(pet.image)}
                                  alt={pet.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = "/default-pet.png";
                                  }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                  <h3 className="text-white text-xl font-bold">
                                    {pet.name || "Unnamed"}
                                  </h3>
                                </div>
                                <div className="absolute top-2 right-2">
                                  <span
                                    className={`px-3 py-1 text-white text-xs font-bold rounded-full shadow-lg ${
                                      pet.status === "lost"
                                        ? "bg-red-600"
                                        : pet.status === "found"
                                        ? "bg-green-600"
                                        : pet.status === "adopted"
                                        ? "bg-purple-600"
                                        : "bg-pink-600"
                                    }`}
                                  >
                                    {pet.status?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="p-5 space-y-3 flex-1 overflow-hidden">
                                <div className="inline-block px-3 py-1 bg-gradient-to-r from-primary-blue to-primary-teal text-white text-sm font-semibold rounded-full">
                                  {pet.type}
                                </div>
                                <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-slate-200">
                                  {pet.breed && (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg">
                                      {pet.breed}
                                    </span>
                                  )}
                                  {pet.age !== undefined && (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg flex items-center gap-1">
                                      🎂 {pet.age}{" "}
                                      {pet.age === 1 ? "year" : "years"}
                                    </span>
                                  )}
                                  {pet.gender && (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg">
                                      {pet.gender === "Male" ? "♂️" : "♀️"}{" "}
                                      {pet.gender}
                                    </span>
                                  )}
                                  {pet.location && (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg flex items-center gap-1">
                                      <span className="material-icons text-xs">
                                        location_on
                                      </span>{" "}
                                      {pet.location}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {pet.is_vaccinated && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100 text-xs font-semibold rounded-lg flex items-center gap-1">
                                      ✓ Vaccinated
                                    </span>
                                  )}
                                  {pet.is_diseased && (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100 text-xs font-semibold rounded-lg flex items-center gap-1">
                                      ⚠ Health Condition
                                    </span>
                                  )}
                                </div>
                                <div className="pt-2"></div>
                                <div className="flex items-center justify-end gap-4 mt-2">
                                  <button
                                    onClick={() => viewDetails(pet, "pet")}
                                    className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                                    title="View details"
                                  >
                                    <span className="material-icons">
                                      visibility
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="col-span-full text-center py-16">
                          <span className="text-6xl block mb-4">😔</span>
                          <p className="text-gray-500 text-lg">
                            No pets found matching your criteria
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            Try adjusting your filters
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <span className="text-6xl block mb-4">🔍</span>
                        <p className="text-gray-500 text-lg">
                          Enter search criteria and click "Search Pets" to find
                          pets
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Available Pets Section */}
              {activeTab === "available-pets" && (
                <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg p-8 border border-blue-100 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="material-icons text-3xl text-pink-600">
                      pets
                    </span>
                    <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      ALL AVAILABLE PETS FOR ADOPTION
                    </span>
                  </h2>

                  <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="bg-pink-100 p-3 rounded-full">
                        <span className="material-icons text-pink-600">
                          info
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">
                          Available for Adoption
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          These pets are ready to find their forever homes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-pink-600">
                        {allAvailablePets.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Total Pets
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {allAvailablePets.length > 0 ? (
                      allAvailablePets.map((pet) => (
                        <div
                          key={pet.id}
                          className="flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                        >
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={getImageUrl(pet.image)}
                              alt={pet.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = "/default-pet.png";
                              }}
                            />
                            {/* Favourite toggle button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle favorite toggling here if needed
                              }}
                              title="Add to favourites"
                              className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full shadow-md bg-white text-gray-800 dark:bg-slate-700 dark:text-white"
                            >
                              <span className="material-icons">favorite</span>
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                              <h3 className="text-white font-bold text-lg">
                                {pet.name || "Unnamed"}
                              </h3>
                            </div>
                            {pet.is_vaccinated && (
                              <div className="absolute top-2 left-2">
                                <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                                  <span className="material-icons text-xs">
                                    verified
                                  </span>
                                  Vaccinated
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="inline-block px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                              {pet.type}
                            </div>
                            <div className="space-y-2">
                              {pet.breed && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                  <span className="material-icons text-sm text-pink-600">
                                    pets
                                  </span>
                                  <span className="font-semibold">Breed:</span>{" "}
                                  {pet.breed}
                                </div>
                              )}
                              {pet.gender && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                  <span className="material-icons text-sm text-pink-600">
                                    {pet.gender === "male" ? "male" : "female"}
                                  </span>
                                  <span className="font-semibold">Gender:</span>{" "}
                                  {pet.gender}
                                </div>
                              )}
                              {pet.age !== undefined && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                  <span className="material-icons text-sm text-pink-600">
                                    cake
                                  </span>
                                  <span className="font-semibold">Age:</span>{" "}
                                  {pet.age} {pet.age === 1 ? "year" : "years"}
                                </div>
                              )}
                              {pet.colour && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                  <span className="material-icons text-sm text-pink-600">
                                    palette
                                  </span>
                                  <span className="font-semibold">Color:</span>{" "}
                                  {pet.colour}
                                </div>
                              )}
                              {pet.weight && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                  <span className="material-icons text-sm text-pink-600">
                                    monitor_weight
                                  </span>
                                  <span className="font-semibold">Weight:</span>{" "}
                                  {pet.weight} kg
                                </div>
                              )}
                              {pet.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                  <span className="material-icons text-sm text-pink-600">
                                    location_on
                                  </span>
                                  <span>{pet.location}</span>
                                </div>
                              )}
                              {/* description hidden in card; use View Details to read full description */}
                            </div>

                            {/* Bottom controls: icons only */}
                            <div className="flex items-center justify-center mt-3 gap-2 pt-3 border-t border-gray-100">
                              <button
                                title="View details"
                                aria-label="View details"
                                onClick={() => viewDetails(pet, "pet")}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                              >
                                <span className="material-icons">
                                  visibility
                                </span>
                              </button>
                              <button
                                title="Delete pet"
                                aria-label="Delete pet"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete ${pet.name}? This cannot be undone.`
                                    )
                                  ) {
                                    try {
                                      await petsAPI.deletePet(pet.id);
                                      setSuccessMessage(
                                        "Pet deleted successfully."
                                      );
                                      loadAllData();
                                    } catch (err) {
                                      setError("Failed to delete pet.");
                                      console.error(err);
                                    }
                                  }
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 z-20"
                                style={{ display: "flex" }}
                              >
                                <span className="material-icons">delete</span>
                              </button>
                            </div>

                            {/* Health & Vaccination Info */}
                            <div className="flex gap-2 pt-2">
                              {pet.is_vaccinated && (
                                <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                  <span className="material-icons text-xs">
                                    check_circle
                                  </span>
                                  Vaccinated
                                </div>
                              )}
                              {!pet.is_diseased && (
                                <div className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                                  <span className="material-icons text-xs">
                                    health_and_safety
                                  </span>
                                  Healthy
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <span className="text-6xl block mb-4">🏠</span>
                        <p className="text-gray-500 text-lg">
                          No pets available for adoption at the moment
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          Check back later for new additions
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Profile Tab */}
              {activeTab === "feedbacks" && (
                <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg p-8 border border-blue-100 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="material-icons text-3xl text-purple-600 dark:text-purple-400">
                      chat
                    </span>
                    <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 bg-clip-text text-transparent">
                      COMMUNITY FEEDBACK
                    </span>
                  </h2>

                  <div className="mb-6 text-center">
                    <p className="text-gray-700 dark:text-gray-300">
                      See what users are saying about our platform. You can add
                      administrative feedback using the form below.
                    </p>
                  </div>

                  {/* Feedback List */}
                  <div className="mt-8">
                    <div className="transition-colors duration-300">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
                          <p className="mt-4 text-gray-600 font-medium">
                            Loading feedback...
                          </p>
                        </div>
                      ) : allFeedbacks.length === 0 ? (
                        <div className="text-center py-16 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                          <div className="text-6xl mb-4">💬</div>
                          <p className="text-gray-500 dark:text-gray-300 text-lg">
                            No feedback yet
                          </p>
                          <p className="text-gray-400 dark:text-gray-400 text-sm mt-2">
                            Be the first to add feedback
                          </p>
                        </div>
                      ) : (
                        <>
                          <ul className="space-y-4">
                            {allFeedbacks.map((f) => {
                              const isExpanded =
                                expandedFeedbacks[f.id] || false;
                              const messageTooLong =
                                f.message && f.message.length > 150;
                              const displayMessage = isExpanded
                                ? f.message
                                : messageTooLong
                                ? f.message.substring(0, 150) + "..."
                                : f.message;

                              return (
                                <li
                                  key={f.id}
                                  className="bg-gradient-to-br from-white to-purple-50 dark:from-slate-700 dark:to-slate-800 p-6 rounded-xl shadow-md border border-purple-100 dark:border-purple-900"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-full w-10 h-10 flex items-center justify-center">
                                        {f.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">
                                          {f.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {f.email}
                                        </p>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        f.created_at
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>

                                  {/* Message with read more toggle */}
                                  <p className="mt-3 whitespace-pre-line text-gray-700 dark:text-white">
                                    {displayMessage}
                                  </p>

                                  {messageTooLong && (
                                    <button
                                      onClick={() =>
                                        setExpandedFeedbacks((prev) => ({
                                          ...prev,
                                          [f.id]: !prev[f.id],
                                        }))
                                      }
                                      className="mt-2 text-sm text-purple-700 hover:text-purple-500 hover:underline"
                                    >
                                      {isExpanded ? "Read less" : "Read more"}
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                    </div>

                    {/* Feedback Form */}
                    <div className="mt-12 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl shadow-md border border-purple-100 dark:border-purple-800">
                      <h3 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-400">
                        Add Administrative Feedback
                      </h3>
                      <form
                        onSubmit={handleFeedbackSubmit}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={feedbackForm.name}
                            onChange={(e) =>
                              setFeedbackForm({
                                ...feedbackForm,
                                name: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Your name"
                          />
                          {feedbackFormErrors.name && (
                            <p className="text-red-500 text-sm mt-1">
                              {feedbackFormErrors.name}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Feedback
                          </label>
                          <textarea
                            value={feedbackForm.message}
                            onChange={(e) =>
                              setFeedbackForm({
                                ...feedbackForm,
                                message: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 h-32 dark:bg-gray-700 dark:text-white"
                            placeholder="Your feedback message"
                          />
                          {feedbackFormErrors.message && (
                            <p className="text-red-500 text-sm mt-1">
                              {feedbackFormErrors.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <button
                            type="submit"
                            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                          >
                            Submit Feedback
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "profile" && (
                <div className="bg-gradient-to-br from-purple-200/70 to-purple-250/60 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200/70 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-icons text-3xl text-primary-blue">
                      person
                    </span>
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
                            <span className="material-icons text-6xl text-primary-blue">
                              person
                            </span>
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
                      <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-slate-600 mb-6">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                              {profileData.first_name}{" "}
                              {profileData.last_name || user?.username}
                            </h3>
                            <p className="text-gray-500 dark:text-slate-300 mt-1">
                              {profileData.email}
                            </p>
                          </div>

                          {!isEditingProfile ? (
                            <button
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-blue to-primary-teal text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                              onClick={() => setIsEditingProfile(true)}
                            >
                              <span className="material-icons text-sm">
                                edit
                              </span>
                              <span className="font-semibold">
                                Edit Profile
                              </span>
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleProfileSubmit}
                                disabled={submitLoading}
                              >
                                <span className="material-icons text-sm">
                                  save
                                </span>
                                <span className="font-semibold">
                                  {submitLoading ? "Saving..." : "Save"}
                                </span>
                              </button>
                              <button
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                                onClick={() => {
                                  setIsEditingProfile(false);
                                  setProfileImage(null);
                                  setProfileImagePreview(
                                    getImageUrl(profileData.profile_picture)
                                  );
                                }}
                              >
                                <span className="material-icons text-sm">
                                  cancel
                                </span>
                                <span className="font-semibold">Cancel</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditingProfile ? (
                          <form
                            onSubmit={handleProfileSubmit}
                            className="space-y-4"
                          >
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  First Name
                                </label>
                                <input
                                  type="text"
                                  name="first_name"
                                  value={profileData.first_name}
                                  onChange={handleProfileInputChange}
                                  placeholder="Enter first name"
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Last Name
                                </label>
                                <input
                                  type="text"
                                  name="last_name"
                                  value={profileData.last_name}
                                  onChange={handleProfileInputChange}
                                  placeholder="Enter last name"
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200"
                                />
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Email
                                </label>
                                <input
                                  type="email"
                                  name="email"
                                  value={profileData.email}
                                  onChange={handleProfileInputChange}
                                  placeholder="Enter email address"
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Phone Number
                                </label>
                                <input
                                  type="tel"
                                  name="phone_no"
                                  value={profileData.phone_no}
                                  onChange={handleProfileInputChange}
                                  placeholder="Enter phone number"
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200"
                                />
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  City
                                </label>
                                <input
                                  type="text"
                                  name="city"
                                  value={profileData.city}
                                  onChange={handleProfileInputChange}
                                  placeholder="Enter city"
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  State
                                </label>
                                <input
                                  type="text"
                                  name="state"
                                  value={profileData.state}
                                  onChange={handleProfileInputChange}
                                  placeholder="Enter state"
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200"
                                />
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  PIN Code
                                </label>
                                <input
                                  type="text"
                                  name="pincode"
                                  value={profileData.pincode}
                                  onChange={handleProfileInputChange}
                                  placeholder="Enter PIN code"
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Gender
                                </label>
                                <select
                                  name="gender"
                                  value={profileData.gender}
                                  onChange={handleProfileInputChange}
                                  className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200 bg-white dark:bg-slate-700"
                                >
                                  <option value="">Select Gender</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                Address
                              </label>
                              <textarea
                                name="address"
                                value={profileData.address}
                                onChange={handleProfileInputChange}
                                placeholder="Enter complete address"
                                rows="3"
                                className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-slate-600 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 dark:bg-slate-700 dark:text-white outline-none transition-all duration-200 resize-none"
                              />
                            </div>
                          </form>
                        ) : (
                          <div className="p-5 space-y-3 flex-1 overflow-hidden">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                              {profileData.first_name}{" "}
                              {profileData.last_name || user?.username}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-slate-200">
                              {profileData.email}
                            </p>

                            <div className="grid grid-cols-1 gap-4 mt-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700 dark:text-slate-200">
                                  <span className="font-semibold">City:</span>{" "}
                                  {profileData.city || "Not provided"}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-slate-200">
                                  <span className="font-semibold">State:</span>{" "}
                                  {profileData.state || "Not provided"}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="border-b border-blue-100 dark:border-slate-600 pb-2">
                                  <span className="flex items-center gap-2 text-sm font-semibold text-primary-blue dark:text-blue-300 uppercase tracking-wide">
                                    <span className="material-icons text-lg">
                                      local_post_office
                                    </span>
                                    PIN Code
                                  </span>
                                  <p className="text-lg text-gray-800 dark:text-white ml-6 mt-1">
                                    {profileData.pincode || "Not provided"}
                                  </p>
                                </div>
                                <div className="border-b border-blue-100 dark:border-slate-600 pb-2">
                                  <span className="flex items-center gap-2 text-sm font-semibold text-primary-blue dark:text-blue-300 uppercase tracking-wide">
                                    <span className="material-icons text-lg">
                                      face
                                    </span>
                                    Gender
                                  </span>
                                  <p className="text-lg text-gray-800 dark:text-white ml-6 mt-1">
                                    {profileData.gender || "Not provided"}
                                  </p>
                                </div>
                              </div>

                              <div className="pt-2">
                                <span className="flex items-center gap-2 text-sm font-semibold text-primary-blue dark:text-blue-300 uppercase tracking-wide">
                                  <span className="material-icons text-lg">
                                    home
                                  </span>
                                  Address
                                </span>
                                <p className="text-lg text-gray-800 dark:text-white ml-6 mt-1 whitespace-pre-wrap">
                                  {profileData.address || "Not provided"}
                                </p>
                              </div>
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
                <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg p-8 border border-blue-100 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="material-icons text-3xl text-purple-600 dark:text-purple-400">
                      notifications
                    </span>
                    <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 bg-clip-text text-transparent">
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
                              : "bg-purple-50 border-purple-500 shadow-sm"
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
                            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
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

        {/* Pet/Report Detail Modal */}
        {showDetailModal && selectedItem && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden relative animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Fixed Position */}
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-6 right-6 z-20 bg-white/95 dark:bg-slate-700/95 hover:bg-red-500 text-gray-700 dark:text-white hover:text-white rounded-full p-3 shadow-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90"
                aria-label="Close modal"
              >
                <span className="material-icons text-xl">close</span>
              </button>

              <div className="overflow-y-auto max-h-[95vh] custom-scrollbar">
                {/* Hero Section with Large Image */}
                <div className="relative h-96 overflow-hidden">
                  <img
                    src={getImageUrl(
                      selectedItem.photo ||
                        selectedItem.image ||
                        selectedItem.pet_image
                    )}
                    alt={selectedItem.name || selectedItem.pet_name || "Pet"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/default-pet.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                  {/* Pet Name & Type Badge */}
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-end justify-between">
                      <div>
                        <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
                          {selectedItem.name ||
                            selectedItem.pet_name ||
                            "Pet Details"}
                        </h1>
                        <div className="flex items-center gap-3">
                          {selectedItem.type && (
                            <span className="px-5 py-2 bg-gradient-to-r from-primary-blue to-primary-teal text-white rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
                              <span className="material-icons text-lg">
                                pets
                              </span>
                              {selectedItem.type}
                            </span>
                          )}
                          {selectedItem.breed && (
                            <span className="px-5 py-2 bg-white/20 backdrop-blur-md text-white rounded-full text-sm font-semibold shadow-xl">
                              {selectedItem.breed}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      {selectedItem.status && (
                        <div
                          className={`px-6 py-3 rounded-2xl font-bold text-lg shadow-2xl backdrop-blur-md ${
                            selectedItem.status === "available"
                              ? "bg-green-500/90 text-white"
                              : selectedItem.status === "adopted"
                              ? "bg-blue-500/90 text-white"
                              : "bg-gray-500/90 text-white"
                          }`}
                        >
                          <span className="material-icons mr-2 align-middle">
                            {selectedItem.status === "available"
                              ? "check_circle"
                              : selectedItem.status === "adopted"
                              ? "favorite"
                              : "info"}
                          </span>
                          {selectedItem.status?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content Section */}
                <div className="p-8 space-y-6">
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <span className="material-icons text-3xl mb-2 opacity-90">
                        cake
                      </span>
                      <p className="text-sm opacity-90 font-medium">Age</p>
                      <p className="text-2xl font-bold">
                        {selectedItem.age || selectedItem.pet_age || "N/A"}
                        {(selectedItem.age || selectedItem.pet_age) && (
                          <span className="text-sm"> yrs</span>
                        )}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <span className="material-icons text-3xl mb-2 opacity-90">
                        {selectedItem.gender?.toLowerCase() === "male"
                          ? "male"
                          : "female"}
                      </span>
                      <p className="text-sm opacity-90 font-medium">Gender</p>
                      <p className="text-2xl font-bold capitalize">
                        {selectedItem.gender || "N/A"}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <span className="material-icons text-3xl mb-2 opacity-90">
                        palette
                      </span>
                      <p className="text-sm opacity-90 font-medium">Color</p>
                      <p className="text-2xl font-bold capitalize">
                        {selectedItem.colour || selectedItem.color || "N/A"}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <span className="material-icons text-3xl mb-2 opacity-90">
                        monitor_weight
                      </span>
                      <p className="text-sm opacity-90 font-medium">Weight</p>
                      <p className="text-2xl font-bold">
                        {selectedItem.weight ||
                          selectedItem.pet_weight ||
                          "N/A"}
                        {(selectedItem.weight || selectedItem.pet_weight) && (
                          <span className="text-sm"> kg</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Description Card */}
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 p-6 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-500">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary-blue rounded-xl">
                        <span className="material-icons text-white text-2xl">
                          description
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        About{" "}
                        {selectedItem.name || selectedItem.pet_name || "pet"}
                      </h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-lg">
                      {selectedItem.description ||
                        "No description available for this pet."}
                    </p>
                  </div>

                  {/* Two Column Layout for Location and Medical */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Location Information */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 p-6 rounded-2xl shadow-lg border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-500 rounded-xl">
                          <span className="material-icons text-white text-2xl">
                            location_on
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                          Location
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="material-icons text-orange-600 dark:text-orange-400 mt-1">
                            home
                          </span>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                              Address
                            </p>
                            <p className="text-gray-800 dark:text-white font-semibold">
                              {selectedItem.pet_location ||
                                selectedItem.location ||
                                "Not specified"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="material-icons text-orange-600 dark:text-orange-400 mt-1">
                            location_city
                          </span>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                              City
                            </p>
                            <p className="text-gray-800 dark:text-white font-semibold">
                              {selectedItem.city || "Not specified"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="material-icons text-orange-600 dark:text-orange-400 mt-1">
                            map
                          </span>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                              State
                            </p>
                            <p className="text-gray-800 dark:text-white font-semibold">
                              {selectedItem.state || "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Health Status */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-6 rounded-2xl shadow-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-500 rounded-xl">
                          <span className="material-icons text-white text-2xl">
                            health_and_safety
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                          Health Status
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">
                            <span
                              className={`material-icons ${
                                selectedItem.is_vaccinated
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {selectedItem.is_vaccinated
                                ? "verified"
                                : "cancel"}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-white">
                              Vaccination
                            </span>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              selectedItem.is_vaccinated
                                ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                            }`}
                          >
                            {selectedItem.is_vaccinated
                              ? "Complete"
                              : "Pending"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">
                            <span
                              className={`material-icons ${
                                !selectedItem.is_diseased
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {!selectedItem.is_diseased
                                ? "favorite"
                                : "warning"}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-white">
                              Health
                            </span>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              !selectedItem.is_diseased
                                ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-100"
                            }`}
                          >
                            {!selectedItem.is_diseased
                              ? "Healthy"
                              : "Needs Care"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-600 dark:bg-slate-500 rounded-xl">
                        <span className="material-icons text-white text-2xl">
                          info
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Additional Information
                      </h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                          Pet ID
                        </p>
                        <p className="text-gray-800 dark:text-white font-bold">
                          #{selectedItem.id}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                          Listed Date
                        </p>
                        <p className="text-gray-800 dark:text-white font-bold">
                          {selectedItem.created_at
                            ? new Date(
                                selectedItem.created_at
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                          Status
                        </p>
                        <p className="text-gray-800 dark:text-white font-bold">
                          {selectedItem.status
                            ? selectedItem.status.toUpperCase()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Sticky Bottom */}
                  <div className="sticky bottom-0 bg-white dark:bg-slate-800 pt-6 pb-2 flex gap-4 border-t-2 border-gray-200 dark:border-slate-600">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <span className="material-icons">arrow_back</span>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Detail Modal */}
        {showNotificationModal && selectedNotification && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setShowNotificationModal(false)}
          >
            <div
              className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-purple-200 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 border-b border-purple-200">
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
                          ? "bg-gray-200 text-gray-700 dark:text-gray-200"
                          : "bg-purple-500 text-white"
                      }`}
                    >
                      {selectedNotification.is_read ? "Read" : "Unread"}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(
                        selectedNotification.created_at
                      ).toLocaleString()}
                    </span>
                  </div>

                  {/* Notification Title (if exists) */}
                  {selectedNotification.title && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-purple-200 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="material-icons text-purple-600">
                          title
                        </span>
                        {selectedNotification.title}
                      </h3>
                    </div>
                  )}

                  {/* Notification Message */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-purple-200 shadow-sm">
                    <h4 className="text-sm font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-3 flex items-center gap-2">
                      <span className="material-icons text-purple-600 text-sm">
                        message
                      </span>
                      Message
                    </h4>
                    <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                      {selectedNotification.message}
                    </p>
                  </div>

                  {/* Additional Info (if exists) */}
                  {selectedNotification.notification_type && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900 dark:to-indigo-900 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-purple-600 dark:text-purple-400">
                          info
                        </span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Type:
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {selectedNotification.notification_type}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-purple-50 dark:bg-purple-900 p-4 border-t border-purple-200 dark:border-purple-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-800 dark:to-indigo-800 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  <span className="material-icons text-sm">check</span>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-purple-900 to-indigo-900 dark:from-gray-900 dark:to-gray-800 text-white py-12 px-6 mt-10">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-2">
            <span className="text-white">pet</span>
            <span className="text-purple-300 dark:text-purple-400">rescue</span>
          </h3>
          <p className="text-purple-200 dark:text-purple-300 mb-6">
            Connecting lost pets with their families and finding homes for those
            in need.
          </p>
          <div className="flex justify-center space-x-6">
            <a
              href="#about"
              className="hover:text-yellow-400 transition duration-300"
            >
              About Us
            </a>
            <a
              href="#contact"
              className="hover:text-yellow-400 transition duration-300"
            >
              Contact
            </a>
            <a
              href="#privacy"
              className="hover:text-yellow-400 transition duration-300"
            >
              Privacy Policy
            </a>
          </div>
          <p className="text-gray-400 text-sm mt-6">
            2024 Pet Rescue. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
