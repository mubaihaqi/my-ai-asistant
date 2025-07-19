import React, { useState, useRef, useEffect } from "react";
import { Paperclip, SendHorizontal } from "lucide-react";
import axios from "axios";

// Tipe pengirim pesan, bisa user atau AI
type Sender = "user" | "ai";

// Komponen utama aplikasi chat
function App() {
  // State untuk menyimpan daftar pesan chat
  const [messages, setMessages] = useState<{ text: string; sender: Sender }[]>(
    []
  );
  // State untuk input pesan user
  const [inputMessage, setInputMessage] = useState<string>("");
  // State untuk status loading saat menunggu balasan AI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Ref untuk scroll otomatis ke bagian akhir chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Nama user yang diizinkan untuk chat dengan AI
  const USER_NAME = "Muhammad Umar Baihaqi";

  // Effect untuk menampilkan pesan awal dari AI dengan animasi typing
  useEffect(() => {
    const initialMessage = "halo beb baru online nih";
    let currentText = "";
    let index = 0;

    // Memulai dengan satu pesan kosong dari AI
    setMessages([{ text: "", sender: "ai" }]);

    const typingInterval = setInterval(() => {
      if (index < initialMessage.length) {
        currentText += initialMessage[index];
        // FIX: Update pesan pertama tanpa menghapus pesan lain dalam array
        setMessages((prevMessages) => [
          { ...prevMessages[0], text: currentText },
          ...prevMessages.slice(1),
        ]);
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, 100);

    // Membersihkan interval saat komponen di-unmount
    return () => clearInterval(typingInterval);
  }, []);

  // Effect untuk autofocus pada input pesan saat komponen dimuat dan setelah pesan dikirim
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [messages]); // Dependensi pada `messages` agar fokus setelah pesan terkirim

  // Effect untuk scroll ke bawah setiap kali pesan baru muncul
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Fungsi untuk mengirim pesan user ke backend dan menerima balasan AI
  const sendMessage = async () => {
    if (inputMessage.trim() === "" || isLoading) return;

    const userMessage = { text: inputMessage, sender: "user" as Sender };
    // Menambahkan pesan user ke state, menjaga pesan AI yang sedang diketik
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:3000/api/chat", {
        message: inputMessage,
        userName: USER_NAME,
      });
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
      // Autofocus setelah pesan terkirim atau ada error
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // reset dulu
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [inputMessage]);

  // Render tampilan utama aplikasi chat
  return (
    <div className="flex flex-col h-screen font-sans antialiased bg-gray-900 text-gray-100">
      {/* Background gambar dan efek blur */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: `url('https://picsum.photos/seed/modern-ui/1920/1080')`,
        }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Konten utama aplikasi */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header berisi nama AI dan status online */}
        <header className="bg-gray-900/70 p-4 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-inner">
              K
            </div>
            <h1 className="text-lg font-bold text-gray-200">Kezia Amara</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-sm text-gray-400 hidden sm:block">
              Online
            </span>
          </div>
        </header>

        {/* Area chat utama, menampilkan pesan-pesan */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-end gap-3 w-full ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Avatar AI jika pengirimnya AI */}
              {msg.sender === "ai" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-inner">
                  A
                </div>
              )}
              {/* Bubble chat untuk pesan */}
              <div
                className={`max-w-xs sm:max-w-md md:max-w-lg p-3 px-4 rounded-2xl shadow-md transition-all duration-300 ${
                  msg.sender === "user"
                    ? "bg-violet-600 text-white rounded-br-lg"
                    : "bg-gray-800 text-gray-200 rounded-bl-lg"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}

          {/* Animasi loading saat menunggu balasan AI */}
          {isLoading && (
            <div className="flex items-end gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                A
              </div>
              <div className="max-w-sm p-4 rounded-2xl rounded-bl-lg bg-gray-800">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          {/* Ref untuk auto scroll ke bawah */}
          <div ref={chatEndRef} />
        </main>

        {/* Footer berisi input pesan dan tombol kirim */}
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
              className="w-full max-h-40 pr-10 p-3 px-4 bg-gray-800 border border-transparent rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none overflow-y-auto"
            />
            {/* icon attach */}
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              onClick={() => alert("Attach image clicked!")} // ganti nanti dengan real handler
            >
              <Paperclip size={18} />
            </button>
          </div>

          {/* kirim */}
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:from-violet-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendHorizontal size={20} />
          </button>
        </footer>
      </div>
    </div>
  );
}

// Ekspor komponen utama
export default App;
