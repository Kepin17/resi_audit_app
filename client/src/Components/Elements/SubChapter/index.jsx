import React from "react";

const SubChapter = ({ titleStyle = "text-[1.17em] font-bold", children }) => {
  return <h3 className={titleStyle}>{children}</h3>;
};

export default SubChapter;
