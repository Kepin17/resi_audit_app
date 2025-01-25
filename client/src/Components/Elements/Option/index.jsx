import React from "react";

const Option = ({ optionValue, children, disabled = false }) => {
  return (
    <option
      value={optionValue}
      disabled={disabled}
      className={`
        w-full 
        py-4 
        px-6 
        text-base
        font-medium
        text-gray-700 
        bg-white 
        hover:bg-gray-50 
        active:bg-gray-100
        cursor-pointer 
        transition-all
        duration-200
        border-b 
        border-gray-100
        last:border-b-0
        focus:bg-blue-50
        focus:text-blue-600
        focus:outline-none
        disabled:bg-gray-50
        disabled:text-gray-400
        disabled:cursor-not-allowed
        [&:checked]:bg-blue-50
        [&:checked]:text-blue-600
        [&:checked]:font-semibold
        selection:bg-blue-100
        ${disabled ? "opacity-50" : "opacity-100"}
      `}
    >
      {children}
    </option>
  );
};

export default Option;
