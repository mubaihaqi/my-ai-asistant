import React, { useRef, useEffect, useLayoutEffect, useState } from "react";

type Sender = "user" | "ai";

interface ChatMessagesProps {
  messages: {
    text: string;
    sender: Sender;
    created_at?: string;
    imageUrl?: string; // Tambahkan imageUrl
  }[];
  isLoading: boolean;
  loadMoreMessages: () => void;
  hasMoreMessages: boolean;
  shouldScrollToBottom: boolean; // Add new prop
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  loadMoreMessages,
  hasMoreMessages,
  shouldScrollToBottom,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);

  useLayoutEffect(() => {
    if (shouldScrollToBottom && chatEndRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isLoading, shouldScrollToBottom]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop <= 5 && hasMoreMessages && !isLoading) {
        setShowLoadMoreButton(true);
      } else {
        setShowLoadMoreButton(false);
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [hasMoreMessages, isLoading]);

  return (
    <main
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
    >
      {showLoadMoreButton && hasMoreMessages && !isLoading && (
        <div className="text-center mb-4">
          <button
            onClick={loadMoreMessages}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Load More Messages
          </button>
        </div>
      )}

      {isLoading && !showLoadMoreButton && (
        <div className="text-center text-gray-400 text-sm mb-4">
          Loading messages...
        </div>
      )}
      {!hasMoreMessages && messages.length > 0 && (
        <div className="text-center text-gray-400 text-sm mb-4">
          No more messages.
        </div>
      )}

      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-end gap-3 w-full ${
            msg.sender === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-xs sm:max-w-md md:max-w-lg rounded-2xl shadow-md transition-all duration-300 ${
              msg.sender === "user"
                ? "bg-indigo-700 text-white rounded-br-lg"
                : "bg-gray-800 text-gray-200 rounded-bl-lg"
            } ${
              !msg.text && msg.imageUrl ? "p-0" : "p-3 px-4" // Hapus padding jika hanya ada gambar
            }`}
          >
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="User upload"
                className="rounded-2xl max-w-full h-auto"
              />
            )}
            {msg.text && (
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex items-end gap-3 justify-start">
          <div className="max-w-sm p-4 rounded-2xl rounded-bl-lg bg-gray-800">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </main>
  );
};

export default ChatMessages;
