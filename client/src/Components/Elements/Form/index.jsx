import React from "react";

const Form = ({ action, children, onSubmit, formStyle }) => {
  return (
    <form action={action} onSubmit={onSubmit} className={formStyle}>
      {children}
    </form>
  );
};

export default Form;
