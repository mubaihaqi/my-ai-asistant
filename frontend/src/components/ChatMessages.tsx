import React, { useRef, useEffect } from "react";

type Sender = "user" | "ai";

interface ChatMessagesProps {
  messages: { text: string; sender: Sender }[];
  isLoading: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {messages.map((msg, index) => (
        <div
          key={index}
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
            <p className="leading-relaxed whitespace-pre-wrap">
              {msg.text}
            </p>
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
