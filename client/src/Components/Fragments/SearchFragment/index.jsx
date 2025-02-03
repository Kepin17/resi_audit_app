import React from "react";
import { FaSearch } from "react-icons/fa";

const SearchFragment = ({ onSearch, value, placeholder, className }) => {
  return (
    <div className={`relative ${className}`}>
      <input type="text" value={value} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="w-full p-2 pr-10 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <FaSearch className="h-5 w-5" />
      </span>
    </div>
  );
};

export default SearchFragment;
