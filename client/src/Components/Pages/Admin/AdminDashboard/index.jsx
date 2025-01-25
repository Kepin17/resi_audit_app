import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { FaClipboardCheck, FaBox } from "react-icons/fa";
import { LuPackageCheck } from "react-icons/lu";
import { FaUserCheck } from "react-icons/fa";

import axios from "axios";

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
    </DashboardLayout>
  );
};

export default AdminDashboard;
