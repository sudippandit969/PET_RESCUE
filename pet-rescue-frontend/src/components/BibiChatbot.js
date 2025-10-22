// src/components/BibiChatbot.js
import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BibiChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hi there! 🤖 I'm Bibi, your friendly chatbot!" },
  ]);
  const [chatInput, setChatInput] = useState("");

  const toggleChat = () => setIsOpen(!isOpen);

  const handleChatSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage = { sender: "user", text: chatInput };
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");

    setTimeout(() => {
      const replies = [
  "That's interesting! 😊",
  "Tell me more about it!",
  "I'm always here to chat 💬",
  "Sounds great!",
  "This app helps connect people with rescue pets 🐾",
  "You can browse pets, share feedback, and even post adoption stories!",
  "Need help finding a pet? I’ve got you covered 🐶🐱",
  "Want to know how adoption works? Just ask!",
  "Looking to volunteer or donate? I can guide you!",
  "You can post feedback or see what others are saying 💬",
  "Check your dashboard to view your posts and saved pets!",
  "Curious about how to update your profile? I can help!",
  "Lost a pet? Let’s get the word out together 🆘",
  "Want to share your adoption story? I’d love to hear it!",
  "Need help navigating the site? I’m here for that too!",
  "You can explore pet profiles and filter by age, breed, or location 🐕",
  "Looking for pets with special needs? I can help highlight them 💛",
  "Want to see your feedback posts? Head to your dashboard!",
  "Need to contact the rescue team? I’ll show you how 📞",
  "Just here to chat? I’m all ears 😊",
];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setChatMessages((prev) => [...prev, { sender: "bot", text: reply }]);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chatbot Button */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all flex items-center justify-center"
      >
        <MessageCircle size={28} />
      </motion.button>

      {/* Chatbox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <span className="font-semibold">Bibi Chatbot</span>
              </div>
              <button onClick={toggleChat} className="text-white text-lg">
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto max-h-60 space-y-2">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-sm max-w-[80%] ${
                    msg.sender === "bot"
                      ? "bg-purple-100 text-purple-900 self-start"
                      : "bg-blue-100 text-blue-900 self-end ml-auto"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleChatSend} className="p-3 border-t bg-gray-50 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
              />
              <button
                type="submit"
                className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BibiChatbot;
