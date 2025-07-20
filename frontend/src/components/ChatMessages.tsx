import React, { useRef, useEffect, useLayoutEffect } from "react";

type Sender = "user" | "ai";

interface ChatMessagesProps {
  messages: { text: string; sender: Sender; created_at?: string }[];
  isLoading: boolean;
  loadMoreMessages: () => void;
  hasMoreMessages: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  loadMoreMessages,
  hasMoreMessages,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const firstMessageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Scroll to bottom only when new messages are added (i.e., messages.length increases)
    // or when isLoading changes (e.g., AI response arrives)
    if (
      messages.length > 0 &&
      (messages[messages.length - 1]?.sender === "user" ||
        messages[messages.length - 1]?.sender === "ai")
    ) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    const currentFirstMessageRef = firstMessageRef.current;
    if (!currentFirstMessageRef || !hasMoreMessages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log(
            "IntersectionObserver triggered! Loading more messages..."
          );
          loadMoreMessages();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentFirstMessageRef);

    return () => {
      if (currentFirstMessageRef) {
        observer.unobserve(currentFirstMessageRef);
      }
    };
  }, [hasMoreMessages, loadMoreMessages]);

  return (
    <main
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
    >
      {hasMoreMessages && (
        <div className="text-center text-gray-400 text-sm mb-4">
          Loading more messages...
        </div>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          ref={index === 0 ? firstMessageRef : null} // Attach ref to the first message
          className={`flex items-end gap-3 w-full ${
            msg.sender === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-xs sm:max-w-md md:max-w-lg p-3 px-4 rounded-2xl shadow-md transition-all duration-300 ${
              msg.sender === "user"
                ? "bg-indigo-700 text-white rounded-br-lg"
                : "bg-gray-800 text-gray-200 rounded-bl-lg"
            }`}
          >
            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
