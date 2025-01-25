import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { FaClipboardCheck, FaBox } from "react-icons/fa";
import SearchFragment from "../../../Fragments/SearchFragment";
import PaginationFragment from "../../../Fragments/PaginationFragement";
import { LuPackageCheck } from "react-icons/lu";
import { FaTruckLoading, FaTruck, FaUserCheck } from "react-icons/fa";
import { FaBoxesPacking } from "react-icons/fa6";

import axios from "axios";
import Title from "../../../Elements/Title";

const ItemCard = ({ item, index }) => (
  <div
    className="w-[22rem] m-auto bg-white p-6 rounded-lg shadow-md flex items-center justify-between gap-5 hover:shadow-lg transition-all duration-300 border border-slate-200
  cursor-pointer
  "
    key={index}
  >
    <div className="w-full flex items-center gap-5">
      <FaBox className="text-5xl text-orange-400" />
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-slate-800">{item.nama_barang}</h3>
        <div className="w-[15rem] flex items-center justify-between gap-2 relative">
          <div className=" flex flex-col gap-1">
            <p className="text-slate-600 text-xs">{item.resi_id}</p>
            <p className={`text-slate-600 text-xs`}>{item.nama_category}</p>
          </div>

          <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-lg">
            {item.status_barang === "pending for packing" && <FaTruckLoading />}
            {item.status_barang === "pending for shipment" && <FaBoxesPacking />}
            {item.status_barang === "ready for shipment" && <FaTruck />}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [data, setData] = useState([]);
  useEffect(() => {
    axios
      .get("http://localhost:8080/api/v1/barang", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log(res.data);
        setData(res.data.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const totalReadyForShipment = data.filter((order) => order.status_barang === "pending for shipment").length;

  return (
    <DashboardLayout>
      <div className="status-card-wrapper w-full flex flex-col md:flex-row gap-3 md:gap-5 justify-center items-stretch p-2 md:p-0">
        <div className="status-card bg-blue-500 w-full md:w-1/3 p-4 rounded-lg">
          <div className="status-card-content text-white flex items-center gap-3 md:gap-5">
            <FaClipboardCheck className="text-3xl md:text-5xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">{data.length}</h1>
              <p className="text-base md:text-lg">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="status-card bg-blue-500 w-full md:w-1/3 p-4 rounded-lg">
          <div className="status-card-content text-white flex items-center gap-3 md:gap-5">
            <LuPackageCheck className="text-3xl md:text-5xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">{totalReadyForShipment}</h1>
              <p className="text-base md:text-lg">Ready for shipment</p>
            </div>
          </div>
        </div>

        <div className="status-card bg-blue-500 w-full md:w-1/3 p-4 rounded-lg">
          <div className="status-card-content text-white flex items-center gap-3 md:gap-5">
            <FaUserCheck className="text-3xl md:text-5xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">{totalReadyForShipment}</h1>
              <p className="text-base md:text-lg">Total Staff</p>
            </div>
          </div>
        </div>
      </div>
      <SearchFragment />
      <div className="w-full min-h-0 flex flex-col bg-slate-100 rounded-lg relative">
        <div className="p-4">
          <Title titleStyle="text-xl md:text-2xl font-semibold text-slate-800">Recent Orders</Title>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 ">
            <PaginationFragment data={data}>
              <ItemCard />
            </PaginationFragment>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
