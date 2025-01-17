import Button from "../../Elements/Button";
import Title from "../../Elements/Title";
import React from "react";

const NavFragment = () => {
  return (
    <nav className="flex items-center justify-between w-full h-16 bg-white px-5 shadow-md z-50">
      <Title titleStyle="text-[1.5em] font-bold">Logo</Title>
      <ul className="flex items-center space-x-4">
        <li>
          <div className="dropdown relative">
            <p className="cursor-pointer hover:text-gray-600">nama</p>
            <div className="absolute hidden top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2">
              <Button buttonStyle="w-full text-left px-4 py-2 hover:bg-gray-100">Buton sdsds</Button>
              <Button buttonStyle="w-full text-left px-4 py-2 hover:bg-gray-100">Buton sdsds</Button>
            </div>
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default NavFragment;
