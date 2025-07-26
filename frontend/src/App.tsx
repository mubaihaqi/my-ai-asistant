import { useState, useEffect, useCallback } from "react";
import AuthModal from "./components/AuthModal";
import PersonalInfoPopup from "./components/PersonalInfoPopup";
import ChatHeader from "./components/ChatHeader";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "./components/ChatInput";
import { useWebSocket } from "./hooks/useWebSocket";
import { authService, chatService } from "./services/api";
import { useIdleTimer } from "./utils/idleTimer";
import type {
  AuthStatus,
  Message,
  ImageState,
  WebSocketMessage,
} from "./types";

// Komponen utama aplikasi chat
function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("pending");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<
    string | null
  >(null);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [image, setImage] = useState<ImageState>({
    base64: null,
    file: null,
    mimeType: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] =
    useState<boolean>(true);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [idleCount, setIdleCount] = useState(0);

  // Nama user yang diizinkan untuk chat dengan AI
  const USER_NAME = "Muhammad Umar Baihaqi";

  // Custom hooks
  const { resetIdleTimer, clearIdleTimer } = useIdleTimer(
    idleCount,
    setIdleCount
  );

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (data: unknown) => {
      const wsMessage = data as WebSocketMessage;
      if (wsMessage.type === "proactive_message") {
        if (wsMessage.message && wsMessage.message.trim() !== "") {
          setMessages((prev) => [
            ...prev,
            { text: wsMessage.message, sender: "ai" },
          ]);
          setShouldScrollToBottom(true);
          resetIdleTimer();
          setIdleCount(0);
        }
      }
    },
    [resetIdleTimer, setIdleCount]
  );

  // WebSocket hooks
  useWebSocket({
    onMessage: handleWebSocketMessage,
    onOpen: () => {
      resetIdleTimer();
      setIdleCount(0);
    },
    onClose: clearIdleTimer,
  });

  // Token verification effect
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const response = await authService.verifyToken(token);
          if (response.valid) {
            setAuthStatus("authenticated");
          } else {
            setAuthStatus("unauthenticated");
            localStorage.removeItem("authToken");
          }
        } catch (error) {
          console.error("Token verification failed", error);
          setAuthStatus("unauthenticated");
          localStorage.removeItem("authToken");
        }
      } else {
        setAuthStatus("unauthenticated");
      }
    };

    // Delay initial verification to allow server to start
    const timer = setTimeout(verifyToken, 1000);
    const intervalId = setInterval(verifyToken, 10800000); // Check every 3 hours
    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, []);

  // Fetch messages effect
  const fetchMessages = useCallback(
    async (beforeTimestamp: string | null = null) => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const fetchedMessages = await chatService.getChatHistory(
          20,
          beforeTimestamp ?? undefined
        );

        const filteredMessages: Message[] = fetchedMessages
          .filter((msg: Message) => msg !== null && msg !== undefined)
          .map((msg: Message) => ({
            text: msg.text,
            sender: msg.sender,
            created_at: msg.created_at,
            imageUrl: msg.imageUrl,
          }));

        if (filteredMessages.length < 20) {
          setHasMoreMessages(false);
        } else {
          setHasMoreMessages(true);
        }

        if (filteredMessages.length > 0) {
          const newOldestTimestamp =
            filteredMessages[filteredMessages.length - 1].created_at || null;
          setOldestMessageTimestamp(newOldestTimestamp);
        } else {
          setOldestMessageTimestamp(null);
        }

        const newMessages = filteredMessages.reverse();
        setMessages((prevMessages) => [...newMessages, ...prevMessages]);
        setShouldScrollToBottom(false);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setHasMoreMessages(false);
        setOldestMessageTimestamp(null);
      }
    },
    []
  );

  // Load initial messages
  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchMessages();
    }
  }, [authStatus, fetchMessages]);

  // Load more messages function
  const loadMoreMessages = () => {
    if (hasMoreMessages && oldestMessageTimestamp) {
      fetchMessages(oldestMessageTimestamp);
    }
  };

  // Send message function
  const sendMessage = async () => {
    if ((inputMessage.trim() === "" && !image.base64) || isLoading) return;

    const userMessage: Message = {
      text: inputMessage,
      sender: "user",
      ...(image.base64 && {
        imageUrl: `data:${image.mimeType || "image/jpeg"};base64,${
          image.base64
        }`,
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    const imageToSend = image.base64;
    const mimeTypeToSend = image.mimeType;
    setImage({ base64: null, file: null, mimeType: null });
    setIsLoading(true);
    setShouldScrollToBottom(true);

    try {
      const response = await chatService.sendMessage(
        inputMessage,
        USER_NAME,
        imageToSend,
        mimeTypeToSend
      );
      const aiReply = response.reply;

      if (aiReply && aiReply.trim() !== "") {
        setMessages((prev) => [...prev, { text: aiReply, sender: "ai" }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage = "Sorry, something went wrong while contacting the AI.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { error?: string } };
        };
        errorMessage = `Error: ${
          axiosError.response?.data?.error ||
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
      resetIdleTimer();
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
    return (
      <AuthModal
        onAuthSuccess={() => {
          setAuthStatus("authenticated");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen font-sans antialiased bg-gray-900 text-gray-100">
      {/* Background video dan efek blur */}
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
          image={image}
          setImage={setImage}
        />
      </div>
      <PersonalInfoPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />
    </div>
  );
}

export default App;
