import React from "react";

const SubTitle = ({ titleStyle = "text-[1.5em] font-bold", children }) => {
  return <h2 className={titleStyle}>{children}</h2>;
};

export default SubTitle;
