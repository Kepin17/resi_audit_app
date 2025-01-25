import React from "react";
import Input from "../../Elements/Input";

const SearchFragment = ({ placeholder = "Search", onChange, value }) => {
  return (
    <div className="searchbar w-full h-[5rem] flex items-center justify-center relative">
      <Input
        name={"search"}
        placeholder={placeholder}
        inputStyle="
      w-full h-11 px-5 py-3 bg-white border-2 border-gray-200 rounded-md focus:outline-none focus:border-blue-500 transition-all duration-300 ease-in-out
      "
        onChange={onChange}
        value={value}
      />
    </div>
  );
};

export default SearchFragment;
