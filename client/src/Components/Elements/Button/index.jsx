import React from "react";

const Button = ({ children, onClick, buttonStyle = "w-full bg-slate-900 font-bold text-slate-200 flex items-center justify-center gap-2 p-2 rounded-sm" }) => {
  return (
    <button className={buttonStyle} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
