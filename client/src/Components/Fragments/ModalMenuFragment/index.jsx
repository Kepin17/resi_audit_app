import React, { useRef, useEffect } from "react";
import SubTitle from "../../Elements/SubTitle";

const ModalMenuFragment = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="modal-wrapper w-[40rem] h-auto bg-white rounded-md p-5">
        <SubTitle titleStyle="text-center text-2xl font-semibold">{title}</SubTitle>
        {children}
      </div>
    </div>
  );
};

export default ModalMenuFragment;
