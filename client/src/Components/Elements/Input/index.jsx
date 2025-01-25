import React from "react";

const Input = ({ InputType = "text", name, id, placeholder, value, onChange, inputStyle = "w-full p-2 focus:outline-none rounded-md" }) => {
  return <input type={InputType} name={name} id={id} placeholder={placeholder} value={value} onChange={onChange} className={inputStyle} />;
};

export default Input;
