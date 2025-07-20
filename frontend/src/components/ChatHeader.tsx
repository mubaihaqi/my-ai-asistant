import React from "react";

interface ChatHeaderProps {
  onHeaderClick: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onHeaderClick }) => {
  return (
    <header
      className="bg-gray-900/70 p-4 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0 cursor-pointer hover:bg-gray-900/90 transition-colors"
      onClick={onHeaderClick}
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
  );
};

export default ChatHeader;
