import React from "react";

const Input = ({ InputType = "text", name, id, placeholder, value, onChange, inputStyle = "w-full p-2 focus:outline-none rounded-md appearance-none", isDisabled = false, maxLength }) => {
  return <input type={InputType} name={name} id={id} placeholder={placeholder} value={value} onChange={onChange} className={inputStyle} disabled={isDisabled} maxLength={maxLength} />;
};

export default Input;
