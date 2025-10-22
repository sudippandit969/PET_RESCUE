import React, { useState, useEffect, useRef } from "react";
// Local background image (provided by user)
// New background image is served from public/new-background.jpg
import { useAuth } from "../context/AuthContext";
import { userAPI, petsAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import BibiChatbot from "../components/BibiChatbot";
// Helper function to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return "/default-pet.png";
  if (imagePath.startsWith("http")) return imagePath;
  return `http://localhost:8000${imagePath}`;
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [lostReports, setLostReports] = useState([]);
  const [rescueReports, setRescueReports] = useState([]);
  const [allLostReports, setAllLostReports] = useState([]);
  const [availableAdoptionPets, setAvailableAdoptionPets] = useState([]);
  const [myAdoptionPosts, setMyAdoptionPosts] = useState([]);
  const [myAdoptionRequests, setMyAdoptionRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem("userTheme");
    return savedTheme === "dark";
  });
  const [file, setFile] = useState(null);
  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [expandedItems, setExpandedItems] = useState({}); // <-- for read more per feedback

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // References for dropdown containers
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const petActionsRef = useRef(null);

  // Effect to handle outside clicks for dropdowns
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

      // Close pet actions dropdown if clicked outside
      if (
        dropdownOpen &&
        petActionsRef.current &&
        !petActionsRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications, showProfileDropdown, dropdownOpen]);

  // Function to fetch feedback from your database/API
  const fetchFeedback = async () => {
    setLoading(true);
    // Use environment-configurable backend URL so it works in different setups
    const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
    const url = `${API_BASE.replace(/\/$/, "")}/api/feedbacks/`;

    const doFetch = async () => {
      try {
        console.debug("Fetching feedback from", url);
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `HTTP ${response.status} ${response.statusText} - ${text}`
          );
        }
        const data = await response.json();
        // Sort by creation date (newest first)
        setFeedbacks(
          (data || []).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )
        );
        setError(null);
        return true;
      } catch (err) {
        console.error("Feedback fetch error:", err);
        return false;
      }
    };

    // Try once, then retry one time if it fails (handles server warmup)
    const ok = await doFetch();
    if (!ok) {
      console.debug("Retrying feedback fetch once...");
      const ok2 = await doFetch();
      if (!ok2) {
        setError(
          "Could not load community feedback. Please check backend or CORS settings."
        );
      }
    }
    setLoading(false);
  };

  // Run the fetch when the component mounts
  useEffect(() => {
    fetchFeedback();
  }, []);

  // Fetch feedback when modal opens to ensure latest
  useEffect(() => {
    if (showFeedbackModal) fetchFeedback();
  }, [showFeedbackModal]);

  // Fetch feedback when the feedbacks tab is active
  useEffect(() => {
    if (activeTab === "feedbacks") fetchFeedback();
  }, [activeTab]);
  // Collapsible sections state
  const [expandedSection, setExpandedSection] = useState("lostReports");

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!message.trim()) return setError("Please write a feedback message.");

    setSubmitting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("name", name);
      formDataObj.append("message", message);
      if (file) formDataObj.append("image", file);

      const res = await fetch(`http://localhost:8000/api/feedbacks/`, {
        method: "POST",
        body: formDataObj,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to send feedback");
      }

      const newFeedback = await res.json();
      setFeedbacks((prev) => [newFeedback, ...prev]);
      setName("");
      setMessage("");
      setFile(null);
      const inputEl = document.getElementById("feedback-file-input");
      if (inputEl) inputEl.value = "";
    } catch (err) {
      console.error(err);
      setError(err.message || "Error sending feedback");
    } finally {
      setSubmitting(false);
    }
  };

  // NOTE: The above ChatBot component had its own internal open state.
  // Simpler approach: create a chat widget with open state lifted to HomePage so toggle button can control it.
  // We'll implement a second, lifted ChatUI below for actual interactivity where the toggle button controls open.

  /* Lifted Chat UI (controlled by HomePage) */
  const BOT_NAME = "RoboPaws";
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      who: "bot",
      text: `Hi! I'm ${BOT_NAME} 🐾 — your friendly pet helper. Ask me anything!`,
    },
  ]);
  const [chatSending, setChatSending] = useState(false);

  const handleChatToggle = () => {
    setChatOpen((v) => !v);
    // small UX: focus input after opening
    setTimeout(() => {
      const el = document.getElementById("robopaws-input");
      if (el) el.focus();
    }, 200);
  };

  const botReplySimple = (userText) => {
    const text = userText.toLowerCase();
    if (text.includes("lost")) {
      return "I'm sorry your pet is lost — try posting a lost report with location and a clear photo. I can walk you through it if you'd like.";
    }
    if (text.includes("adopt")) {
      return "Great! Check the 'Adopt a Pet' section or tell me your city and I can look for nearby pets.";
    }
    if (text.includes("hello") || text.includes("hi")) {
      return "Hiya! 🐶 How can I help you today?";
    }
    if (text.includes("help")) {
      return "I can help with reporting lost/found pets, adoption info, and feedback. What do you need?";
    }
    return "Aww, I don't fully understand — try 'lost', 'adopt', or 'help'.";
  };

  const handleChatSend = (e) => {
    e && e.preventDefault();
    const t = chatInput.trim();
    if (!t) return;
    const userMsg = { id: Date.now(), who: "user", text: t };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatSending(true);

    setTimeout(() => {
      const replyText = botReplySimple(t);
      const botMsg = { id: Date.now() + 1, who: "bot", text: replyText };
      setChatMessages((prev) => [...prev, botMsg]);
      setChatSending(false);
      // scroll messages container
      const cont = document.getElementById("robopaws-messages-lifted");
      if (cont) cont.scrollTop = cont.scrollHeight;
    }, 700);
  };

  /* Minimal Robot SVG component */
  function RobotIcon({ className = "w-6 h-6" }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect
          x="3"
          y="7"
          width="18"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="8.5" cy="12" r="1.2" fill="currentColor" />
        <circle cx="15.5" cy="12" r="1.2" fill="currentColor" />
        <rect
          x="9.5"
          y="16"
          width="5"
          height="1.4"
          rx="0.7"
          fill="currentColor"
        />
        <rect
          x="10"
          y="3"
          width="4"
          height="3"
          rx="0.8"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  // Detail Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPetDetails, setSelectedPetDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Notification Detail Modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

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
  // Only for navbar profile image
  const profileImageUrl = user?.profile_picture || null;

  // Pet report form state
  const [petForm, setPetForm] = useState({
    pet_name: "",
    pet_type: "Dog",
    pet_breed: "",
    pet_age: "",
    pet_colour: "",
    pet_weight: "",
    pet_gender: "Male",
    pet_location: "",
    pet_state: "",
    pet_city: "",
    pet_status: "lost",
    description: "",
    is_vaccinated: false,
    is_diseased: false,
    vaccination_details: "",
    vaccination_date: "",
    vaccination_certificate: null,
    health_conditions: "",
    pet_image: null,
  });

  // --- Dashboard Additions ---
  // Load user reports function
  const loadUserReports = async () => {
    try {
      const res = await userAPI.getUserReports();
      setLostReports(res.data.reports || []);
    } catch (err) {
      setError("Failed to load user reports.");
    }
  };
  // Forgot Password Section
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMsg("");
    try {
      const res = await userAPI.forgotPassword(
        forgotEmail,
        forgotPassword,
        forgotConfirm
      );
      setForgotMsg(res.data.message || "Password updated successfully.");
    } catch (err) {
      setForgotMsg(err.response?.data?.error || "Error resetting password.");
    }
  };

  // User Stories Section
  const [stories, setStories] = useState([]);
  const [storyContent, setStoryContent] = useState("");
  const [storyPetId, setStoryPetId] = useState("");
  const [storyMsg, setStoryMsg] = useState("");

  // Post Pet for Adoption Form
  const [postAdoptionForm, setPostAdoptionForm] = useState({
    name: "",
    type: "",
    breed: "",
    age: "",
    gender: "",
    colour: "",
    city: "",
    description: "",
    location: "",
    image: null,
    is_vaccinated: false,
    is_diseased: false,
    disease_description: "",
    vaccination_date: "",
    vaccination_type: "",
    vaccination_certificate: null,
  });

  const loadStories = async () => {
    try {
      const res = await userAPI.getUserStories();
      setStories(res.data.stories || []);
    } catch {}
  };
  useEffect(() => {
    loadStories();
  }, []);

  const handlePostStory = async (e) => {
    e.preventDefault();
    setStoryMsg("");
    try {
      await userAPI.postUserStory(storyContent, storyPetId);
      setStoryMsg("Story posted!");
      setStoryContent("");
      setStoryPetId("");
      loadStories();
    } catch (err) {
      setStoryMsg("Error posting story.");
    }
  };

  // Favourite Pets Section
  const [favourites, setFavourites] = useState([]);
  const [favMsg, setFavMsg] = useState("");
  const [favouriteMap, setFavouriteMap] = useState({}); // pet_id -> favourite object (for fast lookup & optimistic updates)
  const petDetailsCache = useRef({});
  const loadFavourites = async () => {
    try {
      const res = await userAPI.getFavouritePets();
      const favs = res.data.favourites || [];
      // Fetch pet details for each favourite so we can render rich cards
      const detailed = await Promise.all(
        favs.map(async (f) => {
          try {
            const petRes = await petsAPI.getPetDetails(f.pet_id);
            // pet details may be in different keys depending on backend
            const petData =
              petRes.data?.pet_details ||
              petRes.data?.pet ||
              petRes.data ||
              null;
            return { ...f, pet: petData };
          } catch (err) {
            return { ...f, pet: null };
          }
        })
      );
      setFavourites(detailed);
      // build quick lookup map
      const map = {};
      detailed.forEach((f) => {
        map[f.pet_id] = f;
      });
      setFavouriteMap(map);
    } catch (err) {
      console.error("Error loading favourites:", err);
      setFavourites([]);
    }
  };
  useEffect(() => {
    loadFavourites();
  }, []);

  const handleAddFavourite = async (petId) => {
    setFavMsg("");
    // Optimistic UI: mark as saved locally immediately
    try {
      setFavouriteMap((m) => ({
        ...m,
        [petId]: { pet_id: petId, id: `temp-${petId}` },
      }));
      setFavMsg("Added to favourites.");
      const res = await userAPI.addFavouritePet(petId);
      // replace temp id with real id
      const fav = res.data?.favourite || res.data?.result || null;
      if (fav) {
        setFavouriteMap((m) => ({ ...m, [petId]: fav }));
        // reload favourites in background
        loadFavourites();
      } else {
        // fallback: reload
        loadFavourites();
      }
    } catch (err) {
      setFavMsg("Error adding favourite.");
      // revert optimistic
      setFavouriteMap((m) => {
        const copy = { ...m };
        delete copy[petId];
        return copy;
      });
    }
  };

  const handleRemoveFavourite = async (favouriteId) => {
    setFavMsg("");

    // Optimistic UI: Remove from both map and list immediately for instant feedback
    try {
      // Find the pet_id for this favouriteId in map
      const petId =
        Object.keys(favouriteMap).find(
          (k) => favouriteMap[k]?.id === favouriteId
        ) || null;

      // Remove from map immediately
      if (petId) {
        setFavouriteMap((m) => {
          const c = { ...m };
          delete c[petId];
          return c;
        });
      }

      // Remove from favourites array immediately for instant UI update
      setFavourites((prev) => prev.filter((f) => f.id !== favouriteId));

      setFavMsg("Removed from favourites.");
      setTimeout(() => setFavMsg(""), 3000);

      // Make API call in background
      await userAPI.removeFavouritePet(favouriteId);
    } catch (err) {
      setFavMsg("Error removing favourite.");
      setTimeout(() => setFavMsg(""), 3000);
      // Reload on error to restore correct state
      loadFavourites();
    }
  };

  // Helper to find favourite entry by pet id
  const findFavouriteByPetId = (petId) => {
    return favouriteMap[petId] || favourites.find((f) => f.pet_id === petId);
  };

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin");
    }
  }, [user, navigate]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // Run independent loads in parallel to reduce total latency
      await Promise.all([
        loadNotifications(),
        loadAllLostReports(),
        loadAvailableAdoptionPets(),
        loadMyAdoptionPosts(),
        loadMyAdoptionRequests(),
        loadProfile(),
      ]);

      // Load real user reports from backend
      const reportsResponse = await userAPI.getUserReports();

      if (reportsResponse.data.success) {
        const { lost, found } = reportsResponse.data.reports;
        const mappedLostReports = lost.map((report) => ({
          ...report,
          photo:
            report.photo ||
            report.pet_image ||
            getDefaultImage(report.animal_type),
        }));
        const mappedRescueReports = found.map((report) => ({
          ...report,
          photo:
            report.photo ||
            report.pet_image ||
            getDefaultImage(report.animal_type),
        }));
        setLostReports(mappedLostReports);
        setRescueReports(mappedRescueReports);
      } else {
        setLostReports([]);
        setRescueReports([]);
      }
    } catch (err) {
      setError("Failed to load data. Please try again.");
      console.error("Error loading data:", err);

      // Set empty arrays on error
      setLostReports([]);
    }
    setLoading(false);
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

  const loadNotifications = async () => {
    try {
      const response = await userAPI.getUserNotifications();
      if (response.data.success) {
        const notificationData = response.data.notifications || [];
        setNotifications(notificationData);
        // Count unread notifications
        const unread = notificationData.filter(
          (notification) => !notification.is_read
        ).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  // Cached list of unread notifications (used for the bell dropdown)
  const unreadNotifications = notifications.filter((n) => !n.is_read);

  const loadAllLostReports = async () => {
    try {
      console.log("Loading all lost reports...");
      const response = await userAPI.getAllLostReports();
      console.log("All lost reports response:", response.data);

      if (response.data.success) {
        const reports = response.data.reports || [];
        console.log("Found", reports.length, "lost reports");
        setAllLostReports(reports);
      } else {
        console.error("API returned success=false:", response.data);
        setAllLostReports([]);
      }
    } catch (err) {
      console.error("Error loading all lost reports:", err);
      console.error("Error details:", err.response?.data);
      setAllLostReports([]);
    }
  };

  const loadAvailableAdoptionPets = async () => {
    try {
      console.log("Loading available adoption pets...");
      const response = await userAPI.getAvailableAdoptionPets();
      console.log("Available adoption pets response:", response.data);

      if (response.data.success) {
        const pets = response.data.pets || [];
        console.log("Found", pets.length, "available adoption pets");

        // Log each pet's image details for debugging
        pets.forEach((pet, index) => {
          console.log(`Available Pet ${index + 1} - ${pet.name}:`, {
            image: pet.image,
            fullImageUrl: getImageUrl(pet.image),
            type: pet.type,
          });
        });

        setAvailableAdoptionPets(pets);
      } else {
        console.error("API returned success=false:", response.data);
        setAvailableAdoptionPets([]);
      }
    } catch (err) {
      console.error("Error loading adoption pets:", err);
      console.error("Error details:", err.response?.data);
      setAvailableAdoptionPets([]);
    }
  };

  const loadMyAdoptionPosts = async () => {
    try {
      console.log("Loading my adoption posts...");
      const response = await petsAPI.getMyAdoptionPosts();
      console.log("My adoption posts response:", response.data);

      if (response.data.success) {
        const posts = response.data.adoption_posts || [];
        console.log("Found", posts.length, "adoption posts");
        // Log image URLs for debugging
        posts.forEach((post, index) => {
          console.log(`Post ${index + 1} - ${post.name}:`, {
            image: post.image,
            fullImageUrl: getImageUrl(post.image),
            type: post.type,
          });
        });
        setMyAdoptionPosts(posts);
      } else {
        console.error("API returned success=false:", response.data);
        setMyAdoptionPosts([]);
      }
    } catch (err) {
      console.error("Error loading my adoption posts:", err);
      console.error("Error details:", err.response?.data);
      setMyAdoptionPosts([]);
    }
  };

  const loadMyAdoptionRequests = async () => {
    try {
      console.log("Loading my adoption requests...");
      const response = await petsAPI.getMyAdoptionRequests();
      console.log("My adoption requests response:", response.data);

      if (response.data.success) {
        const requests = response.data.adoption_requests || [];
        // Filter out cancelled requests - only show pending, approved, and rejected
        const activeRequests = requests.filter(
          (req) => req.status.toLowerCase() !== "cancelled"
        );
        console.log("Found", activeRequests.length, "active adoption requests");
        setMyAdoptionRequests(activeRequests);
      } else {
        console.error("API returned success=false:", response.data);
        setMyAdoptionRequests([]);
      }
    } catch (err) {
      console.error("Error loading my adoption requests:", err);
      console.error("Error details:", err.response?.data);
      setMyAdoptionRequests([]);
    }
  };

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

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("userTheme", newTheme ? "dark" : "light");
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
        await loadProfile(); // Reload profile data
      } else {
        setError(response.data.error || "Failed to update profile");
      }
    } catch (err) {
      setError(
        "Error updating profile: " + (err.response?.data?.error || err.message)
      );
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

  const handleNotificationDropdownToggle = () => {
    const newShowState = !showNotifications;
    setShowNotifications(newShowState);
    // Close other dropdowns if they're open
    if (newShowState) {
      if (showProfileDropdown) setShowProfileDropdown(false);
      if (dropdownOpen) setDropdownOpen(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    console.log("Notification clicked:", notification);
    try {
      // Mark notification as read
      await userAPI.markNotificationRead(notification.id);
      console.log("Notification marked as read");

      // Update local state
      // Remove this notification from the local list so bell only shows unread messages
      const updatedNotifications = notifications.filter(
        (n) => n.id !== notification.id
      );
      setNotifications(updatedNotifications);

      // Update unread count (should reflect remaining unread notifications)
      const newUnreadCount = updatedNotifications.filter(
        (n) => !n.is_read
      ).length;
      setUnreadCount(newUnreadCount);

      // Show notification details in modal
      setSelectedNotification({ ...notification, is_read: true });
      setShowNotificationModal(true);
      console.log("Opening modal with notification:", {
        ...notification,
        is_read: true,
      });
      setShowNotifications(false); // Close the dropdown
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await userAPI.deleteNotification(notificationId);
      // Remove from local state
      const updatedNotifications = notifications.filter(
        (n) => n.id !== notificationId
      );
      setNotifications(updatedNotifications);
      // Recalculate unread count
      const unread = updatedNotifications.filter(
        (notification) => !notification.is_read
      ).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleDeleteReport = async (reportId) => {
    // Immediate optimistic deletion (no native confirm) so the UI is responsive.
    try {
      // Optimistic: remove locally first
      setLostReports((prev) => prev.filter((r) => r.id !== reportId));
      setRescueReports((prev) => prev.filter((r) => r.id !== reportId));
      setSuccessMessage("Report deleted successfully!");
      // call server
      const res = await userAPI.deleteReport(reportId);
      console.debug("deleteReport response:", res?.data || res);
      // Refresh only the sections impacted by a report deletion to avoid reloading everything
      // (lost reports and the user's adoption posts)
      // Attempt targeted reloads but avoid failing the whole operation.
      await Promise.all([
        loadAllLostReports().catch((e) => {
          console.error("loadAllLostReports failed (non-fatal):", e);
        }),
        loadMyAdoptionPosts().catch((e) => {
          console.error("loadMyAdoptionPosts failed (non-fatal):", e);
        }),
      ]);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleReuniteReport = async (reportId) => {
    // Optimistic UX: remove the report immediately from user lists and global list
    // so the item disappears instantly from the UI while the backend call runs.
    // No native confirm to keep the interaction fast.
    try {
      setLostReports((prev) => prev.filter((r) => r.id !== reportId));
      setRescueReports((prev) => prev.filter((r) => r.id !== reportId));
      // Also remove from the global allLostReports so it's gone in shared lists
      // if you show that on the same page
      setAllLostReports((prev) => prev.filter((r) => r.id !== reportId));
      // server update (backend expects uppercase status)
      const res = await userAPI.updateReportStatus(reportId, "REUNITED");
      console.debug("updateReportStatus response:", res?.data || res);
      // show success after server confirms
      setSuccessMessage("Pet marked as reunited! 🎉");
      // Refresh only the relevant sections instead of whole dashboard
      // Attempt targeted reloads but avoid failing the whole operation.
      await Promise.all([
        loadAllLostReports().catch((e) => {
          console.error("loadAllLostReports failed (non-fatal):", e);
        }),
        loadMyAdoptionPosts().catch((e) => {
          console.error("loadMyAdoptionPosts failed (non-fatal):", e);
        }),
      ]);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error reuniting report:", err);
      setError("Failed to update report. Please try again.");
      // rollback by reloading full data
      loadData();
      setTimeout(() => setError(""), 3000);
    }
  };

  // Fetch full pet details for modal
  const fetchPetDetails = async (petId) => {
    if (!petId) return;

    // Open modal immediately for instant feedback
    setShowDetailModal(true);
    setDetailLoading(true);

    try {
      // Check cache first
      const cache = petDetailsCache.current[petId];
      if (cache) {
        setSelectedPetDetails(cache);
        setDetailLoading(false);
        return;
      }

      // Fetch from API
      const response = await petsAPI.getPetDetails(petId);
      const details =
        response.data?.pet_details ||
        response.data?.pet ||
        response.data ||
        null;

      if (details) {
        petDetailsCache.current[petId] = details;
        setSelectedPetDetails(details);
      } else {
        setError("Failed to load pet details.");
        setTimeout(() => setError(""), 3000);
        setShowDetailModal(false); // Close modal on error
      }
    } catch (err) {
      console.error("Error fetching pet details:", err);
      setError(`Failed to load pet details: ${err.message || "Unknown error"}`);
      setTimeout(() => setError(""), 5000);
      setShowDetailModal(false); // Close modal on error
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPetDetails(null);
  };

  const handleMarkReport = async (reportId, status) => {
    try {
      await userAPI.updateReportStatus(reportId, status);
      // Reload reports data
      await loadUserReports();
      setSuccessMessage(`Report marked as ${status.toLowerCase()}!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error updating report status:", err);
      setError("Failed to update report status. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPetForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmitPetReport = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Create FormData for file upload
      const formData = new FormData();

      // Add all form fields
      Object.keys(petForm).forEach((key) => {
        if (key === "pet_image" && petForm[key]) {
          formData.append("pet_image", petForm[key]);
        } else if (key !== "pet_image") {
          formData.append(key, petForm[key]);
        }
      });

      console.log("Calling submitPetRequestWithImage with FormData:", formData);
      const response = await petsAPI.submitPetRequestWithImage(formData);
      if (response.data.success) {
        setSuccessMessage(
          `${
            petForm.pet_status.charAt(0).toUpperCase() +
            petForm.pet_status.slice(1)
          } pet report submitted successfully!`
        );
        // Hide success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
        // Reset form
        setPetForm({
          pet_name: "",
          pet_type: "Dog",
          pet_breed: "",
          pet_age: "",
          pet_colour: "",
          pet_weight: "",
          pet_gender: "Male",
          pet_location: "",
          pet_state: "",
          pet_city: "",
          pet_status: "lost",
          description: "",
          is_vaccinated: false,
          is_diseased: false,
          vaccination_details: "",
          vaccination_date: "",
          vaccination_certificate: null,
          health_conditions: "",
          pet_image: null,
        });
        // Reload data to show updated reports
        await loadData();
        // Switch back to dashboard tab immediately
        setActiveTab("dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to submit pet report. Please try again."
      );
    }
    setSubmitLoading(false);
  };

  const handlePostPetForAdoption = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("name", postAdoptionForm.name);
      formData.append("type", postAdoptionForm.type);
      formData.append("breed", postAdoptionForm.breed);
      formData.append("age", postAdoptionForm.age);
      formData.append("gender", postAdoptionForm.gender);
      formData.append("colour", postAdoptionForm.colour);
      formData.append("city", postAdoptionForm.city);
      formData.append("description", postAdoptionForm.description);
      formData.append("location", postAdoptionForm.location);
      formData.append("is_vaccinated", postAdoptionForm.is_vaccinated);
      formData.append("is_diseased", postAdoptionForm.is_diseased);

      if (postAdoptionForm.is_diseased) {
        formData.append(
          "disease_description",
          postAdoptionForm.disease_description
        );
      }

      if (postAdoptionForm.is_vaccinated) {
        formData.append("vaccination_date", postAdoptionForm.vaccination_date);
        formData.append("vaccination_type", postAdoptionForm.vaccination_type);
        if (postAdoptionForm.vaccination_certificate) {
          formData.append(
            "vaccination_certificate",
            postAdoptionForm.vaccination_certificate
          );
        }
      }

      if (postAdoptionForm.image) {
        console.log("📸 Adding image to FormData:", {
          name: postAdoptionForm.image.name,
          size: postAdoptionForm.image.size,
          type: postAdoptionForm.image.type,
        });
        formData.append("image", postAdoptionForm.image);
      } else {
        console.warn(
          "⚠️ No image to upload - postAdoptionForm.image is:",
          postAdoptionForm.image
        );
      }

      console.log("📤 Sending FormData to backend...");
      const response = await petsAPI.postPetForAdoption(formData);

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        // Reset form
        setPostAdoptionForm({
          name: "",
          type: "",
          breed: "",
          age: "",
          gender: "",
          colour: "",
          city: "",
          description: "",
          location: "",
          image: null,
          is_vaccinated: false,
          is_diseased: false,
          disease_description: "",
          vaccination_date: "",
          vaccination_type: "",
          vaccination_certificate: null,
        });
        // Reload data
        await loadData();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to post pet for adoption. Please try again."
      );
    }
    setSubmitLoading(false);
  };

  const renderReportCard = (report) => (
    <div key={report.id} className="dashboard-pet-card">
      <div className="pet-card-image">
        <img
          src={report.photo}
          alt={report.pet_name}
          onError={(e) => {
            e.target.src = getDefaultImage(report.animal_type);
          }}
        />
        <div className="pet-name-overlay">
          <h3>{report.pet_name}</h3>
        </div>
      </div>
      <div className="pet-card-info">
        <div className="pet-type">{report.animal_type}</div>
        <div className="pet-details">
          {report.pet_breed && (
            <span className="pet-breed">{report.pet_breed}</span>
          )}
          {report.pet_location && (
            <span className="pet-location">📍 {report.pet_location}</span>
          )}
        </div>
        <div className="pet-description">
          {report.description
            ? report.description.length > 50
              ? `${report.description.substring(0, 50)}...`
              : report.description
            : "No description available"}
        </div>
        <div className="report-meta">
          <span className="report-date">
            {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className={`pet-status-badge ${report.status.toLowerCase()}`}>
          {report.status}
        </div>
        <div className="report-actions">
          {report.status !== "FOUND" && report.status !== "REUNITED" && (
            <div className="mark-buttons">
              {report.report_type === "LOST" && report.status !== "FOUND" && (
                <button
                  className="btn-mark-found"
                  onClick={() => handleMarkReport(report.id, "FOUND")}
                  title="Mark as Found"
                >
                  <span className="material-icons">check_circle</span>
                  Found
                </button>
              )}
              {report.status !== "REUNITED" && (
                <button
                  className="btn-mark-reunited"
                  onClick={() => handleMarkReport(report.id, "REUNITED")}
                  title="Mark as Reunited"
                >
                  <span className="material-icons">favorite</span>
                  Reunited
                </button>
              )}
            </div>
          )}
          <button
            className="btn-delete-report"
            onClick={() => handleDeleteReport(report.id)}
            title="Delete Report"
          >
            <span className="material-icons">delete</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPublicReportCard = (report) => (
    <div key={report.id} className="dashboard-pet-card public-report">
      <div className="pet-card-image">
        <img
          src={report.photo}
          alt={report.pet_name}
          onError={(e) => {
            e.target.src = getDefaultImage(report.animal_type);
          }}
        />
        <div className="pet-name-overlay">
          <h3>{report.pet_name}</h3>
        </div>
      </div>
      <div className="pet-card-info">
        <div className="pet-type">{report.animal_type}</div>
        <div className="pet-details">
          {report.pet_breed && (
            <span className="pet-breed">{report.pet_breed}</span>
          )}
          {report.pet_location && (
            <span className="pet-location">📍 {report.pet_location}</span>
          )}
        </div>
        <div className="pet-description">
          {report.description
            ? report.description.length > 80
              ? `${report.description.substring(0, 80)}...`
              : report.description
            : "No description available"}
        </div>
        <div className="report-meta">
          <span className="report-date">
            {new Date(report.created_at).toLocaleDateString()}
          </span>
          <span className="report-owner">
            By: {report.owner_username || "Anonymous"}
          </span>
        </div>
        <div className={`pet-status-badge ${report.status.toLowerCase()}`}>
          {report.status}
        </div>
        <div className="contact-info">
          {report.contact_info && (
            <div className="contact-details">
              <span className="material-icons">contact_phone</span>
              <span className="contact-text">Contact owner for details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div
        className={`transition-colors duration-300 ${
          isDarkMode
            ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800"
            : "bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50"
        }`}
      >
        <header
          className={`sticky top-0 z-50 backdrop-blur-sm shadow-lg border-b transition-colors duration-300 ${
            isDarkMode
              ? "bg-gradient-to-r from-slate-900/95 to-blue-900/95 border-blue-700"
              : "bg-gradient-to-r from-purple-300 to-purple-700 border-purple-400"
          }`}
        >
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">
                  <span className="text-white">pet</span>
                  <span className="text-purple-700">rescue</span>
                </div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-lg font-semibold text-white">
                  WELCOME: {user?.username?.toUpperCase() || "USER_NAME"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className="p-2 rounded-full hover:bg-purple-700 transition-all duration-300 disabled:opacity-50"
                  onClick={loadData}
                  disabled={loading}
                  title="Refresh Data"
                >
                  <span className="material-icons text-white">refresh</span>
                </button>

                {/* Theme Toggle Button */}
                <button
                  className="p-2 rounded-full hover:bg-purple-700 transition-all duration-300"
                  onClick={toggleTheme}
                  title={
                    isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                  }
                >
                  <span className="material-icons text-white">
                    {isDarkMode ? "light_mode" : "dark_mode"}
                  </span>
                </button>
                {/* Favorites Button (NEW) */}
                <button
                  className="p-2 rounded-full hover:bg-purple-700 transition-all duration-300"
                  onClick={() => setActiveTab("favorite-pets")} // Assuming this function exists
                  title="Favorite Pets"
                >
                  <span className="material-icons text-white">favorite</span>
                </button>
                <div className="relative" ref={notificationRef}>
                  <button
                    className="p-2 rounded-full hover:bg-purple-700 transition-all duration-300 relative"
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
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-400">
                            <span className="material-icons text-6xl mb-2">
                              notifications_none
                            </span>
                            <p className="text-sm">No notifications yet</p>
                          </div>
                        ) : (
                          unreadNotifications.map((notification, index) => (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-blue-100 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors cursor-pointer ${
                                notification.is_read
                                  ? "bg-slate-50 dark:bg-slate-700"
                                  : "bg-blue-50/50 dark:bg-blue-900/40"
                              }`}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h4
                                    className={`text-sm font-semibold ${
                                      notification.is_read
                                        ? "text-gray-700 dark:text-slate-200"
                                        : "text-primary-blue dark:text-blue-300 font-bold"
                                    }`}
                                  >
                                    {notification.title}
                                  </h4>
                                  <p
                                    className={`text-sm mt-1 ${
                                      notification.is_read
                                        ? "text-gray-600 dark:text-slate-300"
                                        : "text-gray-800 dark:text-white font-semibold"
                                    }`}
                                  >
                                    {notification.message}
                                  </p>
                                  <span className="text-xs text-gray-500 dark:text-slate-400 mt-2 block">
                                    {new Date(
                                      notification.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <button
                                  className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotification(notification.id);
                                  }}
                                >
                                  <span className="material-icons text-red-500 text-lg">
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
                <div className="relative" ref={profileRef}>
                  <button
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-teal text-white font-bold text-lg flex items-center justify-center hover:shadow-lg transition-all duration-300 hover:scale-110"
                    onClick={() => {
                      const newProfileState = !showProfileDropdown;
                      setShowProfileDropdown(newProfileState);
                      // Close other dropdowns if they're open
                      if (newProfileState) {
                        if (showNotifications) setShowNotifications(false);
                        if (dropdownOpen) setDropdownOpen(false);
                      }
                    }}
                  >
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </button>
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-xl border border-blue-200 dark:border-slate-600 overflow-hidden z-50">
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-white hover:text-primary-blue dark:hover:text-accent-yellow font-medium"
                        onClick={() => {
                          setActiveTab("profile");
                          setShowProfileDropdown(false);
                        }}
                      >
                        Edit Profile
                      </button>

                      <button
                        className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium border-t border-gray-100 dark:border-slate-600"
                        onClick={() => {
                          // Clear token from localStorage
                          localStorage.removeItem("token");

                          // Optionally clear other user-related data
                          // localStorage.removeItem('user');

                          // Redirect to login page
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
          {/* Horizontal Navigation Bar */}
          <nav
            className={`bg-gradient-to-r from-primary-blue via-primary-teal to-primary-teal border-t transition-colors duration-300 ${
              isDarkMode ? "border-blue-700" : "border-blue-200"
            }`}
          >
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
              <li className="relative" ref={petActionsRef}>
                <div
                  className="flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + 4,
                      left: rect.left,
                    });
                    const newDropdownState = !dropdownOpen;
                    setDropdownOpen(newDropdownState);

                    // Close other dropdowns if opening this one
                    if (newDropdownState) {
                      if (showNotifications) setShowNotifications(false);
                      if (showProfileDropdown) setShowProfileDropdown(false);
                    }
                  }}
                >
                  <span className="material-icons text-lg">pets</span>
                  <span className="font-semibold text-xs">PET ACTIONS</span>
                  <span
                    className={`material-icons text-sm transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </div>
              </li>
              {dropdownOpen &&
                createPortal(
                  <ul
                    className="fixed bg-gradient-to-br from-teal-700 to-cyan-800 text-white rounded-md shadow-xl z-[9999] w-56 border border-white/10"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("UL CLICKED - Target:", e.target.textContent);
                    }}
                  >
                    <li
                      className="px-4 py-2 hover:bg-teal-600 hover:text-white cursor-pointer transition-colors duration-200"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("=== REPORT LOST MOUSE DOWN ===");
                        alert("Report Lost clicked!");
                        setActiveTab("report-lost");
                        setTimeout(() => setDropdownOpen(false), 100);
                      }}
                    >
                      🐾 Report Lost
                    </li>
                    <li
                      className="px-4 py-2 hover:bg-teal-600 hover:text-white cursor-pointer transition-colors duration-200"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("=== REPORT FOUND MOUSE DOWN ===");
                        alert("Report Found clicked!");
                        setActiveTab("report-found");
                        setTimeout(() => setDropdownOpen(false), 100);
                      }}
                    >
                      👀 Report Found
                    </li>
                    <li
                      className="px-4 py-2 hover:bg-teal-600 hover:text-white cursor-pointer transition-colors duration-200"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("=== POST PET FOR ADOPTION MOUSE DOWN ===");
                        alert("Post Pet for Adoption clicked!");
                        setActiveTab("post-pet-adoption");
                        setTimeout(() => setDropdownOpen(false), 100);
                      }}
                    >
                      📢 Post Pet for Adoption
                    </li>
                  </ul>,
                  document.body
                )}
              <li
                className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                  activeTab === "all-lost"
                    ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setActiveTab("all-lost")}
              >
                <span className="material-icons text-lg">pets</span>
                <span className="font-semibold text-xs">ALL LOST</span>
              </li>
              <li
                className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                  activeTab === "explore-adoption"
                    ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setActiveTab("explore-adoption")}
              >
                <span className="material-icons text-lg">favorite</span>
                <span className="font-semibold text-xs">READY TO ADOPT</span>
              </li>
              {/* Removed MY REQUESTS tab as it's now in the dashboard */}
              <li
                className={`flex items-center gap-2 px-4 py-4 cursor-pointer transition-all duration-300 whitespace-nowrap ${
                  activeTab === "feedbacks"
                    ? "bg-white/20 border-b-4 border-accent-yellow text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setActiveTab("feedbacks")}
              >
                <span className="material-icons text-lg">forum</span>
                <span className="font-semibold text-xs">FEEDBACKS</span>
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

        <div
          className="overflow-y-auto"
          style={{ height: "calc(100vh - 180px)" }}
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
            {/* Debug Active Tab Display */}
            <div className="fixed top-20 right-4 z-[10000] bg-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
              Active Tab: {activeTab}
            </div>

            <main>
              {activeTab === "dashboard" &&
                (loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-blue mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-slate-200 font-medium">
                        Loading...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Section 1: LOST REPORTS */}
                    <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === "lostReports"
                              ? null
                              : "lostReports"
                          )
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-icons text-primary-blue text-3xl">
                            list
                          </span>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            LOST REPORTS ({lostReports.length})
                          </h2>
                        </div>
                        <span
                          className={`material-icons text-3xl text-primary-blue transition-transform ${
                            expandedSection === "lostReports"
                              ? "rotate-180"
                              : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </button>

                      {expandedSection === "lostReports" && (
                        <div className="p-4 pt-0">
                          <div className="flex flex-wrap justify-center gap-2">
                            {lostReports.length > 0 ? (
                              lostReports.map((report) => (
                                <div
                                  key={report.id}
                                  className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                                >
                                  <div className="relative h-40 overflow-hidden">
                                    {/* Card image and favorite toggle remain unchanged for consistency */}
                                    <img
                                      src={getImageUrl(report.photo)}
                                      alt={report.pet_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = getDefaultImage(
                                          report.animal_type
                                        );
                                      }}
                                    />
                                    {/* Favourite toggle (top-right) for reports if pet id exists */}
                                    {report.pet_id && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const fav = findFavouriteByPetId(
                                            report.pet_id
                                          );
                                          if (fav)
                                            await handleRemoveFavourite(fav.id);
                                          else
                                            await handleAddFavourite(
                                              report.pet_id
                                            );
                                        }}
                                        title={
                                          findFavouriteByPetId(report.pet_id)
                                            ? "Remove favourite"
                                            : "Add to favourites"
                                        }
                                        aria-pressed={
                                          !!findFavouriteByPetId(report.pet_id)
                                        }
                                        className={`absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full shadow-md transition-colors ${
                                          findFavouriteByPetId(report.pet_id)
                                            ? "bg-pink-500 text-white"
                                            : "bg-white text-gray-800 dark:bg-slate-700 dark:text-white"
                                        }`}
                                      >
                                        <span className="material-icons">
                                          favorite
                                        </span>
                                      </button>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                      {/* Card name overlay remains unchanged */}
                                      <h3 className="text-white font-bold text-lg">
                                        {report.pet_name}
                                      </h3>
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-2 flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between">
                                      <div className="inline-block px-3 py-1 bg-blue-100 text-primary-blue rounded-full text-sm font-semibold">
                                        {report.animal_type}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-slate-300 ml-3">
                                        {new Date(
                                          report.created_at
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {report.pet_breed && (
                                        <span className="block text-gray-700 dark:text-white text-sm">
                                          {/* Breed, location, etc. remain unchanged for consistency */}
                                          <span className="font-semibold">
                                            Breed:
                                          </span>{" "}
                                          {report.pet_breed}
                                        </span>
                                      )}
                                      {report.pet_location && (
                                        <span className="flex items-center gap-1 text-gray-700 dark:text-white text-sm">
                                          <span className="material-icons text-xs">
                                            location_on
                                          </span>
                                          {report.pet_location}
                                        </span>
                                      )}
                                    </div>
                                    {/* description hidden in card; use View Details to read full description */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                      <div />
                                    </div>
                                    <div
                                      className={`px-3 py-2 rounded-lg text-center font-semibold text-sm ${
                                        report.status.toLowerCase() ===
                                          "approved" ||
                                        report.status.toLowerCase() ===
                                          "accepted"
                                          ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                          : report.status.toLowerCase() ===
                                            "pending"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100"
                                          : report.status.toLowerCase() ===
                                            "reunited"
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100"
                                          : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                                      }`}
                                    >
                                      <strong>
                                        {report.status.toUpperCase()}
                                      </strong>
                                    </div>

                                    {/* Bottom controls: icons only (View, Reunite, Delete) - unified style */}
                                    <div className="flex items-center justify-between mt-3">
                                      <div />
                                      <div className="flex items-center gap-2">
                                        <button
                                          title="View details"
                                          aria-label="View details"
                                          onClick={() => {
                                            if (report.pet_id)
                                              fetchPetDetails(report.pet_id);
                                          }}
                                          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                        >
                                          <span className="material-icons text-sm">
                                            visibility
                                          </span>
                                        </button>

                                        {(report.status.toLowerCase() ===
                                          "accepted" ||
                                          report.status.toLowerCase() ===
                                            "approved") &&
                                          report.status.toLowerCase() !==
                                            "reunited" && (
                                            <button
                                              title="Reunite"
                                              aria-label="Reunite"
                                              onClick={() =>
                                                handleReuniteReport(report.id)
                                              }
                                              className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 text-white shadow-md hover:opacity-95"
                                            >
                                              <span className="material-icons text-sm">
                                                celebration
                                              </span>
                                            </button>
                                          )}

                                        <button
                                          title="Delete"
                                          aria-label="Delete"
                                          onClick={() =>
                                            handleDeleteReport(report.id)
                                          }
                                          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:opacity-95"
                                        >
                                          <span className="material-icons text-sm">
                                            delete
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full text-center py-12">
                                <span className="material-icons text-6xl text-gray-300 mb-4">
                                  pets
                                </span>
                                <p className="text-gray-500 text-lg">
                                  No lost pet reports yet
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 2: RESCUE PET */}
                    <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === "rescueReports"
                              ? null
                              : "rescueReports"
                          )
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-icons text-primary-teal text-3xl">
                            search
                          </span>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            RESCUE PET ({rescueReports.length})
                          </h2>
                        </div>
                        <span
                          className={`material-icons text-3xl text-primary-teal transition-transform ${
                            expandedSection === "rescueReports"
                              ? "rotate-180"
                              : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </button>

                      {expandedSection === "rescueReports" && (
                        <div className="p-4 pt-0">
                          <div className="flex flex-wrap justify-center gap-2">
                            {rescueReports.length > 0 ? (
                              rescueReports.map((report) => (
                                <div
                                  key={report.id}
                                  className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                                >
                                  <div className="relative h-40 overflow-hidden">
                                    <img
                                      src={getImageUrl(report.photo)}
                                      alt={report.pet_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = getDefaultImage(
                                          report.animal_type
                                        );
                                      }}
                                    />
                                    {/* Favourite toggle (top-right) for reports if pet id exists */}
                                    {report.pet_id && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const fav = findFavouriteByPetId(
                                            report.pet_id
                                          );
                                          if (fav)
                                            await handleRemoveFavourite(fav.id);
                                          else
                                            await handleAddFavourite(
                                              report.pet_id
                                            );
                                        }}
                                        title={
                                          findFavouriteByPetId(report.pet_id)
                                            ? "Remove favourite"
                                            : "Add to favourites"
                                        }
                                        aria-pressed={
                                          !!findFavouriteByPetId(report.pet_id)
                                        }
                                        className={`absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full shadow-md transition-colors ${
                                          findFavouriteByPetId(report.pet_id)
                                            ? "bg-pink-500 text-white"
                                            : "bg-white text-gray-800 dark:bg-slate-700 dark:text-white"
                                        }`}
                                      >
                                        <span className="material-icons">
                                          favorite
                                        </span>
                                      </button>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                      <h3 className="text-white font-bold text-lg">
                                        {report.pet_name}
                                      </h3>
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-2 flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between">
                                      <div className="inline-block px-3 py-1 bg-teal-100 text-primary-teal rounded-full text-sm font-semibold">
                                        {report.animal_type}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-slate-300 ml-3">
                                        {new Date(
                                          report.created_at
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {report.pet_breed && (
                                        <span className="block text-gray-700 dark:text-white text-sm">
                                          <span className="font-semibold">
                                            Breed:
                                          </span>{" "}
                                          {report.pet_breed}
                                        </span>
                                      )}
                                      {report.pet_location && (
                                        <span className="flex items-center gap-1 text-gray-700 dark:text-white text-sm">
                                          <span className="material-icons text-xs">
                                            location_on
                                          </span>
                                          {report.pet_location}
                                        </span>
                                      )}
                                    </div>
                                    {/* description hidden in card; use View Details to read full description */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                      <div />
                                    </div>
                                    <div
                                      className={`px-3 py-2 rounded-lg text-center font-semibold text-sm ${
                                        report.status.toLowerCase() ===
                                          "approved" ||
                                        report.status.toLowerCase() ===
                                          "accepted"
                                          ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                          : report.status.toLowerCase() ===
                                            "pending"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100"
                                          : report.status.toLowerCase() ===
                                            "reunited"
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100"
                                          : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                                      }`}
                                    >
                                      Status:{" "}
                                      <strong>
                                        {report.status.toUpperCase()}
                                      </strong>
                                    </div>

                                    {/* Bottom controls: icons only (View, Reunite, Delete) */}
                                    <div className="flex items-center justify-between mt-3">
                                      <div />
                                      <div className="flex items-center gap-2">
                                        <button
                                          title="View details"
                                          aria-label="View details"
                                          onClick={() => {
                                            if (report.pet_id)
                                              fetchPetDetails(report.pet_id);
                                          }}
                                          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                        >
                                          <span className="material-icons text-sm">
                                            visibility
                                          </span>
                                        </button>

                                        {(report.status.toLowerCase() ===
                                          "accepted" ||
                                          report.status.toLowerCase() ===
                                            "approved") &&
                                          report.status.toLowerCase() !==
                                            "reunited" && (
                                            <button
                                              title="Reunite"
                                              aria-label="Reunite"
                                              onClick={() =>
                                                handleReuniteReport(report.id)
                                              }
                                              className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 text-white shadow-md hover:opacity-95"
                                            >
                                              <span className="material-icons text-sm">
                                                celebration
                                              </span>
                                            </button>
                                          )}

                                        <button
                                          title="Delete"
                                          aria-label="Delete"
                                          onClick={() =>
                                            handleDeleteReport(report.id)
                                          }
                                          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:opacity-95"
                                        >
                                          <span className="material-icons text-sm">
                                            delete
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full text-center py-12">
                                <span className="material-icons text-6xl text-gray-300 mb-4">
                                  search
                                </span>
                                <p className="text-gray-500 text-lg">
                                  No rescue pet reports yet
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 3: MY ADOPTION POSTS */}
                    <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === "adoptionPosts"
                              ? null
                              : "adoptionPosts"
                          )
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-icons text-accent-yellow text-3xl">
                            volunteer_activism
                          </span>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            ADOPTION POSTS ({myAdoptionPosts.length})
                          </h2>
                        </div>
                        <span
                          className={`material-icons text-3xl text-accent-yellow transition-transform ${
                            expandedSection === "adoptionPosts"
                              ? "rotate-180"
                              : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </button>

                      {expandedSection === "adoptionPosts" && (
                        <div className="p-4 pt-0">
                          <div className="flex flex-wrap justify-center gap-2">
                            {myAdoptionPosts.length > 0 ? (
                              myAdoptionPosts.map((post) => (
                                <div
                                  key={post.id}
                                  className="w-80 min-h-[440px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                                >
                                  <div className="relative h-40 overflow-hidden">
                                    <img
                                      src={getImageUrl(post.image)}
                                      alt={post.name}
                                      className="w-full h-full object-cover"
                                      onLoad={(e) => {
                                        console.log(
                                          `✅ Image loaded successfully for ${post.name}:`,
                                          e.target.src
                                        );
                                      }}
                                      onError={(e) => {
                                        console.error(
                                          `❌ Image failed to load for ${post.name}:`,
                                          {
                                            attempted: e.target.src,
                                            originalPath: post.image,
                                            fallback: getDefaultImage(
                                              post.type
                                            ),
                                          }
                                        );
                                        e.target.src = getDefaultImage(
                                          post.type
                                        );
                                      }}
                                    />
                                    {/* Favourite toggle (top-right) for user's adoption posts */}
                                    {post.id && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const fav = findFavouriteByPetId(
                                            post.id
                                          );
                                          if (fav)
                                            await handleRemoveFavourite(fav.id);
                                          else
                                            await handleAddFavourite(post.id);
                                        }}
                                        title={
                                          findFavouriteByPetId(post.id)
                                            ? "Remove favourite"
                                            : "Add to favourites"
                                        }
                                        aria-pressed={
                                          !!findFavouriteByPetId(post.id)
                                        }
                                        className={`absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full shadow-md transition-colors ${
                                          findFavouriteByPetId(post.id)
                                            ? "bg-pink-500 text-white"
                                            : "bg-white text-gray-800 dark:bg-slate-700 dark:text-white"
                                        }`}
                                      >
                                        <span className="material-icons">
                                          favorite
                                        </span>
                                      </button>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                      <h3 className="text-white font-bold text-lg">
                                        {post.name}
                                      </h3>
                                    </div>
                                  </div>
                                  <div className="p-4 flex-1 space-y-2 flex flex-col overflow-auto">
                                    <div className="flex items-start justify-between">
                                      <div className="inline-block px-3 py-1 bg-yellow-100 text-accent-yellow rounded-full text-sm font-semibold">
                                        {post.type}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-slate-300">
                                        {new Date(
                                          post.created_at
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {post.breed && (
                                        <span className="block text-gray-700 dark:text-white text-sm">
                                          <span className="font-semibold">
                                            Breed:
                                          </span>{" "}
                                          {post.breed}
                                        </span>
                                      )}
                                      <span className="block text-gray-700 dark:text-white text-sm">
                                        <span className="font-semibold">
                                          Age:
                                        </span>{" "}
                                        🎂 {post.age} years
                                      </span>
                                      <span className="block text-gray-700 dark:text-white text-sm">
                                        <span className="font-semibold">
                                          Gender:
                                        </span>{" "}
                                        {post.gender === "Male" ? "♂️" : "♀️"}{" "}
                                        {post.gender}
                                      </span>
                                      {post.location && (
                                        <span className="flex items-center gap-1 text-gray-700 dark:text-white text-sm">
                                          <span className="material-icons text-xs">
                                            location_on
                                          </span>
                                          {post.location}
                                        </span>
                                      )}
                                    </div>
                                    {/* description hidden in card; use View Details to read full description */}
                                    <div className="flex flex-wrap gap-2">
                                      {post.is_vaccinated && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100 rounded-full text-xs font-semibold">
                                          ✓ Vaccinated
                                        </span>
                                      )}
                                      {post.is_diseased && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                          ⚠ Health Condition
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className={`px-3 py-2 rounded-lg text-center font-semibold text-sm ${
                                        post.report_status === "accepted"
                                          ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                          : post.report_status === "pending"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100"
                                          : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                                      }`}
                                    >
                                      {post.report_status === "pending" &&
                                        "⏳ PENDING REVIEW"}
                                      {post.report_status === "accepted" &&
                                        "✅ APPROVED"}
                                      {post.report_status === "rejected" &&
                                        "❌ REJECTED"}
                                    </div>
                                    {post.admin_comment && (
                                      <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                        <strong className="text-gray-700 dark:text-white">
                                          Admin:
                                        </strong>
                                        <p className="text-gray-600 dark:text-white mt-1">
                                          {post.admin_comment}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-end gap-2 mt-3">
                                      <button
                                        title="View details"
                                        aria-label="View details"
                                        onClick={() => {
                                          if (post.pet_id) {
                                            fetchPetDetails(post.pet_id);
                                          } else {
                                            setError(
                                              "Pet details unavailable for this adoption post."
                                            );
                                            setTimeout(
                                              () => setError(""),
                                              3000
                                            );
                                          }
                                        }}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                      >
                                        <span className="material-icons text-sm">
                                          visibility
                                        </span>
                                      </button>

                                      {post.report_status === "accepted" && (
                                        <button
                                          title="Reunite"
                                          aria-label="Reunite"
                                          onClick={() =>
                                            handleReuniteReport(post.id)
                                          }
                                          className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 text-white shadow-md hover:opacity-95"
                                        >
                                          <span className="material-icons text-sm">
                                            celebration
                                          </span>
                                        </button>
                                      )}

                                      <button
                                        title="Delete"
                                        aria-label="Delete"
                                        onClick={() =>
                                          handleDeleteReport(post.id)
                                        }
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:opacity-95"
                                      >
                                        <span className="material-icons text-sm">
                                          delete
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full text-center py-12">
                                <span className="material-icons text-6xl text-gray-300 mb-4">
                                  volunteer_activism
                                </span>
                                <p className="text-gray-500 text-lg">
                                  You haven't posted any pets for adoption yet
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 4: MY ADOPTION REQUESTS */}
                    <div className="bg-gradient-to-br from-purple-200/70 to-purple-250/60 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === "adoptionRequests"
                              ? null
                              : "adoptionRequests"
                          )
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-icons text-accent-yellow text-3xl">
                            pets
                          </span>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            ADOPTION REQUESTS ({myAdoptionRequests.length})
                          </h2>
                        </div>
                        <span
                          className={`material-icons text-3xl text-accent-yellow transition-transform ${
                            expandedSection === "adoptionRequests"
                              ? "rotate-180"
                              : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </button>

                      {expandedSection === "adoptionRequests" && (
                        <div className="p-4 pt-0">
                          <div className="flex flex-wrap justify-center gap-2">
                            {myAdoptionRequests.length > 0 ? (
                              myAdoptionRequests.map((request) => (
                                <div
                                  key={request.id}
                                  className="w-80 h-[420px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                                >
                                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                                    <img
                                      src={getImageUrl(request.pet?.image)}
                                      alt={request.pet?.name || "Pet"}
                                      onError={(e) => {
                                        e.target.src = "/default-pet.png";
                                      }}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                      <h3 className="text-white text-xl font-bold">
                                        {request.pet?.name || "Unknown Pet"}
                                      </h3>
                                    </div>
                                  </div>
                                  <div className="p-5 flex-1 space-y-3 overflow-hidden">
                                    <div className="flex items-start justify-between">
                                      <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-400 text-white text-sm font-semibold rounded-full">
                                        {request.pet?.type || "Pet"}
                                      </div>
                                      <div
                                        className={`text-sm px-2 py-1 rounded-full ${
                                          request.status === "approved"
                                            ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                            : request.status === "rejected"
                                            ? "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100"
                                        }`}
                                      >
                                        {request.status === "approved"
                                          ? "✓ Approved"
                                          : request.status === "rejected"
                                          ? "✗ Rejected"
                                          : "⌛ Pending"}
                                      </div>
                                    </div>

                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                      Requested on:{" "}
                                      {new Date(
                                        request.created_at
                                      ).toLocaleDateString()}
                                    </div>

                                    <div className="space-y-2 mt-2">
                                      <span className="block text-gray-700 dark:text-white text-sm">
                                        <span className="font-semibold">
                                          Breed:
                                        </span>{" "}
                                        {request.pet?.breed || "Unknown"}
                                      </span>
                                      {request.pet?.age && (
                                        <span className="block text-gray-700 dark:text-white text-sm">
                                          <span className="font-semibold">
                                            Age:
                                          </span>{" "}
                                          🎂 {request.pet?.age} years
                                        </span>
                                      )}
                                      {request.pet?.gender && (
                                        <span className="block text-gray-700 dark:text-white text-sm">
                                          <span className="font-semibold">
                                            Gender:
                                          </span>{" "}
                                          {request.pet?.gender === "Male"
                                            ? "♂️"
                                            : "♀️"}{" "}
                                          {request.pet?.gender}
                                        </span>
                                      )}
                                    </div>

                                    <div className="pt-2"></div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-end gap-4 mt-2">
                                      {request.pet?.id && (
                                        <button
                                          onClick={() => {
                                            fetchPetDetails(request.pet.id);
                                            setShowDetailModal(true);
                                          }}
                                          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                                          title="View pet details"
                                        >
                                          <span className="material-icons text-sm">
                                            visibility
                                          </span>
                                        </button>
                                      )}

                                      {request.status === "pending" && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              setSubmitLoading(true);
                                              setError("");
                                              await petsAPI.cancelAdoptionRequest(
                                                request.id
                                              );
                                              setSuccessMessage(
                                                "Adoption request cancelled successfully."
                                              );
                                              await loadMyAdoptionRequests();
                                              setTimeout(
                                                () => setSuccessMessage(""),
                                                3000
                                              );
                                            } catch (err) {
                                              console.error(
                                                "Cancel request error:",
                                                err
                                              );
                                              setError(
                                                err.response?.data?.error ||
                                                  err.response?.data?.message ||
                                                  err.message ||
                                                  "Failed to cancel adoption request"
                                              );
                                            } finally {
                                              setSubmitLoading(false);
                                            }
                                          }}
                                          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                                          disabled={submitLoading}
                                          title="Cancel request"
                                        >
                                          <span className="material-icons text-sm">
                                            cancel
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full text-center py-12">
                                <span className="material-icons text-6xl text-gray-300 mb-4">
                                  pets
                                </span>
                                <p className="text-gray-500 text-lg">
                                  You haven't made any adoption requests yet
                                </p>
                                <button
                                  onClick={() =>
                                    setActiveTab("explore-adoption")
                                  }
                                  className="mt-4 px-6 py-2 bg-primary-blue hover:bg-blue-600 text-white rounded-full transition-colors"
                                >
                                  Browse Available Pets
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {activeTab === "report-lost" && (
                <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-primary-blue">
                    <span className="material-icons text-primary-blue text-3xl">
                      report
                    </span>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                      REPORT LOST PET
                    </h2>
                  </div>
                  <form onSubmit={handleSubmitPetReport} className="space-y-4">
                    <input type="hidden" name="pet_status" value="lost" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Pet Name *
                        </label>
                        <input
                          type="text"
                          name="pet_name"
                          value={petForm.pet_name}
                          onChange={handleFormChange}
                          required
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter pet name"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Pet Type *
                        </label>
                        <select
                          name="pet_type"
                          value={petForm.pet_type}
                          onChange={handleFormChange}
                          required
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors bg-slate-50/50"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Bird">Bird</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Breed
                        </label>
                        <input
                          type="text"
                          name="pet_breed"
                          value={petForm.pet_breed}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter breed"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          name="pet_age"
                          value={petForm.pet_age}
                          onChange={handleFormChange}
                          min="0"
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter age"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          name="pet_weight"
                          value={petForm.pet_weight}
                          onChange={handleFormChange}
                          min="0"
                          step="0.1"
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter weight in kg"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Color
                        </label>
                        <input
                          type="text"
                          name="pet_colour"
                          value={petForm.pet_colour}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter color"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Gender
                        </label>
                        <select
                          name="pet_gender"
                          value={petForm.pet_gender}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors bg-slate-50/50"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>

                      <div className="flex flex-col md:col-span-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Last Seen Location *
                        </label>
                        <input
                          type="text"
                          name="pet_location"
                          value={petForm.pet_location}
                          onChange={handleFormChange}
                          required
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter location (address, landmark)"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          City/State
                        </label>
                        <input
                          type="text"
                          name="pet_city"
                          value={petForm.pet_city}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter city and state"
                        />
                      </div>

                      <div className="flex flex-col md:col-span-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                              Pet Photo
                            </label>
                            <input
                              type="file"
                              name="pet_image"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                setPetForm((prev) => ({
                                  ...prev,
                                  pet_image: file,
                                }));
                              }}
                              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-blue file:text-white hover:file:bg-primary-teal file:cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                              Clear photo of your pet (JPG, PNG, WebP)
                            </p>
                          </div>
                          {petForm.pet_image && (
                            <div className="relative inline-block">
                              <img
                                src={URL.createObjectURL(petForm.pet_image)}
                                alt="Pet preview"
                                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                onClick={() =>
                                  setPetForm((prev) => ({
                                    ...prev,
                                    pet_image: null,
                                  }))
                                }
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={petForm.description}
                        onChange={handleFormChange}
                        rows="3"
                        className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors resize-none"
                        placeholder="Describe your pet's appearance, behavior, distinctive marks..."
                      />
                    </div>

                    <div className="mt-2">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">💊</span>
                        Medical Information
                      </h3>
                      <div className="space-y-4">
                        {/* Vaccination Status */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                          <input
                            type="checkbox"
                            id="lost_is_vaccinated"
                            name="is_vaccinated"
                            checked={petForm.is_vaccinated}
                            onChange={handleFormChange}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 cursor-pointer"
                          />
                          <label
                            htmlFor="lost_is_vaccinated"
                            className="text-sm font-medium text-gray-700 dark:text-white cursor-pointer select-none"
                          >
                            Is Vaccinated
                          </label>
                        </div>

                        {/* Vaccination Details - Conditional */}
                        {petForm.is_vaccinated && (
                          <div className="ml-8 space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Vaccination Date
                                </label>
                                <input
                                  type="date"
                                  name="vaccination_date"
                                  value={petForm.vaccination_date || ""}
                                  onChange={handleFormChange}
                                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Vaccination Type
                                </label>
                                <input
                                  type="text"
                                  name="vaccination_details"
                                  value={petForm.vaccination_details}
                                  onChange={handleFormChange}
                                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                                  placeholder="e.g., Rabies, DHPP"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                Vaccination Certificate
                              </label>
                              <input
                                type="file"
                                name="vaccination_certificate"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  setPetForm((prev) => ({
                                    ...prev,
                                    vaccination_certificate: file,
                                  }));
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-blue file:text-white hover:file:bg-primary-teal file:cursor-pointer"
                              />
                              <p className="text-xs text-gray-500 dark:text-slate-300 mt-2">
                                Upload PDF or image file
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Health Condition Status */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                          <input
                            type="checkbox"
                            id="lost_is_diseased"
                            name="is_diseased"
                            checked={petForm.is_diseased}
                            onChange={handleFormChange}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 cursor-pointer"
                          />
                          <label
                            htmlFor="lost_is_diseased"
                            className="text-sm font-medium text-gray-700 dark:text-white cursor-pointer select-none"
                          >
                            Has Health Conditions
                          </label>
                        </div>

                        {/* Health Condition Details - Conditional */}
                        {petForm.is_diseased && (
                          <div className="ml-8 flex flex-col animate-fadeIn">
                            <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                              Health Condition Description
                            </label>
                            <textarea
                              name="health_conditions"
                              value={petForm.health_conditions}
                              onChange={handleFormChange}
                              rows="3"
                              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors resize-none"
                              placeholder="Describe any health conditions or ongoing treatments..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row gap-3 mt-4 pt-3 border-t border-gray-100 justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveTab("dashboard")}
                        className="px-4 py-2 border-2 border-gray-300 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitLoading}
                        className="px-4 py-2 bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow text-white font-bold rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          "Report Lost Pet"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {/* /////////////////////////// */}
              {activeTab === "report-found" && (
                <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      👁️
                    </span>
                    <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      REPORT FOUND PET
                    </span>
                  </h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSubmitLoading(true);
                      setError("");
                      setSuccessMessage("");

                      try {
                        // Create FormData for file upload (same as Lost pet form)
                        const formData = new FormData();

                        // Add all form fields with pet_status set to "found"
                        Object.keys(petForm).forEach((key) => {
                          if (key === "pet_image" && petForm[key]) {
                            formData.append("pet_image", petForm[key]);
                          } else if (key === "pet_status") {
                            formData.append("pet_status", "found"); // Force status to "found"
                          } else if (key !== "pet_image") {
                            formData.append(key, petForm[key]);
                          }
                        });

                        const response =
                          await petsAPI.submitPetRequestWithImage(formData);
                        if (response.data.success) {
                          setSuccessMessage(
                            "Found pet report submitted successfully!"
                          );
                          // Hide success message after 3 seconds
                          setTimeout(() => {
                            setSuccessMessage("");
                          }, 3000);
                          // Reset form
                          setPetForm({
                            pet_name: "",
                            pet_type: "Dog",
                            pet_breed: "",
                            pet_age: "",
                            pet_colour: "",
                            pet_weight: "",
                            pet_gender: "Male",
                            pet_location: "",
                            pet_state: "",
                            pet_city: "",
                            pet_status: "found",
                            description: "",
                            is_vaccinated: false,
                            is_diseased: false,
                            vaccination_details: "",
                            vaccination_date: "",
                            vaccination_certificate: null,
                            health_conditions: "",
                            pet_image: null,
                          });
                          // Reload data to show updated reports
                          await loadData();
                          // Switch back to dashboard tab immediately
                          setActiveTab("dashboard");
                        }
                      } catch (err) {
                        setError(
                          err.response?.data?.error ||
                            "Failed to submit found pet report. Please try again."
                        );
                      }
                      setSubmitLoading(false);
                    }}
                  >
                    {/* Pet Information - Extended for Found Report */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                      {/* Pet Name */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Pet Name (if known)
                        </label>
                        <input
                          type="text"
                          name="pet_name"
                          value={petForm.pet_name}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter pet name"
                        />
                      </div>

                      {/* Pet Type */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Pet Type *
                        </label>
                        <select
                          name="pet_type"
                          value={petForm.pet_type}
                          onChange={handleFormChange}
                          required
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors bg-slate-50/50"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Bird">Bird</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Pet Breed */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Breed (if known)
                        </label>
                        <input
                          type="text"
                          name="pet_breed"
                          value={petForm.pet_breed}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter breed"
                        />
                      </div>

                      {/* Pet Colour */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Colour
                        </label>
                        <input
                          type="text"
                          name="pet_colour"
                          value={petForm.pet_colour}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter colour"
                        />
                      </div>

                      {/* Pet Gender */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Gender
                        </label>
                        <select
                          name="pet_gender"
                          value={petForm.pet_gender}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors bg-slate-50/50"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>

                      {/* Pet Weight */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Weight (if known)
                        </label>
                        <input
                          type="text"
                          name="pet_weight"
                          value={petForm.pet_weight}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter weight (e.g., 10kg)"
                        />
                      </div>

                      {/* Pet Age */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Age (if known)
                        </label>
                        <input
                          type="text"
                          name="pet_age"
                          value={petForm.pet_age}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter age (e.g., 2 years)"
                        />
                      </div>

                      {/* City */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="pet_city"
                          value={petForm.pet_city}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter city"
                        />
                      </div>

                      {/* State */}
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          name="pet_state"
                          value={petForm.pet_state}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter state"
                        />
                      </div>

                      {/* Found Location */}
                      <div className="flex flex-col md:col-span-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                          Found Location *
                        </label>
                        <input
                          type="text"
                          name="pet_location"
                          value={petForm.pet_location}
                          onChange={handleFormChange}
                          required
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Where did you find this pet?"
                        />
                      </div>

                      {/* Pet Photo */}
                      <div className="flex flex-col md:col-span-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                              Pet Photo
                            </label>
                            <input
                              type="file"
                              name="pet_image"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                setPetForm((prev) => ({
                                  ...prev,
                                  pet_image: file,
                                }));
                              }}
                              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-blue file:text-white hover:file:bg-primary-teal file:cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                              Upload a photo of the found pet
                            </p>
                          </div>
                          {petForm.pet_image && (
                            <div className="relative inline-block">
                              <img
                                src={URL.createObjectURL(petForm.pet_image)}
                                alt="Pet preview"
                                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                onClick={() =>
                                  setPetForm((prev) => ({
                                    ...prev,
                                    pet_image: null,
                                  }))
                                }
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col mb-4">
                      <label className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        value={petForm.description}
                        onChange={handleFormChange}
                        rows="4"
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors resize-none"
                        placeholder="Describe the found pet's appearance, condition, behavior..."
                      />
                    </div>

                    <div className="mt-2">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">💊</span>
                        Medical Information
                      </h3>
                      <div className="space-y-4">
                        {/* Vaccination Status */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                          <input
                            type="checkbox"
                            id="found_is_vaccinated"
                            name="is_vaccinated"
                            checked={petForm.is_vaccinated}
                            onChange={handleFormChange}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 cursor-pointer"
                          />
                          <label
                            htmlFor="found_is_vaccinated"
                            className="text-sm font-medium text-gray-700 dark:text-white cursor-pointer select-none"
                          >
                            Is Vaccinated
                          </label>
                        </div>

                        {/* Vaccination Details - Conditional */}
                        {petForm.is_vaccinated && (
                          <div className="ml-8 space-y-4 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Vaccination Date
                                </label>
                                <input
                                  type="date"
                                  name="vaccination_date"
                                  value={petForm.vaccination_date || ""}
                                  onChange={handleFormChange}
                                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                  Vaccination Type
                                </label>
                                <input
                                  type="text"
                                  name="vaccination_details"
                                  value={petForm.vaccination_details}
                                  onChange={handleFormChange}
                                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                                  placeholder="e.g., Rabies, DHPP"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                Vaccination Certificate
                              </label>
                              <input
                                type="file"
                                name="vaccination_certificate"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  setPetForm((prev) => ({
                                    ...prev,
                                    vaccination_certificate: file,
                                  }));
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-blue file:text-white hover:file:bg-primary-teal file:cursor-pointer"
                              />
                              <p className="text-xs text-gray-500 dark:text-slate-300 mt-2">
                                Upload PDF or image file
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Health Condition Status */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                          <input
                            type="checkbox"
                            id="found_is_diseased"
                            name="is_diseased"
                            checked={petForm.is_diseased}
                            onChange={handleFormChange}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 cursor-pointer"
                          />
                          <label
                            htmlFor="found_is_diseased"
                            className="text-sm font-medium text-gray-700 dark:text-white cursor-pointer select-none"
                          >
                            Has Health Conditions
                          </label>
                        </div>

                        {/* Health Condition Details - Conditional */}
                        {petForm.is_diseased && (
                          <div className="ml-8 flex flex-col animate-fadeIn">
                            <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                              Health Condition Description
                            </label>
                            <textarea
                              name="health_conditions"
                              value={petForm.health_conditions}
                              onChange={handleFormChange}
                              rows="3"
                              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors resize-none"
                              placeholder="Describe any health conditions or ongoing treatments..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-4 mt-8 pt-6 border-t-2 border-gray-100">
                      <button
                        type="button"
                        onClick={() => setActiveTab("dashboard")}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 dark:text-white font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitLoading}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                      >
                        {submitLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          "Report Found Pet"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {activeTab === "feedbacks" && (
                <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      💬
                    </span>
                    <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      ALL USER FEEDBACKS
                    </span>
                  </h2>

                  <div className="mb-6 text-center">
                    <p className="text-gray-700 dark:text-gray-300">
                      See what others are saying about our platform. You can add
                      your own feedback using the form at the bottom of the
                      page.
                    </p>
                  </div>

                  {/* Feedback List */}
                  <div className="mt-8">
                    <div className="transition-colors duration-300">
                      {loading ? (
                        <div className="text-center py-8">
                          Loading feedback…
                        </div>
                      ) : feedbacks.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                          No feedback yet — be the first!
                        </div>
                      ) : (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {feedbacks.map((f) => {
                            const messageTooLong =
                              f.message && f.message.length > 120;
                            const isExpanded = expandedItems[f.id] || false;
                            const displayMessage = isExpanded
                              ? f.message
                              : messageTooLong
                              ? f.message.slice(0, 120) + "..."
                              : f.message;

                            return (
                              <li
                                key={f.id}
                                className={`rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 border ${
                                  isDarkMode
                                    ? "bg-gray-800 border-gray-700 hover:border-purple-500"
                                    : "bg-white border-purple-100 hover:border-purple-300"
                                }`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    {f.image ? (
                                      <img
                                        src={f.image}
                                        alt="User"
                                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-300"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center text-purple-800 font-bold">
                                        {f.name
                                          ? f.name.charAt(0).toUpperCase()
                                          : "A"}
                                      </div>
                                    )}

                                    <div>
                                      <div
                                        className={`font-bold ${
                                          isDarkMode
                                            ? "text-white"
                                            : "text-purple-900"
                                        }`}
                                      >
                                        {f.name || "Anonymous"}
                                      </div>
                                      <span
                                        className={`text-xs ${
                                          isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {new Date(
                                          f.created_at
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Message with read more toggle */}
                                <p
                                  className={`mt-3 whitespace-pre-line ${
                                    isDarkMode ? "text-white" : "text-gray-700"
                                  }`}
                                >
                                  {displayMessage}
                                </p>

                                {messageTooLong && (
                                  <button
                                    onClick={() =>
                                      setExpandedItems((prev) => ({
                                        ...prev,
                                        [f.id]: !prev[f.id],
                                      }))
                                    }
                                    className={`mt-2 text-sm ${
                                      isDarkMode
                                        ? "text-purple-400 hover:text-purple-300"
                                        : "text-purple-700 hover:text-purple-500"
                                    } hover:underline`}
                                  >
                                    {isExpanded ? "Read less" : "Read more"}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "notifications" && (
                <div className="bg-gradient-to-br from-purple-200/70 to-purple-250/60 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200/70 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      🔔
                    </span>
                    <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      NOTIFICATIONS
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔕</div>
                        <p className="text-gray-500 dark:text-slate-300 text-lg">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      <>
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                              notification.is_read
                                ? "bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-500"
                                : "bg-blue-50 dark:bg-blue-900/40 border-primary-blue dark:border-blue-500 shadow-sm"
                            }`}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p
                                  className={`text-sm ${
                                    notification.is_read
                                      ? "text-gray-600 dark:text-slate-200"
                                      : "text-gray-800 dark:text-white font-bold"
                                  }`}
                                >
                                  {notification.message}
                                </p>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-300 whitespace-nowrap">
                                {new Date(
                                  notification.created_at
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Empty placeholder where my-adoption-requests tab content used to be */}
              {activeTab === "my-adoption-requests" && (
                <div className="bg-gradient-to-br from-purple-200/70 to-purple-250/60 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200/70 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      📋
                    </span>
                    <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      ADOPTION REQUESTS ({myAdoptionRequests.length})
                    </span>
                  </h2>
                  <div className="flex flex-wrap justify-center gap-6">
                    {loading ? (
                      <div className="w-full text-center py-16">
                        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-4"></div>
                        <p>Loading your adoption requests...</p>
                      </div>
                    ) : myAdoptionRequests.length === 0 ? (
                      <div className="w-full text-center py-16">
                        <div className="text-6xl mb-4">📝</div>
                        <p className="text-gray-500 text-lg">
                          You haven't made any adoption requests yet
                        </p>
                        <button
                          onClick={() => setActiveTab("explore-adoption")}
                          className="mt-4 px-6 py-2 bg-primary-blue hover:bg-blue-600 text-white rounded-full transition-colors"
                        >
                          Browse Available Pets
                        </button>
                      </div>
                    ) : (
                      myAdoptionRequests.map((request) => (
                        <div
                          key={request.id}
                          className="w-80 h-[450px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                        >
                          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                            <img
                              src={getImageUrl(request.pet?.image)}
                              alt={request.pet?.name || "Pet"}
                              onError={(e) => {
                                e.target.src = "/default-pet.png";
                              }}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                              <h3 className="text-white text-xl font-bold">
                                {request.pet?.name || "Unknown Pet"}
                              </h3>
                            </div>
                          </div>
                          <div className="p-5 flex-1 space-y-3 overflow-hidden">
                            <div className="flex items-start justify-between">
                              <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-400 text-white text-sm font-semibold rounded-full">
                                {request.pet?.type || "Pet"}
                              </div>
                              <div
                                className={`text-sm px-2 py-1 rounded-full ${
                                  request.status === "approved"
                                    ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                    : request.status === "rejected"
                                    ? "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100"
                                }`}
                              >
                                {request.status === "approved"
                                  ? "✓ Approved"
                                  : request.status === "rejected"
                                  ? "✗ Rejected"
                                  : "⌛ Pending"}
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Requested on:{" "}
                              {new Date(
                                request.created_at
                              ).toLocaleDateString()}
                            </div>

                            <div className="space-y-2 mt-2">
                              <span className="block text-gray-700 dark:text-white text-sm">
                                <span className="font-semibold">Breed:</span>{" "}
                                {request.pet?.breed || "Unknown"}
                              </span>
                              {request.pet?.age && (
                                <span className="block text-gray-700 dark:text-white text-sm">
                                  <span className="font-semibold">Age:</span> 🎂{" "}
                                  {request.pet?.age} years
                                </span>
                              )}
                              {request.pet?.gender && (
                                <span className="block text-gray-700 dark:text-white text-sm">
                                  <span className="font-semibold">Gender:</span>{" "}
                                  {request.pet?.gender === "Male" ? "♂️" : "♀️"}{" "}
                                  {request.pet?.gender}
                                </span>
                              )}
                            </div>

                            <div className="pt-2"></div>

                            {/* Action buttons */}
                            <div className="flex items-center justify-end gap-4 mt-2">
                              {request.pet?.id && (
                                <button
                                  onClick={() => {
                                    fetchPetDetails(request.pet.id);
                                    setShowDetailModal(true);
                                  }}
                                  className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                                  title="View pet details"
                                >
                                  <span className="material-icons">
                                    visibility
                                  </span>
                                </button>
                              )}

                              {request.status === "pending" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      setSubmitLoading(true);
                                      setError("");
                                      await petsAPI.cancelAdoptionRequest(
                                        request.id
                                      );
                                      setSuccessMessage(
                                        "Adoption request cancelled successfully."
                                      );
                                      await loadMyAdoptionRequests();
                                      setTimeout(
                                        () => setSuccessMessage(""),
                                        3000
                                      );
                                    } catch (err) {
                                      console.error(
                                        "Cancel request error:",
                                        err
                                      );
                                      setError(
                                        err.response?.data?.error ||
                                          err.response?.data?.message ||
                                          err.message ||
                                          "Failed to cancel adoption request"
                                      );
                                    } finally {
                                      setSubmitLoading(false);
                                    }
                                  }}
                                  className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                                  disabled={submitLoading}
                                  title="Cancel request"
                                >
                                  <span className="material-icons">cancel</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {activeTab === "all-lost" && (
                <div className="bg-gradient-to-br from-purple-200/70 to-purple-250/60 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200/70 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      🔍
                    </span>
                    <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      ALL LOST PETS (
                      {
                        allLostReports.filter(
                          (r) =>
                            r.report_type === "LOST" &&
                            r.report_status === "ACCEPTED"
                        ).length
                      }
                      )
                    </span>
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    <>
                      {loading ? (
                        <div className="w-full flex flex-col items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-blue mb-4"></div>
                          <p className="text-gray-600 dark:text-white">
                            Loading approved lost pet reports...
                          </p>
                        </div>
                      ) : allLostReports.filter(
                          (r) =>
                            r.report_type === "LOST" &&
                            r.report_status === "ACCEPTED"
                        ).length > 0 ? (
                        allLostReports
                          .filter(
                            (r) =>
                              r.report_type === "LOST" &&
                              r.report_status === "ACCEPTED"
                          )
                          .map((report) => (
                            <div
                              key={report.id}
                              className="w-80 h-[450px] flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-blue-100 dark:border-slate-600"
                            >
                              <div className="relative h-40 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                <img
                                  src={getImageUrl(report.photo)}
                                  alt={report.pet_name}
                                  onError={(e) => {
                                    e.target.src = "/default-pet.png";
                                  }}
                                  className="w-full h-full object-cover"
                                />
                                {/* Favourite toggle (top-right) for lost report if pet id exists */}
                                {report.pet_id && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const fav = findFavouriteByPetId(
                                        report.pet_id
                                      );
                                      if (fav)
                                        await handleRemoveFavourite(fav.id);
                                      else
                                        await handleAddFavourite(report.pet_id);
                                    }}
                                    title={
                                      findFavouriteByPetId(report.pet_id)
                                        ? "Remove favourite"
                                        : "Add to favourites"
                                    }
                                    aria-pressed={
                                      !!findFavouriteByPetId(report.pet_id)
                                    }
                                    className={`absolute top-3 right-3 z-10 p-2 rounded-full shadow-md transition-colors ${
                                      findFavouriteByPetId(report.pet_id)
                                        ? "bg-pink-500 text-white"
                                        : "bg-white text-gray-800 dark:bg-slate-700 dark:text-white"
                                    }`}
                                  >
                                    <span className="material-icons">
                                      favorite
                                    </span>
                                  </button>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                  <h3 className="text-white text-xl font-bold">
                                    {report.pet_name}
                                  </h3>
                                </div>
                              </div>
                              <div className="p-4 flex-1 space-y-2 overflow-hidden">
                                <div className="flex items-start justify-between">
                                  <div className="inline-block px-3 py-1 bg-gradient-to-r from-primary-blue to-primary-teal text-white text-sm font-semibold rounded-full">
                                    {report.animal_type}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-slate-300">
                                    {new Date(
                                      report.created_at
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {report.pet_breed && (
                                    <p className="text-sm text-gray-600 dark:text-white">
                                      <span className="font-semibold">
                                        Breed:
                                      </span>{" "}
                                      {report.pet_breed}
                                    </p>
                                  )}
                                  {report.pet_location && (
                                    <p className="text-sm text-gray-600 dark:text-white flex items-center gap-1">
                                      <span>📍</span>
                                      <span className="font-semibold">
                                        Last Seen:
                                      </span>{" "}
                                      {report.pet_location}
                                    </p>
                                  )}
                                </div>
                                {/* description hidden in card; use View Full Details to read full description */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                  <span className="text-xs text-gray-500 dark:text-slate-300">
                                    By: {report.owner_username || "Anonymous"}
                                  </span>
                                  <div className="inline-block px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100 text-xs font-bold rounded-lg">
                                    ✓ APPROVED - LOST
                                  </div>
                                </div>
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-xl flex items-center gap-2 text-sm text-primary-blue dark:text-blue-300 font-medium">
                                  <span className="text-xl">📞</span>
                                  <span>Contact owner to help reunite</span>
                                </div>
                                {report.pet_id && (
                                  <div className="flex items-center justify-end mt-3">
                                    <button
                                      onClick={() =>
                                        fetchPetDetails(report.pet_id)
                                      }
                                      title="View details"
                                      aria-label="View details"
                                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                    >
                                      <span className="material-icons text-sm">
                                        visibility
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="col-span-full text-center py-16">
                          <div className="text-6xl mb-4">🔍</div>
                          <p className="text-gray-500 text-lg">
                            No approved lost pet reports from community members
                            yet
                          </p>
                        </div>
                      )}
                    </>
                  </div>
                </div>
              )}
              {activeTab === "explore-adoption" && (
                <div className="bg-gradient-to-br from-purple-200/70 to-purple-250/60 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200/70 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      ❤️
                    </span>
                    <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      AVAILABLE PETS ({availableAdoptionPets.length})
                    </span>
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {loading && (
                      <div className="w-full flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-blue mb-4"></div>
                        <p className="text-gray-600 dark:text-white">
                          Loading available pets...
                        </p>
                      </div>
                    )}

                    {!loading && availableAdoptionPets.length > 0 && (
                      <>
                        {availableAdoptionPets.map((pet) => (
                          <div
                            key={pet.id}
                            className="w-80 h-[450px] flex flex-col bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 dark:border-blue-700"
                          >
                            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                              {/* Favourite toggle (top-right) */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const fav = findFavouriteByPetId(pet.id);
                                  if (fav) {
                                    await handleRemoveFavourite(fav.id);
                                  } else {
                                    await handleAddFavourite(pet.id);
                                  }
                                }}
                                title={
                                  findFavouriteByPetId(pet.id)
                                    ? "Remove favourite"
                                    : "Add to favourites"
                                }
                                aria-pressed={!!findFavouriteByPetId(pet.id)}
                                className={`absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full shadow-md transition-colors ${
                                  findFavouriteByPetId(pet.id)
                                    ? "bg-pink-500 text-white"
                                    : "bg-white text-gray-800 dark:bg-slate-700 dark:text-white"
                                }`}
                              >
                                <span className="material-icons">favorite</span>
                              </button>
                              {/* Only top-right favourite button retained */}
                              <img
                                src={getImageUrl(pet.image)}
                                alt={pet.name}
                                onLoad={() => {
                                  console.log(
                                    `✅ Image loaded successfully for available pet ${pet.name}:`,
                                    getImageUrl(pet.image)
                                  );
                                }}
                                onError={(e) => {
                                  console.log(
                                    `❌ Image failed to load for available pet ${pet.name}:`,
                                    {
                                      attempted: e.target.src,
                                      originalPath: pet.image,
                                      fallback: getDefaultImage(pet.type),
                                    }
                                  );
                                  e.target.src = getDefaultImage(pet.type);
                                }}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                <h3 className="text-white text-xl font-bold">
                                  {pet.name}
                                </h3>
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
                                <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg flex items-center gap-1">
                                  🎂 {pet.age} years
                                </span>
                                <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg">
                                  {pet.gender === "Male" ? "♂️" : "♀️"}{" "}
                                  {pet.gender}
                                </span>
                                {pet.location && (
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg flex items-center gap-1">
                                    📍 {pet.location}
                                  </span>
                                )}
                              </div>
                              {/* Description hidden as requested */}
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

                              {/* New action buttons row */}
                              <div className="flex items-center justify-end gap-4 mt-2">
                                <button
                                  onClick={() => {
                                    fetchPetDetails(pet.id);
                                    setShowDetailModal(true);
                                  }}
                                  className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                                  title="View details"
                                >
                                  <span className="material-icons">
                                    visibility
                                  </span>
                                </button>

                                {pet.has_pending_request ? (
                                  <button
                                    className="w-12 h-12 bg-gray-400 text-white rounded-full flex items-center justify-center cursor-not-allowed"
                                    disabled
                                    title="Request pending"
                                  >
                                    <span className="material-icons">
                                      pending
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      try {
                                        setSubmitLoading(true);
                                        setError("");
                                        await petsAPI.requestAdoption({
                                          pet_id: pet.id,
                                          reason:
                                            "I would like to adopt this pet",
                                        });
                                        setSuccessMessage(
                                          "Adoption request submitted! Admin will review."
                                        );
                                        await loadData();
                                        setTimeout(
                                          () => setSuccessMessage(""),
                                          3000
                                        );
                                      } catch (err) {
                                        console.error(
                                          "Adoption request error:",
                                          err
                                        );
                                        setError(
                                          err.response?.data?.error ||
                                            err.response?.data?.message ||
                                            err.message ||
                                            "Failed to submit adoption request"
                                        );
                                      } finally {
                                        setSubmitLoading(false);
                                      }
                                    }}
                                    className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                                    disabled={submitLoading}
                                    title="Request adoption"
                                  >
                                    <span className="material-icons">pets</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {!loading && availableAdoptionPets.length === 0 && (
                      <div className="col-span-full text-center py-16">
                        <div className="text-6xl mb-4">🐾</div>
                        <p className="text-gray-500 text-lg">
                          No pets available for adoption at the moment
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "favorite-pets" && (
                <div className="bg-gradient-to-br from-purple-200/70 to-purple-250/60 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200/70 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl text-pink-500">❤️</span>
                    <span>YOUR FAVOURITE PETS ({favourites.length})</span>
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {favourites.length === 0 ? (
                      <div className="w-full text-center py-16">
                        <div className="text-6xl mb-4">💔</div>
                        <p className="text-gray-500 text-lg">
                          You have no favourite pets yet
                        </p>
                      </div>
                    ) : (
                      favourites.map((f) => (
                        <div
                          key={f.id}
                          className="w-80 h-[450px] flex flex-col bg-gradient-to-br from-purple-100 to-purple-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-200 dark:border-slate-600"
                        >
                          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                            {/* Favourite toggle on favourite card */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                // favourites list items hold their own id as f.id
                                await handleRemoveFavourite(f.id);
                              }}
                              title="Remove favourite"
                              className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full shadow-md bg-pink-500 text-white"
                            >
                              <span className="material-icons">favorite</span>
                            </button>
                            <img
                              src={getImageUrl(
                                f.pet?.pet_info?.image || f.pet?.image
                              )}
                              alt={f.pet?.name || "Pet"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = "/default-pet.png";
                              }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                              <h3 className="text-white text-xl font-bold">
                                {f.pet?.name || f.pet_name}
                              </h3>
                            </div>
                          </div>
                          <div className="p-5 flex-1 space-y-3 overflow-hidden">
                            <div className="flex items-start justify-between">
                              <div className="inline-block px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-400 text-white text-sm font-semibold rounded-full">
                                {f.pet?.type || "Pet"}
                              </div>
                              <div className="text-sm text-purple-700 dark:text-purple-300">
                                Added:{" "}
                                {new Date(f.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="space-y-2 mt-2">
                              <span className="block text-gray-700 dark:text-white text-sm">
                                <span className="font-semibold">Name:</span>{" "}
                                {f.pet?.pet_info?.name ||
                                  f.pet?.name ||
                                  f.pet_name ||
                                  "Unknown"}
                              </span>
                              <span className="block text-gray-700 dark:text-white text-sm">
                                <span className="font-semibold">Type:</span>{" "}
                                {f.pet?.pet_info?.type ||
                                  f.pet?.type ||
                                  "Unknown"}
                              </span>
                              <span className="block text-gray-700 dark:text-white text-sm">
                                <span className="font-semibold">Breed:</span>{" "}
                                {f.pet?.pet_info?.breed ||
                                  f.pet?.breed ||
                                  "Unknown"}
                              </span>
                              {f.pet?.pet_info?.colour && (
                                <span className="block text-gray-700 dark:text-white text-sm">
                                  <span className="font-semibold">Colour:</span>{" "}
                                  {f.pet.pet_info.colour}
                                </span>
                              )}
                              {f.pet?.pet_info?.age && (
                                <span className="block text-gray-700 dark:text-white text-sm">
                                  <span className="font-semibold">Age:</span> 🎂{" "}
                                  {f.pet.pet_info.age} years
                                </span>
                              )}
                              {f.pet?.pet_info?.gender && (
                                <span className="block text-gray-700 dark:text-white text-sm">
                                  <span className="font-semibold">Gender:</span>{" "}
                                  {f.pet.pet_info.gender === "Male"
                                    ? "♂️"
                                    : "♀️"}{" "}
                                  {f.pet.pet_info.gender}
                                </span>
                              )}
                              {f.pet?.pet_info?.weight && (
                                <span className="block text-gray-700 dark:text-white text-sm">
                                  <span className="font-semibold">Weight:</span>{" "}
                                  {f.pet.pet_info.weight} kg
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-white line-clamp-3 mt-2">
                              {f.pet?.description || ""}
                            </p>
                            {f.pet?.id && (
                              <div className="flex justify-end mt-3">
                                <button
                                  onClick={() => fetchPetDetails(f.pet.id)}
                                  title="View details"
                                  aria-label="View details"
                                  className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-400 text-white shadow-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200"
                                >
                                  <span className="material-icons text-sm">
                                    visibility
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {activeTab === "post-pet-adoption" && (
                <div className="bg-gradient-to-br from-purple-200 to-purple-250 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 border-2 border-purple-200 dark:border-slate-600">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      ➕
                    </span>
                    <span className="bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow bg-clip-text text-transparent">
                      POST YOUR PET FOR ADOPTION
                    </span>
                  </h2>
                  <form onSubmit={handlePostPetForAdoption}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          Colour
                        </label>
                        <input
                          type="text"
                          value={postAdoptionForm.colour}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              colour: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter pet colour"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={postAdoptionForm.city}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              city: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter city"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          Pet Name *
                        </label>
                        <input
                          type="text"
                          value={postAdoptionForm.name}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              name: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter pet name"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          Pet Type *
                        </label>
                        <select
                          value={postAdoptionForm.type}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              type: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors bg-slate-50/50"
                        >
                          <option value="">Select Type</option>
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Bird">Bird</option>
                          <option value="Rabbit">Rabbit</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          Breed
                        </label>
                        <input
                          type="text"
                          value={postAdoptionForm.breed}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              breed: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Enter breed"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          Age (years) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={postAdoptionForm.age}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              age: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Age in years"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          Gender *
                        </label>
                        <select
                          value={postAdoptionForm.gender}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              gender: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors bg-slate-50/50"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                          Location *
                        </label>
                        <input
                          type="text"
                          value={postAdoptionForm.location}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              location: e.target.value,
                            })
                          }
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                          placeholder="Current location"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col mb-6">
                      <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                        Description
                      </label>
                      <textarea
                        rows="4"
                        value={postAdoptionForm.description}
                        onChange={(e) =>
                          setPostAdoptionForm({
                            ...postAdoptionForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors resize-none"
                        placeholder="Describe your pet's temperament, habits, and why they're great for adoption..."
                      />
                    </div>

                    <div className="flex flex-col mb-6">
                      <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                        Pet Image
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              setPostAdoptionForm({
                                ...postAdoptionForm,
                                image: file,
                              });
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-blue file:text-white hover:file:bg-primary-teal file:cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 dark:text-slate-300 mt-2">
                            Clear photo of your pet (JPG, PNG, WebP)
                          </p>
                        </div>
                        {postAdoptionForm.image && (
                          <div className="relative inline-block">
                            <img
                              src={URL.createObjectURL(postAdoptionForm.image)}
                              alt="Pet preview"
                              className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200 dark:border-slate-600"
                            />
                            <button
                              type="button"
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                              onClick={() =>
                                setPostAdoptionForm({
                                  ...postAdoptionForm,
                                  image: null,
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">💊</span>
                      Medical Information
                    </h3>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={postAdoptionForm.is_vaccinated}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              is_vaccinated: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded border-2 border-gray-300 text-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 cursor-pointer"
                        />
                        <label className="text-sm font-medium text-gray-700 dark:text-white cursor-pointer select-none">
                          Is Vaccinated
                        </label>
                      </div>

                      {postAdoptionForm.is_vaccinated && (
                        <div className="ml-8 space-y-4 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                Vaccination Date
                              </label>
                              <input
                                type="date"
                                value={postAdoptionForm.vaccination_date}
                                onChange={(e) =>
                                  setPostAdoptionForm({
                                    ...postAdoptionForm,
                                    vaccination_date: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                                Vaccination Type
                              </label>
                              <input
                                type="text"
                                value={postAdoptionForm.vaccination_type}
                                onChange={(e) =>
                                  setPostAdoptionForm({
                                    ...postAdoptionForm,
                                    vaccination_type: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors"
                                placeholder="e.g., Rabies, DHPP"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                              Vaccination Certificate
                            </label>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                setPostAdoptionForm({
                                  ...postAdoptionForm,
                                  vaccination_certificate: e.target.files[0],
                                })
                              }
                              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-blue file:text-white hover:file:bg-primary-teal file:cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 dark:text-slate-300 mt-2">
                              Upload PDF or image file
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={postAdoptionForm.is_diseased}
                          onChange={(e) =>
                            setPostAdoptionForm({
                              ...postAdoptionForm,
                              is_diseased: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded border-2 border-gray-300 text-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 cursor-pointer"
                        />
                        <label className="text-sm font-medium text-gray-700 dark:text-white cursor-pointer select-none">
                          Has Health Conditions
                        </label>
                      </div>

                      {postAdoptionForm.is_diseased && (
                        <div className="ml-8 flex flex-col animate-fadeIn">
                          <label className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
                            Health Condition Description
                          </label>
                          <textarea
                            rows="3"
                            value={postAdoptionForm.disease_description}
                            onChange={(e) =>
                              setPostAdoptionForm({
                                ...postAdoptionForm,
                                disease_description: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary-blue dark:bg-slate-700 dark:text-white focus:outline-none transition-colors resize-none"
                            placeholder="Describe any health conditions or special care needs..."
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="w-full px-6 py-4 bg-gradient-to-r from-primary-blue via-primary-teal to-accent-yellow text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                    >
                      {submitLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Posting...
                        </span>
                      ) : (
                        "Post Pet for Adoption"
                      )}
                    </button>
                  </form>
                </div>
              )}
              {activeTab === "my-adoption-posts" && (
                <div className="my-adoption-posts-section">
                  <div className="section-header">
                    <span className="material-icons">article</span>
                    MY ADOPTION POSTS ({myAdoptionPosts.length})
                  </div>
                  <div className="reports-grid">
                    {loading ? (
                      <div className="loading">
                        Loading your adoption posts...
                      </div>
                    ) : myAdoptionPosts.length > 0 ? (
                      myAdoptionPosts.map((post) => (
                        <div
                          key={post.id}
                          className="dashboard-pet-card my-adoption-post"
                        >
                          <div className="pet-card-image">
                            <img
                              src={getImageUrl(post.image)}
                              alt={post.name}
                              onLoad={(e) => {
                                console.log(
                                  `✅ Tab image loaded for ${post.name}:`,
                                  e.target.src
                                );
                              }}
                              onError={(e) => {
                                console.error(
                                  `❌ Tab image failed for ${post.name}:`,
                                  {
                                    attempted: e.target.src,
                                    originalPath: post.image,
                                    fallback: getDefaultImage(post.type),
                                  }
                                );
                                e.target.src = getDefaultImage(post.type);
                              }}
                            />
                            <div className="pet-name-overlay">
                              <h3>{post.name}</h3>
                            </div>
                          </div>
                          <div className="pet-card-info">
                            <div className="pet-type">{post.type}</div>
                            <div className="pet-details">
                              {post.breed && (
                                <span className="pet-breed">{post.breed}</span>
                              )}
                              <span className="pet-age">
                                🎂 {post.age} years old
                              </span>
                              <span className="pet-gender">
                                {post.gender === "Male" ? "♂️" : "♀️"}{" "}
                                {post.gender}
                              </span>
                              {post.location && (
                                <span className="pet-location">
                                  📍 {post.location}
                                </span>
                              )}
                            </div>
                            <div className="pet-description">
                              {post.description
                                ? post.description.length > 100
                                  ? `${post.description.substring(0, 100)}...`
                                  : post.description
                                : "No description available"}
                            </div>
                            <div className="pet-medical-info">
                              {post.is_vaccinated && (
                                <span className="badge vaccinated">
                                  ✓ Vaccinated
                                </span>
                              )}
                              {post.is_diseased && (
                                <span className="badge health-issue">
                                  ⚠ Health Condition
                                </span>
                              )}
                            </div>
                            <div
                              className={`pet-status-badge status-${post.report_status}`}
                            >
                              {post.report_status === "pending" &&
                                "⏳ PENDING ADMIN REVIEW"}
                              {post.report_status === "accepted" &&
                                "✅ APPROVED - LIVE"}
                              {post.report_status === "rejected" &&
                                "❌ REJECTED"}
                            </div>
                            {post.admin_comment && (
                              <div className="admin-comment">
                                <strong>Admin Comment:</strong>{" "}
                                {post.admin_comment}
                              </div>
                            )}
                            <div className="post-date">
                              Posted:{" "}
                              {new Date(post.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-reports">
                        <span className="material-icons">article</span>
                        <p>You haven't posted any pets for adoption yet</p>
                      </div>
                    )}
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
              {/* BibiChatbot Component */}
              <BibiChatbot />
              {/* Feedback area - CORRECTLY ADDED OUTSIDE THE HEADER */}       
               {" "}
              {activeTab !== "feedbacks" && (
                <section className="mt-16 pt-6 border-t border-gray-300 dark:border-slate-700">
                             {" "}
                  <div className="max-w-4xl mx-auto">
                                 {" "}
                    <h3 className="text-3xl font-extrabold mb-6 text-white">
                                      Community Feedback              {" "}
                    </h3>
                    {/* Form */}
                    <form
                      onSubmit={handleSubmit}
                      className={`p-6 rounded-lg shadow-lg mb-6 transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gray-800 text-white border border-gray-700"
                          : "bg-purple-100 text-purple-900 border border-purple-300"
                      }`}
                    >
                      {/* Error Message */}
                      {error && (
                        <div
                          className={`text-sm mb-3 ${
                            isDarkMode ? "text-red-400" : "text-red-600"
                          }`}
                        >
                          {error}
                        </div>
                      )}

                      {/* Form Header */}
                      <h4
                        className={`text-xl font-bold mb-4 ${
                          isDarkMode ? "text-white" : "text-purple-800"
                        }`}
                      >
                        Share Your Thoughts
                      </h4>

                      {/* File Upload */}
                      <div className="mb-6">
                        <label
                          className={`block font-semibold mb-2 ${
                            isDarkMode ? "text-white" : "text-purple-800"
                          }`}
                        >
                          Upload Image (optional)
                        </label>
                        <div
                          className={`p-3 rounded-lg border ${
                            isDarkMode
                              ? "border-gray-600 bg-gray-700"
                              : "border-purple-300 bg-purple-50"
                          }`}
                        >
                          <input
                            id="feedback-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className={`w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${
                              isDarkMode
                                ? "text-white file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                                : "text-gray-700 file:bg-purple-600 file:text-white hover:file:bg-purple-500"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Name and Message */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="sm:col-span-1">
                          <label
                            className={`block font-semibold mb-2 ${
                              isDarkMode ? "text-white" : "text-purple-800"
                            }`}
                          >
                            Your Name
                          </label>
                          <input
                            className={`w-full p-3 rounded-lg border focus:ring-2 transition-colors duration-300 ${
                              isDarkMode
                                ? "bg-gray-700 text-white border-gray-600 focus:border-purple-400 focus:ring-purple-400/30"
                                : "bg-white text-purple-900 border-purple-300 focus:border-purple-500 focus:ring-purple-500/30"
                            }`}
                            placeholder="Optional"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label
                            className={`block font-semibold mb-2 ${
                              isDarkMode ? "text-white" : "text-purple-800"
                            }`}
                          >
                            Your Message
                          </label>
                          <textarea
                            className={`w-full p-3 rounded-lg border focus:ring-2 resize-y min-h-[120px] transition-colors duration-300 ${
                              isDarkMode
                                ? "bg-gray-700 text-white border-gray-600 focus:border-purple-400 focus:ring-purple-400/30"
                                : "bg-white text-purple-900 border-purple-300 focus:border-purple-500 focus:ring-purple-500/30"
                            }`}
                            placeholder="Write your feedback here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex items-center gap-4">
                        <button
                          type="submit"
                          className={`px-6 py-3 rounded-lg font-medium transition-colors duration-300 ${
                            isDarkMode
                              ? "bg-purple-500 text-white hover:bg-purple-600"
                              : "bg-purple-700 text-white hover:bg-purple-800"
                          }`}
                          disabled={submitting}
                        >
                          {submitting ? "Sending..." : "Send Feedback"}
                        </button>
                        <button
                          type="button"
                          className={`px-6 py-3 rounded-lg font-medium transition-colors duration-300 ${
                            isDarkMode
                              ? "border-2 border-gray-600 text-gray-300 hover:bg-gray-800"
                              : "border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                          }`}
                          onClick={() => {
                            setName("");
                            setMessage("");
                            setError("");
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              )}
              {/* Community Voices section has been removed */}
            </main>
          </div>
        </div>

        {/* Pet Detail Modal - Enhanced Stylish Version */}
        {showDetailModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={closeDetailModal}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden relative animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Fixed Position */}
              <button
                onClick={closeDetailModal}
                className="absolute top-6 right-6 z-20 bg-white/95 dark:bg-slate-700/95 hover:bg-red-500 text-gray-700 dark:text-white hover:text-white rounded-full p-3 shadow-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90"
                aria-label="Close modal"
              >
                <span className="material-icons text-xl">close</span>
              </button>

              {detailLoading ? (
                <div className="flex items-center justify-center py-32">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-blue border-t-transparent mb-6"></div>
                    <p className="text-gray-600 dark:text-white text-lg font-medium">
                      Loading pet details...
                    </p>
                  </div>
                </div>
              ) : selectedPetDetails ? (
                <div className="overflow-y-auto max-h-[95vh] custom-scrollbar">
                  {/* Hero Section with Large Image */}
                  <div className="relative h-96 overflow-hidden">
                    <img
                      src={getImageUrl(selectedPetDetails.pet_info.image)}
                      alt={selectedPetDetails.pet_info.name}
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
                            {selectedPetDetails.pet_info.name}
                          </h1>
                          <div className="flex items-center gap-3">
                            <span className="px-5 py-2 bg-gradient-to-r from-primary-blue to-primary-teal text-white rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
                              <span className="material-icons text-lg">
                                pets
                              </span>
                              {selectedPetDetails.pet_info.type}
                            </span>
                            <span className="px-5 py-2 bg-white/20 backdrop-blur-md text-white rounded-full text-sm font-semibold shadow-xl">
                              {selectedPetDetails.pet_info.breed ||
                                "Mixed Breed"}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`px-6 py-3 rounded-2xl font-bold text-lg shadow-2xl backdrop-blur-md ${
                            selectedPetDetails.pet_info.status === "available"
                              ? "bg-green-500/90 text-white"
                              : selectedPetDetails.pet_info.status === "adopted"
                              ? "bg-blue-500/90 text-white"
                              : "bg-gray-500/90 text-white"
                          }`}
                        >
                          <span className="material-icons mr-2 align-middle">
                            {selectedPetDetails.pet_info.status === "available"
                              ? "check_circle"
                              : selectedPetDetails.pet_info.status === "adopted"
                              ? "favorite"
                              : "info"}
                          </span>
                          {selectedPetDetails.pet_info.status?.toUpperCase()}
                        </div>
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
                          {selectedPetDetails.pet_info.age ||
                            selectedPetDetails.pet_info.pet_age ||
                            "N/A"}
                          {(selectedPetDetails.pet_info.age ||
                            selectedPetDetails.pet_info.pet_age) && (
                            <span className="text-sm"> yrs</span>
                          )}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                        <span className="material-icons text-3xl mb-2 opacity-90">
                          {selectedPetDetails.pet_info.gender?.toLowerCase() ===
                          "male"
                            ? "male"
                            : "female"}
                        </span>
                        <p className="text-sm opacity-90 font-medium">Gender</p>
                        <p className="text-2xl font-bold capitalize">
                          {selectedPetDetails.pet_info.gender || "N/A"}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                        <span className="material-icons text-3xl mb-2 opacity-90">
                          palette
                        </span>
                        <p className="text-sm opacity-90 font-medium">Color</p>
                        <p className="text-2xl font-bold capitalize">
                          {selectedPetDetails.pet_info.colour || "N/A"}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                        <span className="material-icons text-3xl mb-2 opacity-90">
                          monitor_weight
                        </span>
                        <p className="text-sm opacity-90 font-medium">Weight</p>
                        <p className="text-2xl font-bold">
                          {selectedPetDetails.pet_info.weight ||
                            selectedPetDetails.pet_info.pet_weight ||
                            "N/A"}
                          {(selectedPetDetails.pet_info.weight ||
                            selectedPetDetails.pet_info.pet_weight) && (
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
                          About {selectedPetDetails.pet_info.name}
                        </h2>
                      </div>
                      <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-lg">
                        {selectedPetDetails.pet_info.description ||
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
                                {selectedPetDetails.pet_info.location ||
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
                                {selectedPetDetails.pet_info.city ||
                                  "Not specified"}
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
                                {selectedPetDetails.pet_info.state ||
                                  "Not specified"}
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
                                  selectedPetDetails.pet_info.is_vaccinated
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {selectedPetDetails.pet_info.is_vaccinated
                                  ? "verified"
                                  : "cancel"}
                              </span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                Vaccination
                              </span>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold ${
                                selectedPetDetails.pet_info.is_vaccinated
                                  ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                  : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100"
                              }`}
                            >
                              {selectedPetDetails.pet_info.is_vaccinated
                                ? "Complete"
                                : "Pending"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3">
                              <span
                                className={`material-icons ${
                                  !selectedPetDetails.pet_info.is_diseased
                                    ? "text-green-600"
                                    : "text-orange-600"
                                }`}
                              >
                                {!selectedPetDetails.pet_info.is_diseased
                                  ? "favorite"
                                  : "warning"}
                              </span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                Health
                              </span>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold ${
                                !selectedPetDetails.pet_info.is_diseased
                                  ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-100"
                              }`}
                            >
                              {!selectedPetDetails.pet_info.is_diseased
                                ? "Healthy"
                                : "Needs Care"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Medical History */}
                    {selectedPetDetails.medical_history && (
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 p-6 rounded-2xl shadow-lg border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="p-2 bg-indigo-500 rounded-xl">
                            <span className="material-icons text-white text-2xl">
                              medical_services
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            Detailed Medical History
                          </h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          {selectedPetDetails.medical_history.vaccine_name && (
                            <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-indigo-600 dark:text-indigo-400">
                                  vaccines
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
                                  Vaccine Name
                                </span>
                              </div>
                              <p className="text-gray-800 dark:text-white font-bold">
                                {
                                  selectedPetDetails.medical_history
                                    .vaccine_name
                                }
                              </p>
                            </div>
                          )}

                          {selectedPetDetails.medical_history
                            .last_vaccinated_date && (
                            <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-indigo-600 dark:text-indigo-400">
                                  event
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
                                  Last Vaccinated
                                </span>
                              </div>
                              <p className="text-gray-800 dark:text-white font-bold">
                                {new Date(
                                  selectedPetDetails.medical_history.last_vaccinated_date
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          )}

                          {selectedPetDetails.medical_history.disease_name && (
                            <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm md:col-span-2">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-orange-600 dark:text-orange-400">
                                  warning
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
                                  Disease/Condition
                                </span>
                              </div>
                              <p className="text-gray-800 dark:text-white font-bold mb-1">
                                {
                                  selectedPetDetails.medical_history
                                    .disease_name
                                }
                              </p>
                              {selectedPetDetails.medical_history.stage && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  Stage:{" "}
                                  <span className="font-semibold">
                                    {selectedPetDetails.medical_history.stage}
                                  </span>
                                </p>
                              )}
                            </div>
                          )}

                          {selectedPetDetails.medical_history
                            .treatment_name && (
                            <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm md:col-span-2">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-green-600 dark:text-green-400">
                                  healing
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
                                  Current Treatment
                                </span>
                              </div>
                              <p className="text-gray-800 dark:text-white font-bold">
                                {
                                  selectedPetDetails.medical_history
                                    .treatment_name
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                            #{selectedPetDetails.pet_info.id}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                            Listed Date
                          </p>
                          <p className="text-gray-800 dark:text-white font-bold">
                            {new Date(
                              selectedPetDetails.pet_info.created_at
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl">
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                            Total Reports
                          </p>
                          <p className="text-gray-800 dark:text-white font-bold">
                            {selectedPetDetails.total_reports || 0} Reports
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reports Section */}
                    {selectedPetDetails.reports &&
                      selectedPetDetails.reports.length > 0 && (
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-800/30 p-6 rounded-2xl shadow-lg border border-yellow-200 dark:border-yellow-700">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-yellow-500 rounded-xl">
                              <span className="material-icons text-white text-2xl">
                                report
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                              Recent Reports ({selectedPetDetails.total_reports}
                              )
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {selectedPetDetails.reports
                              .slice(0, 3)
                              .map((report) => (
                                <div
                                  key={report.id}
                                  className="bg-white dark:bg-slate-700 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                                        <span className="material-icons text-blue-600 dark:text-blue-400">
                                          person
                                        </span>
                                      </div>
                                      <span className="font-bold text-gray-800 dark:text-white">
                                        {report.user_name}
                                      </span>
                                    </div>
                                    <span
                                      className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                        report.report_status === "accepted"
                                          ? "bg-green-500 text-white"
                                          : report.report_status === "pending"
                                          ? "bg-yellow-500 text-white"
                                          : "bg-red-500 text-white"
                                      }`}
                                    >
                                      {report.report_status}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 dark:text-gray-200 mb-2 leading-relaxed">
                                    {report.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="material-icons text-sm">
                                      schedule
                                    </span>
                                    {new Date(
                                      report.created_at
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Action Buttons - Sticky Bottom */}
                    <div className="sticky bottom-0 bg-white dark:bg-slate-800 pt-6 pb-2 flex gap-4 border-t-2 border-gray-200 dark:border-slate-600">
                      <button
                        onClick={closeDetailModal}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <span className="material-icons">arrow_back</span>
                        Close
                      </button>
                      {selectedPetDetails.pet_info.status === "available" && (
                        <button
                          className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-blue to-primary-teal hover:from-blue-600 hover:to-teal-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                          onClick={() => {
                            closeDetailModal();
                            setActiveTab("adopt-pet");
                          }}
                        >
                          <span className="material-icons animate-pulse">
                            favorite
                          </span>
                          Adopt {selectedPetDetails.pet_info.name}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-32">
                  <div className="text-center">
                    <span className="material-icons text-6xl text-gray-400 dark:text-gray-600 mb-4">
                      pets
                    </span>
                    <p className="text-gray-600 dark:text-white text-lg">
                      No details available
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notification Detail Modal */}
        {showNotificationModal && selectedNotification && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-none z-[100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setShowNotificationModal(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-blue-200 dark:border-slate-600 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-primary-blue to-primary-teal p-6 border-b border-blue-200 dark:border-slate-600">
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
                          ? "bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-white"
                          : "bg-blue-500 dark:bg-blue-600 text-white"
                      }`}
                    >
                      {selectedNotification.is_read ? "Read" : "Unread"}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-slate-300">
                      {new Date(
                        selectedNotification.created_at
                      ).toLocaleString()}
                    </span>
                  </div>

                  {/* Notification Title (if exists) */}
                  {selectedNotification.title && (
                    <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-blue-200 dark:border-slate-500 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="material-icons text-primary-blue">
                          title
                        </span>
                        {selectedNotification.title}
                      </h3>
                    </div>
                  )}

                  {/* Notification Message */}
                  <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 border border-blue-200 dark:border-slate-500 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className="material-icons text-primary-blue text-sm">
                        message
                      </span>
                      Message
                    </h4>
                    <p className="text-gray-800 dark:text-white text-lg leading-relaxed whitespace-pre-wrap">
                      {selectedNotification.message}
                    </p>
                  </div>

                  {/* Additional Info (if exists) */}
                  {selectedNotification.notification_type && (
                    <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-teal-900 dark:to-blue-900 rounded-xl p-4 border border-blue-200 dark:border-teal-700">
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-primary-blue">
                          info
                        </span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-white">
                          Type:
                        </span>
                        <span className="text-sm text-gray-600 dark:text-slate-200">
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

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-900 to-teal-900 dark:from-gray-900 dark:to-gray-800 text-white py-12 px-6 mt-10">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-2">
            <span className="text-white">pet</span>
            <span className="text-blue-300 dark:text-blue-400">rescue</span>
          </h3>
          <p className="text-blue-200 dark:text-blue-300 mb-6">
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

export default UserDashboard;
