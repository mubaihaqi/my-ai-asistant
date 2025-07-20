import React, { useState, useEffect } from "react";
import axios from "axios";
import AuthModal from "./components/AuthModal";
import PersonalInfoPopup from "./components/PersonalInfoPopup";
import ChatHeader from "./components/ChatHeader";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";

// Tipe pengirim pesan, bisa user atau AI
type Sender = "user" | "ai";

// Komponen utama aplikasi chat
function App() {
  const [authStatus, setAuthStatus] = useState<
    "pending" | "authenticated" | "unauthenticated"
  >("pending");
  // State untuk menyimpan daftar pesan chat
  const [messages, setMessages] = useState<{ text: string; sender: Sender }[]>(
    []
  );
  // State untuk input pesan user
  const [inputMessage, setInputMessage] = useState<string>("");
  // State untuk status loading saat menunggu balasan AI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State untuk popup personalia
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

  // Nama user yang diizinkan untuk chat dengan AI
  const USER_NAME = "Muhammad Umar Baihaqi";

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("authToken");
      console.log("Verifying token... Token found:", !!token);
      if (token) {
        try {
          const response = await axios.post(
            "http://localhost:3000/api/verify-token",
            { token }
          );
          if (response.data.valid) {
            setAuthStatus("authenticated");
            console.log("Token valid. Auth status: authenticated");
          } else {
            setAuthStatus("unauthenticated");
            localStorage.removeItem("authToken");
            console.log("Token invalid. Auth status: unauthenticated");
          }
        } catch (error) {
          console.error("Token verification failed", error);
          setAuthStatus("unauthenticated");
          localStorage.removeItem("authToken");
          console.log(
            "Token verification failed. Auth status: unauthenticated"
          );
        }
      } else {
        setAuthStatus("unauthenticated");
        console.log("No token found. Auth status: unauthenticated");
      }
    };

    // Initial verification
    verifyToken();

    // Set up interval for periodic verification
    const intervalId = setInterval(verifyToken, 10800000); // Check every 3 hours

    // Cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  

  // Fungsi untuk mengirim pesan user ke backend dan menerima balasan AI
  const sendMessage = async () => {
    if (inputMessage.trim() === "" || isLoading) return;

    const userMessage = { text: inputMessage, sender: "user" as Sender };
    // Menambahkan pesan user ke state, menjaga pesan AI yang sedang diketik
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.post(
        "http://localhost:3000/api/chat",
        {
          message: inputMessage,
          userName: USER_NAME,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const aiReply = response.data.reply;
      setMessages((prev) => [...prev, { text: aiReply, sender: "ai" }]);
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage = "Sorry, something went wrong while contacting the AI.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = `Error: ${
          error.response.data.error ||
          "There was an issue with the backend server."
        }`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      setMessages((prev) => [...prev, { text: errorMessage, sender: "ai" }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (authStatus === "pending") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return <AuthModal onAuthSuccess={() => setAuthStatus("authenticated")} />;
  }

  // Render tampilan utama aplikasi chat
  return (
    <div className="flex flex-col h-screen font-sans antialiased bg-gray-900 text-gray-100">
      {/* Background gambar dan efek blur */}
      <video
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/totoro.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

      {/* Konten utama aplikasi */}
      <div className="relative z-10 flex flex-col h-full">
        <ChatHeader onHeaderClick={() => setIsPopupOpen(true)} />
        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          sendMessage={sendMessage}
          isLoading={isLoading}
        />
      </div>
      <PersonalInfoPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />
    </div>
  );
}

// Ekspor komponen utama
export default App;
