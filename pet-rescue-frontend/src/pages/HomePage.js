import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BibiChatbot from "../components/BibiChatbot";
const API_BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : "http://localhost:8000/api";

const IMPACT_METRICS = [
  { value: "45K+", label: "Pets Reunited", icon: "home" },
  { value: "98%", label: "Success Rate", icon: "check_circle" },
  { value: "8K+", label: "Adoptions Facilitated", icon: "volunteer_activism" },
];

function HomePage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [file, setFile] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };
  const fetchFeedback = async () => {
    setLoading(true);
    try {
      // ⚠️ REPLACE '/api/feedback' WITH YOUR ACTUAL API URL ⚠️
      const response = await fetch(`${API_BASE}/feedbacks/`);
      if (!response.ok) {
        throw new Error("Failed to fetch feedback.");
      }
      const data = await response.json();
      // Sort by creation date (newest first)
      setFeedbacks(
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      );
      setError(null);
    } catch (err) {
      console.error("Feedback fetch error:", err);
      setError("Could not load community feedback.");
    } finally {
      setLoading(false);
    }
  };

  // Run the fetch when the component mounts
  useEffect(() => {
    fetchFeedback();
  }, []);
  // Collapsible sections state
  const [name, setName] = useState("");
  const [expandedSection, setExpandedSection] = useState("lostReports");
  const [message, setMessage] = useState("");
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

      const res = await fetch(`${API_BASE}/feedbacks/`, {
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
      document.getElementById("feedback-file-input").value = "";
    } catch (err) {
      console.error(err);
      setError(err.message || "Error sending feedback");
    } finally {
      setSubmitting(false);
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Hero Section with Dog Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden w-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=2070')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-purple-800/90 to-indigo-900/95"></div>
        </div>

        <div className="relative z-10 w-full max-w-full sm:max-w-6xl mx-auto text-center px-2 sm:px-6">
          <h1 className="text-7xl md:text-8xl font-black mb-4">
            <span className="text-white">pet</span>
            <span className="text-purple-300">rescue</span>
          </h1>

          <p className="text-xl md:text-2xl mb-4 text-purple-100 max-w-3xl mx-auto font-medium">
            {/* Make a pet happy! 🐾🏠 */}
          </p>
          <p className="text-lg md:text-xl mb-12 text-purple-200 max-w-3xl mx-auto">
            {/* Follow the cases below and see which ones are available for
            adoption. */}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-block bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:from-purple-600 hover:to-purple-800 hover:scale-105 transform transition duration-300"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="inline-block bg-white text-purple-900 font-bold py-4 px-10 rounded-full shadow-lg hover:bg-purple-50 hover:scale-105 transform transition duration-300"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-purple-50 to-transparent"></div>
      </section>

      {/* Impact Metrics Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700">
        <div className="w-full max-w-full sm:max-w-6xl mx-auto px-2 sm:px-6">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Our Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {IMPACT_METRICS.map((metric, index) => (
              <div
                key={index}
                className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 text-center shadow-xl hover:scale-105 transform transition duration-300 border border-white border-opacity-20"
              >
                <span className="material-icons text-6xl text-purple-200 mb-4">
                  {metric.icon}
                </span>
                <h3 className="text-5xl font-extrabold text-white mb-2">
                  {metric.value}
                </h3>
                <p className="text-lg text-purple-100 opacity-90">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-purple-50">
        <div className="w-full max-w-full sm:max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-purple-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:-translate-y-2 transition duration-300 border-2 border-purple-100">
              <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="material-icons text-white text-3xl">pets</span>
              </div>
              <h3 className="text-2xl font-bold text-purple-900 mb-4">
                Report Lost Pets
              </h3>
              <p className="text-gray-600">
                Quickly report your lost pet with detailed information and
                photos to help reunite faster.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:-translate-y-2 transition duration-300 border-2 border-purple-100">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="material-icons text-white text-3xl">
                  search
                </span>
              </div>
              <h3 className="text-2xl font-bold text-purple-900 mb-4">
                Report Found Pets
              </h3>
              <p className="text-gray-600">
                Found a stray? Report it on our platform and help reunite pets
                with their families.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transform hover:-translate-y-2 transition duration-300 border-2 border-purple-100">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="material-icons text-white text-3xl">
                  volunteer_activism
                </span>
              </div>
              <h3 className="text-2xl font-bold text-purple-900 mb-4">
                Adopt a Pet
              </h3>
              <p className="text-gray-600">
                Browse available pets for adoption and give them a loving
                forever home.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-100 to-indigo-100">
        <div className="w-full max-w-full sm:max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-purple-900 text-center mb-12">
            We Would Love to Hear From You
          </h2>

          {isLoggedIn ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border-2 border-purple-100">
              {error && (
                <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-xl mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border-2 border-green-300 text-green-800 px-4 py-3 rounded-xl mb-4">
                  {success}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="bg-gray-50 p-6 rounded-lg shadow mb-6"
              >
                {error && (
                  <div className="text-sm text-red-600 mb-3">{error}</div>
                )}
                <div className="mb-6">
                  <label className="block text-purple-900 font-semibold mb-2">
                    Upload Image (optional)
                  </label>
                  <input
                    id="feedback-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <input
                    className="sm:col-span-1 p-2 rounded border"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <textarea
                    className="sm:col-span-2 p-2 rounded border resize-y min-h-[100px]"
                    placeholder="Write your feedback..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-900 text-white rounded hover:bg-purple-700"
                    disabled={submitting}
                  >
                    {submitting ? "Sending..." : "Send Feedback"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
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
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border-2 border-purple-100 text-center">
              <p className="text-purple-900 text-lg font-semibold mb-4">
                Please{" "}
                <Link to="/login" className="text-purple-600 underline">
                  login
                </Link>{" "}
                to submit feedback.
              </p>
            </div>
          )}

          {/* {feedbacks.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold text-purple-900 mb-6">
                Recent Feedback
              </h3>
              <div className="space-y-4">
                {feedbacks.slice(0, 5).map((feedback) => (
                  <div
                    key={feedback.id}
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 border border-purple-100"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-purple-900">
                          {feedback.name}
                        </h4>
                        <p className="text-sm text-purple-600">
                          {feedback.email}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(feedback.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700">{feedback.message}</p>
                    {feedback.image && (
    <img
      src={feedback.image}
      alt="Feedback attachment"
      className="mt-3 rounded-xl max-h-60 object-cover border border-purple-200"
    />
  )}
                  </div>
      
                ))}
              </div>
            </div>
          )} */}
          {/* List */}
          <div className="text-gray-900 dark:text-gray-200">
            {loading ? (
              <div className="text-center py-8">Loading feedback…</div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No feedback yet — be the first!
              </div>
            ) : (
              <ul className="space-y-4">
                {feedbacks.map((f) => {
                  // Compute message display logic for each feedback
                  const messageTooLong = f.message && f.message.length > 120;
                  const isExpanded = expandedItems[f.id] || false;
                  const displayMessage = isExpanded
                    ? f.message
                    : messageTooLong
                    ? f.message.slice(0, 120) + "..."
                    : f.message;

                  return (
                    <li
                      key={f.id}
                      className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 border border-purple-100 dark:border-slate-700"
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
                              {f.name ? f.name.charAt(0).toUpperCase() : "A"}
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-purple-900 dark:text-purple-400">
                              {f.name || "Anonymous"}
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(f.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Message with read more toggle */}
                      <p className="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-line">
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
                          className="mt-2 text-sm text-purple-700 hover:underline"
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
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white py-12 px-6">
        <div className="w-full max-w-full sm:max-w-6xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-2">
            <span className="text-white">pet</span>
            <span className="text-purple-300">rescue</span>
          </h3>
          <p className="text-purple-200 mb-6">
            Connecting lost pets with their families and finding homes for those
            in need.
          </p>
          <div className="flex justify-center space-x-6">
            <Link
              to="/about"
              className="hover:text-yellow-400 transition duration-300"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="hover:text-yellow-400 transition duration-300"
            >
              Contact
            </Link>
            <Link
              to="/privacy"
              className="hover:text-yellow-400 transition duration-300"
            >
              Privacy Policy
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-6">
            2024 Pet Rescue. All rights reserved.
          </p>
        </div>
      </footer>
      {/* Bibi Chatbot Component */}
      <div className="fixed bottom-6 right-6 z-50">
        <BibiChatbot />
      </div>
    </div>
  );
}

export default HomePage;
