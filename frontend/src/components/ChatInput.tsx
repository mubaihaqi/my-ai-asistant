import React, { useRef, useEffect } from "react";
import { Paperclip, SendHorizontal } from "lucide-react";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  sendMessage: () => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  sendMessage,
  isLoading,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [inputMessage]);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]); // Fokus setelah pesan terkirim dan isLoading menjadi false

  return (
    <footer className="p-3 sm:p-4 bg-gray-900/70 border-t border-gray-700/50 flex items-end gap-3 flex-shrink-0">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isLoading}
          placeholder="Tulis pesan..."
          className="w-full max-h-40 pr-10 p-3 px-4 bg-gray-800 border border-transparent rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none overflow-y-auto"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
          onClick={() => alert("Attach image clicked!")}
        >
          <Paperclip size={18} />
        </button>
      </div>

      <button
        onClick={sendMessage}
        disabled={isLoading || !inputMessage.trim()}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:from-indigo-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SendHorizontal size={20} />
      </button>
    </footer>
  );
};

export default ChatInput;
