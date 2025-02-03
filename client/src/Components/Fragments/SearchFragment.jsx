import React from 'react';

const SearchFragment = ({ onSearch, onKeyPress, value, placeholder, className }) => {
  return (
    <div className={className}>
      <input
        type="text"
        value={value}
        onChange={(e) => onSearch(e.target.value)}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};

export default SearchFragment;
