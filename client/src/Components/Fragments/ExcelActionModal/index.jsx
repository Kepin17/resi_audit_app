import { Modal } from "antd";
import React from "react";
import { FaBoxesPacking, FaFileExcel } from "react-icons/fa6";
import { MdBackup } from "react-icons/md";

const ExcelActionModal = ({ isOpen, onCancel, title, ImportFromExcelHandler, handleBackup, handleExport }) => {
  return (
    <Modal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 " open={isOpen} onCancel={onCancel} title={title} footer={null}>
      <div className="flex h-40">
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="flex items-center justify-center flex-col shadow-2xl rounded-2xl p-4 border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-300 ease-in-out cursor-pointer"
            onClick={ImportFromExcelHandler}
          >
            <FaBoxesPacking className=" text-5xl" />
            <span className="text-md">Import Resi</span>
          </div>
        </div>

        <div className="w-full h-full flex items-center justify-center">
          <div
            className="flex items-center justify-center flex-col shadow-2xl rounded-2xl p-4 border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-300 ease-in-out cursor-pointer"
            onClick={handleBackup}
          >
            <MdBackup className=" text-5xl" />
            <span className="text-md">Backup data</span>
          </div>
        </div>

        <div className="w-full h-full flex items-center justify-center">
          <div
            className="flex items-center justify-center flex-col shadow-2xl rounded-2xl p-4 border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-300 ease-in-out cursor-pointer"
            onClick={handleExport}
          >
            <FaFileExcel className=" text-5xl" />
            <span className="text-md">Export Data</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExcelActionModal;
