import { useEffect } from "react";

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

export default PersonalInfoPopup;
