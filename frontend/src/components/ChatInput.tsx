import React, { useRef, useEffect } from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  sendMessage: () => void;
  isLoading: boolean;
  image: { base64: string | null; file: File | null; mimeType: string | null };
  setImage: (image: { base64: string | null; file: File | null; mimeType: string | null }) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  sendMessage,
  isLoading,
  image,
  setImage,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fullDataUrl = reader.result as string;
        const [prefix, base64String] = fullDataUrl.split(",");
        const mimeType = prefix.split(":")[1].split(";")[0];
        setImage({ base64: base64String, file, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImage({ base64: null, file: null, mimeType: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  return (
    <footer className="p-3 sm:p-4 bg-gray-900/70 border-t border-gray-700/50 flex-shrink-0">
      <div className="flex items-end gap-3 w-full">
        <div className="relative flex-1 flex flex-col">
          {image.base64 && (
            <div className="relative mb-2 w-24 h-24 rounded-md overflow-hidden">
              <img
                src={`data:${image.mimeType || "image/jpeg"};base64,${image.base64}`}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-gray-900/70 rounded-full p-1 text-white hover:bg-gray-800 transition"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="relative flex items-center">
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              onClick={handleAttachClick}
              disabled={isLoading}
            >
              <Paperclip size={18} />
            </button>
          </div>
        </div>

        <button
          onClick={sendMessage}
          disabled={isLoading || (!inputMessage.trim() && !image.base64)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:from-indigo-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed self-end"
        >
          <SendHorizontal size={20} />
        </button>
      </div>
    </footer>
  );
};

export default ChatInput;
