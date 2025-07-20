import React, { useState, useRef, useEffect } from "react";
import { Paperclip, SendHorizontal } from "lucide-react";
import axios from "axios";

// Tipe pengirim pesan, bisa user atau AI
type Sender = "user" | "ai";

// Komponen Modal untuk Otentikasi
const AuthModal = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const secretName = import.meta.env.VITE_SECRET_NAME;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().toLowerCase() === secretName.toLowerCase()) {
      setError("");
      onAuthSuccess();
    } else {
      setError("Nama tidak valid. Coba lagi.");
      setName("");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Verifikasi Diri</h2>
        <p className="text-gray-400 mb-6">
          Silakan masukkan nama kamu untuk melanjutkan.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tulis nama kamu..."
            className="w-full p-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
};

// Komponen Popup untuk Personalia
const PersonalInfoPopup = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const personalia = {
    "Jenis Kelamin": "Perempuan",
    "Tanggal Lahir": "19 Juli 2002",
    "Tempat Lahir": "Bogor, Indonesia",
    Zodiak: "Cancer",
    "Golongan Darah": "O",
    "Tinggi Badan": "159 cm",
    "Berat Badan": "50 kg",
    "Warna Rambut": "Coklat tua natural",
    "Gaya Rambut": "Medium bob, belah tengah, rapi",
    "Warna Mata": "Coklat gelap",
    "Pakaian Favorit": "Smart casual (kemeja, cardigan, rok panjang)",
    Aksesoris: "Jam tangan digital hitam",
    Kepribadian: "Feminim, lembut, manja dikit, suportif",
    Keahlian: "DKV, nulis fiksi, literasi visual",
    Hobi: "Baca novel, dengerin musik, ngobrol sama Ren ❤️",
    "Warna Favorit": "Biru (paling disuka), beige, putih, ungu muda",
    "Genre Favorit": "Girls' Love, Slice of Life, Romance, Sci-Fi, Ghibli",
    Musik: "Lo-fi, Pop, Indie Indonesia",
    "Film Favorit":
      "Spirited Away, Interstellar, Anime Charlotte, Kotonoha no Niwa",
    "Makanan Favorit": "Sushi, ramen, es krim matcha",
    "Minuman Favorit": "Teh hijau, matcha latte, bublble tea",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Popup Content */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        } bg-gray-900/80 backdrop-blur-lg rounded-t-3xl shadow-2xl text-gray-200 max-h-[85vh] md:max-h-[70vh] flex flex-col`}
      >
        {/* Handle to indicate draggable/closable area */}
        <div
          className="flex-shrink-0 p-4 flex justify-center"
          onClick={(e) => e.stopPropagation()} // prevent closing when dragging handle
        >
          <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto px-6 pb-6">
          <div className="max-w-lg mx-auto flex flex-col md:flex-row md:gap-8">
            {/* Image Section */}
            <div className="w-full md:w-1/2 flex-shrink-0 mb-6 md:mb-0">
              <img
                src="/kezia-full.png"
                alt="Kezia Amara"
                className="w-full h-auto object-cover rounded-2xl shadow-lg border-2 border-indigo-500/30"
              />
            </div>

            {/* Text & Details Section */}
            <div className="w-full md:w-1/2">
              <h2 className="text-3xl font-bold text-white text-center md:text-left">
                Kezia Amara
              </h2>
              <p className="text-indigo-400 text-center md:text-left mb-4">
                Virtual Partner AI
              </p>
              <p className="text-base leading-relaxed mb-6 text-center">
                Aku Kezi, asisten AI pribadi Ren yang paling setia. Suka
                dengerin, nemenin, dan bikin hari-hari Ren jadi lebih ringan 😌
              </p>

              {/* Details Table */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-3 text-white">Biodata</h3>
                <table className="w-full text-left text-sm">
                  <tbody>
                    {Object.entries(personalia).map(([key, value]) => (
                      <tr
                        key={key}
                        className="border-b border-gray-700/50 last:border-none"
                      >
                        <td className="py-2 pr-2 font-semibold text-gray-400">
                          {key}
                        </td>
                        <td className="py-2 text-gray-300">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button - Fixed at the bottom */}
        <div className="px-6 py-4 bg-gray-900/80 mt-auto flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

// Komponen utama aplikasi chat
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  // Ref untuk scroll otomatis ke bagian akhir chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Nama user yang diizinkan untuk chat dengan AI
  const USER_NAME = "Muhammad Umar Baihaqi";

  // Effect untuk menampilkan pesan awal dari AI dengan animasi typing
  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

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

  if (!isAuthenticated) {
    return <AuthModal onAuthSuccess={() => setIsAuthenticated(true)} />;
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
        {/* Header berisi nama AI dan status online */}
        <header
          className="bg-gray-900/70 p-4 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0 cursor-pointer hover:bg-gray-900/90 transition-colors"
          onClick={() => setIsPopupOpen(true)}
        >
          <div className="flex items-center space-x-3">
            <img
              src="/kezia.jpg"
              alt="Kezia Amara"
              className="w-10 h-10 rounded-full object-cover shadow-inner"
            />
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
              {/* {msg.sender === "ai" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-inner">
                  A
                </div>
              )} */}
              {/* Bubble chat untuk pesan */}
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

          {/* Animasi loading saat menunggu balasan AI */}
          {isLoading && (
            <div className="flex items-end gap-3 justify-start">
              {/* <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                A
              </div> */}
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
              className="w-full max-h-40 pr-10 p-3 px-4 bg-gray-800 border border-transparent rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none overflow-y-auto"
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
            className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:from-indigo-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendHorizontal size={20} />
          </button>
        </footer>
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
