import React from "react";

const Label = ({ htmlFor, children, labelStyle }) => {
  return (
    <label htmlFor={htmlFor} className={labelStyle}>
      {children}
    </label>
  );
};

export default Label;
