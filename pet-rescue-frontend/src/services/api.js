import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Public API instance (no authentication required)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");

        if (refreshToken) {
          // Try to refresh the token
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem("access_token", newAccessToken);

          // Update the authorization header with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          // Retry the original request with new token
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token is invalid or expired, redirect to login
        console.error("Token refresh failed:", refreshError);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // If not 401 or refresh failed, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post("/login/", credentials),
  register: (userData) => api.post("/register/", userData),
  refreshToken: (refreshToken) =>
    api.post("/token/refresh/", { refresh: refreshToken }),
};

export const petsAPI = {
  getLostPets: () => api.get("/lost_pets/"),
  getFoundPets: () => api.get("/found_pets/"),
  searchLostPets: (params) => api.get("/search_lost/", { params }),
  reportLostPet: (petData) => api.post("/report_lost/", petData),
  reportFoundPet: (petData) => api.post("/report_found/", petData),
  adoptPet: (petId, adoptionData) =>
    api.post(`/pets/${petId}/adopt/`, adoptionData),
  // New unified pet request form API
  submitPetRequest: (petData) => api.post("/pet/pet-request-form/", petData),
  // Submit pet request with image upload
  submitPetRequestWithImage: async (formData) => {
    // Use native fetch API for file uploads to avoid axios issues
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${API_BASE_URL}/pet/pet-request-form/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type - let browser set it with boundary
        },
        body: formData,
      });

      const data = await response.json();
      return { data }; // Return in axios-like format for compatibility
    } catch (error) {
      throw error;
    }
  },
  // New APIs
  getAdminPets: (tab) => api.get(`/pets/all/?tab=${tab}`),
  updatePet: (petId, data) => api.patch(`/pets/${petId}/`, data),
  deletePet: (petId) => api.delete(`/pets/${petId}/`),

  // ========== NEWLY ADDED MISSING APIs ==========
  // Get pet details by ID
  getPetDetails: (petId) => api.get(`/pet/details/${petId}/`),

  // Search functionality
  searchPets: (query) => api.get("/search/", { params: query }),
  enhancedSearch: (query) => api.get("/enhanced_search/", { params: query }),

  // Rescue report
  submitRescueReport: (reportData) =>
    api.post("/submit_rescue_report/", reportData),

  // Adoption requests
  requestAdoption: (adoptionData) =>
    api.post("/request_adoption/", adoptionData),
  requestAdoptionEnhanced: (adoptionData) =>
    api.post("/request_adoption_enhanced/", adoptionData),

  // Post pet for adoption (with image upload support using fetch API)
  postPetForAdoption: async (formData) => {
    // Use native fetch API for file uploads (same as submitPetRequestWithImage)
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${API_BASE_URL}/post_pet_for_adoption/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();
      return { data }; // Return in axios-like format for compatibility
    } catch (error) {
      throw error;
    }
  },
  getMyAdoptionPosts: () => api.get("/my_adoption_posts/"),

  // Get my adoption requests
  getMyAdoptionRequests: () => api.get("/my_adoption_requests/"),
  cancelAdoptionRequest: (requestId) =>
    api.delete(`/adoption_request/${requestId}/`),
};

export const userAPI = {
  getUserReports: () => api.get("/user_reports/"),
  getUserAdoptions: () => api.get("/user_adoptions/"),
  getUserNotifications: () => api.get("/user_notifications/"),
  getAllLostReports: () => publicApi.get("/all_lost_reports/"),
  getAvailableAdoptionPets: () => publicApi.get("/available_adoption_pets/"),
  getUserDetails: () => api.get("/user-details/"),
  updateProfile: (formData) => {
    return axios
      .create({
        baseURL: "http://localhost:8000/api",
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      })
      .patch("/user-profile/update/", formData);
  },
  deactivateProfile: (userId) =>
    api.patch("/user-profile/deactivate/", userId ? { user_id: userId } : {}),
  forgotPassword: (email, password, confirmPassword) =>
    publicApi.post("/forgot-password/", {
      email,
      password,
      confirm_password: confirmPassword,
    }),
  postUserStory: (content, petId) =>
    api.post("/user-stories/", { content, pet_id: petId }),
  getUserStories: () => api.get("/user-stories/"),
  addFavouritePet: (petId) => api.post("/pets/favourites/", { pet_id: petId }),
  getFavouritePets: () => api.get("/pets/favourites/"),
  removeFavouritePet: (favouriteId) =>
    api.delete("/pets/favourites/", { data: { favourite_id: favouriteId } }),
  markNotificationRead: (notificationId) =>
    api.post(`/notification/read/${notificationId}/`),
  markAllNotificationsRead: () => api.patch("/notifications/mark-all-read/"),
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}/`),
  deleteReport: (reportId) => api.delete(`/reports/${reportId}/`),
  updateReportStatus: (reportId, status) =>
    api.patch(`/reports/${reportId}/status/`, { status }),

  // ========== NEWLY ADDED MISSING APIs ==========
  // User profile management
  getUserProfile: () => api.get("/profile/"),
  getAdoptionHistory: () => api.get("/adoption_history/"),
  getReportsHistory: () => api.get("/reports_history/"),
  cancelAdoption: (adoptionId) => api.post(`/cancel_adoption/${adoptionId}/`),

  // Notification count
  getUnreadNotificationsCount: () => api.get("/notifications/count/"),

  // Reunification system
  checkReunification: (petData) => api.post("/reunification/", petData),
  markPetReunited: (reunificationData) =>
    api.post("/reunification/mark_reunited/", reunificationData),
};

export const adminAPI = {
  getNotifications: () => api.get("/admin/notifications/"),
  markNotificationRead: (notificationId) => {
    console.log(
      "AdminAPI: Calling POST /notification/read/" + notificationId + "/"
    );
    return api.post(`/notification/read/${notificationId}/`);
  },
  getDashboardMetrics: () => api.get("/admin/dashboard/"),

  // Get all pending reports
  getPendingReports: () => api.get("/admin/pending_reports/"),

  // ========== NEWLY ADDED MISSING ADMIN APIs ==========
  // Report management (CRITICAL for notification flow!)
  approveReport: (reportId) => api.post(`/admin/approve_report/${reportId}/`),
  rejectReport: (reportId) => api.post(`/admin/reject_report/${reportId}/`),

  // Adoption management
  approveAdoption: (adoptionId) =>
    api.post(`/admin/approve_adoption/${adoptionId}/`),
  rejectAdoption: (adoptionId) =>
    api.post(`/admin/reject_adoption/${adoptionId}/`),

  // Pet availability management
  markPetAvailableForAdoption: (reportId) =>
    api.post(`/admin/mark_available_for_adoption/${reportId}/`),
  filterAdoptionRequests: (filters) =>
    api.get("/admin/filter_adoptions/", { params: filters }),

  // Dashboard and statistics
  getDashboardStats: () => api.get("/admin/stats/"),

  // User management
  getUserManagement: () => api.get("/admin/users/"),
  toggleUserStatus: (userId) => api.post(`/admin/toggle_user/${userId}/`),

  // Pet management
  getPetManagement: () => api.get("/admin/pets/"),

  // Bulk operations
  bulkApproveReports: (reportIds) =>
    api.post("/admin/bulk_approve_reports/", { report_ids: reportIds }),
  bulkRejectReports: (reportIds) =>
    api.post("/admin/bulk_reject_reports/", { report_ids: reportIds }),
  bulkApproveAdoptions: (adoptionIds) =>
    api.post("/admin/bulk_approve_adoptions/", { adoption_ids: adoptionIds }),
  bulkRejectAdoptions: (adoptionIds) =>
    api.post("/admin/bulk_reject_adoptions/", { adoption_ids: adoptionIds }),

  // Adoption post management
  getPendingAdoptionPosts: () => api.get("/pending_adoption_posts/"),
  reviewAdoptionPost: (reportId, action, comment) =>
    api.post(`/review_adoption_post/${reportId}/`, { action, comment }),

  // ========== NEW COMPREHENSIVE ADMIN APIs ==========
  // Enhanced dashboard stats
  getComprehensiveDashboardStats: () => api.get("/admin/dashboard_stats/"),

  // Get all pets by status (lost, found, adopted, available, all)
  getAllPetsByStatus: (status = "all") =>
    api.get("/admin/pets_by_status/", { params: { status } }),

  // Get all reports by status and type
  getAllReportsByStatus: (report_status = "all", type = "all") =>
    api.get("/admin/reports_by_status/", { params: { report_status, type } }),

  // Get pending adoption posts (user-posted pets for adoption)
  getPendingAdoptionPostsNew: () => api.get("/admin/pending_adoption_posts/"),

  // Get ALL adoption posts (pending, accepted, rejected)
  getAllAdoptionPosts: (status = "all") =>
    api.get("/admin/all_adoption_posts/", { params: { status } }),

  // Search pets with filters
  searchPets: (filters) => api.get("/admin/search_pets/", { params: filters }),
};

export default api;
