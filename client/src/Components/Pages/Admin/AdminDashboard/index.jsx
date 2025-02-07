import { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { FaClipboardCheck } from "react-icons/fa";
import { LuPackageCheck } from "react-icons/lu";
import { FaUserCheck, FaFileExport, FaDatabase, FaFileImport } from "react-icons/fa";
import { message } from "antd";

import moment from "moment";
import axios from "axios";

const AdminDashboard = () => {
  const [data, setData] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [importStatus, setImportStatus] = useState(null);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await axios.get(`http://localhost:8080/api/v1/resi-terpack?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setData(response.data.data);
      setTodayCount(response.data.todayCount);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, startDate, endDate]);

  const totalReadyForShipment = data.filter((order) => order.status_barang === "pending for shipment").length;

  const handleExport = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/v1/resi-terpack-export", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `resi_packing_${moment().format("DDMMYYYY")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/v1/resi-terpack-backup", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `staff_data_${new Date().toISOString().split("T")[0]}_backup.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error("Failed to backup data");
    }
  };

  const ImportFromExcelHandler = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      // Check file extension
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (!["xlsx", "xls"].includes(fileExt)) {
        message.error("Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("http://localhost:8080/api/v1/resi-terpack-import", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success) {
        message.success("Data berhasil diimport");
        await fetchData(); // Refresh data after successful import
      }
    } catch (error) {
      console.error("Error importing file:", error);
      message.error(error.response?.data?.message || "Gagal mengimport data");
    }
  };

  return (
    <DashboardLayout>
      <div className="status-card-wrapper w-full flex flex-col md:flex-row gap-3 md:gap-5 justify-center items-stretch p-2 md:p-0">
        <div className="status-card bg-blue-500 w-full md:w-1/3 p-4 rounded-lg">
          <div className="status-card-content text-white flex items-center gap-3 md:gap-5">
            <FaClipboardCheck className="text-3xl md:text-5xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">{todayCount}</h1>
              <p className="text-base md:text-lg">Total Packing Today</p>
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

      <div className="w-full h-full bg-white rounded-md p-5">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
            <div className="flex flex-col md:flex-row gap-4">
              <input type="text" placeholder="Search by Resi ID or Staff Name" className="p-2 border rounded-md flex-1" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <div className="flex gap-2">
                <input type="date" className="p-2 border rounded-md" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" className="p-2 border rounded-md" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                <FaFileExport /> Export
              </button>
              <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                <FaDatabase /> Backup
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 cursor-pointer">
                <FaFileImport />
                Import
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={ImportFromExcelHandler} />
              </label>
            </div>
          </div>
          {importStatus && <div className={`p-4 mb-4 rounded-md ${importStatus.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{importStatus.message}</div>}
        </div>
        <h2 className="text-2xl font-semibold mb-4">Packed Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resi ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packing Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pack Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((order, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{!order.resi_id ? "Telah dihapus / bermasalah" : order.resi_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.nama_pekerja}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Packed</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{moment(order.created_at).format("DD/MM/YY | HH:MM:SS")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
