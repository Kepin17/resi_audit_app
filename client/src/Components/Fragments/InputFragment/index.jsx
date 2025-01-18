import React, { useState } from "react";
import Label from "../../Elements/Label";
import Input from "../../Elements/Input";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const InputFragment = ({ InputType = "text", inputName, htmlFor, inputValue, inputOnChange, children }) => {
  const [isShowPass, setIsShowPass] = useState(false);
  return (
    <div className="relative w-full group">
      <Input
        InputType={!isShowPass ? InputType : "text"}
        name={inputName}
        id={inputName}
        inputStyle="w-full h-12 px-4 pt-2 peer border-2 rounded-lg outline-none transition-all duration-200 focus:border-blue-500"
        placeholder=" "
        value={inputValue}
        onChange={inputOnChange}
      />

      {InputType === "password" && (
        <div className="showpass absolute right-4 top-1/2 -translate-y-1/2 z-50 cursor-pointer" onClick={() => setIsShowPass(!isShowPass)}>
          {isShowPass ? <FaEyeSlash className="text-gray-500" /> : <FaEye className="text-gray-500" />}
        </div>
      )}
      <Label
        htmlFor={htmlFor}
        labelStyle="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 cursor-text transition-all duration-200 
        peer-focus:-translate-y-full peer-focus:text-sm peer-focus:text-blue-500
        peer-[&:not(:placeholder-shown)]:-translate-y-full peer-[&:not(:placeholder-shown)]:text-sm"
      >
        {children}
      </Label>
    </div>
  );
};

export default InputFragment;
