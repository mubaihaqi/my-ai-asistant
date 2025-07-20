import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

// Komponen Modal untuk Otentikasi
const AuthModal = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const response = await axios.post("http://localhost:3000/api/auth", {
        name: name.trim(),
      });
      if (response.data.success && response.data.token) {
        localStorage.setItem("authToken", response.data.token);
        onAuthSuccess();
      } else {
        setError("Nama tidak valid. Coba lagi.");
        setName("");
      }
    } catch (err) {
      setError("Gagal menghubungi server. Coba lagi nanti.");
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

export default AuthModal;
