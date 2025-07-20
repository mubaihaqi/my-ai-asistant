import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AuthModal from "./components/AuthModal";
import PersonalInfoPopup from "./components/PersonalInfoPopup";
import ChatHeader from "./components/ChatHeader";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";

// Tipe pengirim pesan, bisa user atau AI
type Sender = "user" | "ai";

interface Message {
  text: string;
  sender: Sender;
  created_at?: string; // Tambahkan created_at
}

// Komponen utama aplikasi chat
function App() {
  const [authStatus, setAuthStatus] = useState<
    "pending" | "authenticated" | "unauthenticated"
  >("pending");
  console.log("[App.tsx Render] App component rendering. Current authStatus:", authStatus);
  // State untuk menyimpan daftar pesan chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<
    string | null
  >(null);
  // State untuk input pesan user
  const [inputMessage, setInputMessage] = useState<string>("");
  // State untuk status loading saat menunggu balasan AI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState<boolean>(true); // New state for scroll control
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
    console.log("[App.tsx verifyToken useEffect] Initial verification triggered.");
    verifyToken();

    // Set up interval for periodic verification
    const intervalId = setInterval(verifyToken, 10800000); // Check every 3 hours

    // Cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Fungsi untuk memuat pesan dari backend
  const fetchMessages = useCallback(async (beforeTimestamp: string | null = null) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.warn("No auth token found. Cannot fetch messages.");
        return;
      }

      let url = `http://localhost:3000/api/chat-history?limit=20`;
      if (beforeTimestamp) {
        url += `&before=${beforeTimestamp}`;
      }

      console.log(`[fetchMessages] Requesting URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const fetchedMessages: Message[] = response.data
        .filter((msg: Message) => msg !== null && msg !== undefined)
        .map((msg: Message) => ({
          text: msg.text,
          sender: msg.sender,
          created_at: msg.created_at,
        }));

      console.log(
        `[fetchMessages] Fetched ${fetchedMessages.length} messages.`
      );

      if (fetchedMessages.length < 20) {
        setHasMoreMessages(false);
        console.log("[fetchMessages] Setting hasMoreMessages to false.");
      } else {
        setHasMoreMessages(true); // Ensure it's true if 20 messages are returned
        console.log("[fetchMessages] Setting hasMoreMessages to true.");
      }

      if (fetchedMessages.length > 0) {
        const newOldestTimestamp =
          fetchedMessages[fetchedMessages.length - 1].created_at || null;
        setOldestMessageTimestamp(newOldestTimestamp);
        console.log(
          `[fetchMessages] Oldest message timestamp updated to: ${newOldestTimestamp}`
        );
      } else {
        setOldestMessageTimestamp(null);
        console.log(
          "[fetchMessages] No messages fetched, oldestMessageTimestamp set to null."
        );
      }

      // Add new messages to the beginning of the messages array, ensuring chronological order
      const newMessages = (fetchedMessages || []).reverse(); // Keep newMessages for clarity if needed later
      console.log("New messages to be added (reversed):", newMessages); // Log newMessages
      setMessages((prevMessages) => [...newMessages, ...prevMessages]);
      setShouldScrollToBottom(false); // Don't scroll to bottom when loading old messages
    } catch (error) {
      console.error("Error fetching messages:", error);
      setHasMoreMessages(false); // Set to false on error to prevent infinite loading attempts
      setOldestMessageTimestamp(null); // Clear timestamp on error
    }
  }, [setMessages, setHasMoreMessages, setOldestMessageTimestamp]); // Removed messages.length from dependencies

  // Pemuatan pesan awal saat komponen dimuat
  useEffect(() => {
    console.log("[App.tsx useEffect] authStatus:", authStatus);
    if (authStatus === "authenticated") {
      // Muat pesan terbaru saat aplikasi dimuat
      console.log("[App.tsx useEffect] Calling fetchMessages for initial load.");
      fetchMessages();
    }
  }, [authStatus, fetchMessages]);

  // Fungsi untuk memuat pesan lebih lama (saat scroll ke atas)
  const loadMoreMessages = () => {
    console.log("loadMoreMessages called.");
    if (hasMoreMessages && oldestMessageTimestamp) {
      console.log("Fetching more messages before:", oldestMessageTimestamp);
      fetchMessages(oldestMessageTimestamp);
    }
  };

  // Fungsi untuk mengirim pesan user ke backend dan menerima balasan AI
  const sendMessage = async () => {
    if (inputMessage.trim() === "" || isLoading) return;

    const userMessage = { text: inputMessage, sender: "user" as Sender };
    // Menambahkan pesan user ke state, menjaga pesan AI yang sedang diketik
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setShouldScrollToBottom(true); // Scroll to bottom when sending new message

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
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: "ai",
          created_at: new Date().toISOString(),
        },
      ]);
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
    return <AuthModal onAuthSuccess={() => {
      setAuthStatus("authenticated");
      console.log("[App.tsx AuthModal] onAuthSuccess called. Auth status set to authenticated.");
    }} />;
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
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          loadMoreMessages={loadMoreMessages}
          hasMoreMessages={hasMoreMessages}
          shouldScrollToBottom={shouldScrollToBottom}
        />
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