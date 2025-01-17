import React from "react";

const Title = ({ titleStyle = "text-[2em] font-bold", children }) => {
  return <h1 className={titleStyle}>{children}</h1>;
};

export default Title;
