import { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { FaClipboardCheck } from "react-icons/fa";
import { LuPackageCheck } from "react-icons/lu";
import { FaUserCheck, FaFileExport, FaDatabase, FaFileImport } from "react-icons/fa";
import { message } from "antd";
import moment from "moment";
import axios from "axios";
import urlApi from "../../../../utils/url";

const AdminDashboard = () => {
  const [data, setData] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [statusCounts, setStatusCounts] = useState({
    picker: 0,
    packing: 0,
    pickout: 0,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 12,
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (startDate) {
        // Tambahkan waktu awal hari (00:00:00) untuk startDate
        const formattedStartDate = startDate + " 00:00:00";
        params.append("startDate", formattedStartDate);
      }
      if (endDate) {
        // Tambahkan waktu akhir hari (23:59:59) untuk endDate
        const formattedEndDate = endDate + " 23:59:59";
        params.append("endDate", formattedEndDate);
      }
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      params.append("page", pagination.currentPage);

      const response = await axios.get(`${urlApi}/api/v1/resi-terpack?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setData(response.data.data);
      setTodayCount(response.data.todayCount);
      setPagination(response.data.pagination);

      // Calculate status counts
      const counts = response.data.data.reduce((acc, item) => {
        acc[item.status_proses] = (acc[item.status_proses] || 0) + 1;
        return acc;
      }, {});
      setStatusCounts(counts);
    } catch (err) {
      console.log(err);
      message.error("Failed to fetch data");
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, startDate, endDate, selectedStatus, pagination.currentPage]);

  const totalReadyForShipment = data.filter((order) => order.status_barang === "pending for shipment").length;

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      const response = await axios.get(`${urlApi}/api/v1/resi-terpack-export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = selectedStatus !== "all" ? `resi_${selectedStatus}_${moment().format("DDMMYYYY")}.xlsx` : `resi_all_${moment().format("DDMMYYYY")}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed:", err);
      message.error("Failed to export data");
    }
  };

  const handleBackup = async () => {
    try {
      const response = await axios.get(`${urlApi}/api/v1/resi-terpack-backup`, {
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

  const ImportFromExcelHandler = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // File validation
    const fileExt = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(fileExt)) {
      message.error("Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)");
      return;
    }

    // File size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      message.error("Ukuran file terlalu besar. Maksimal 5MB");
      return;
    }

    try {
      setImportLoading(true);
      message.loading({ content: "Mengimport data...", key: "import" });

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${urlApi}/api/v1/resi-terpack-import`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success) {
        message.success({
          content: "Data berhasil diimport",
          key: "import",
          duration: 3,
        });
        fetchData(); // Use fetchData instead of fetchBarang
      } else {
        throw new Error(response.data?.message || "Gagal mengimport data");
      }
    } catch (error) {
      console.error("Error importing file:", error);
      message.error({
        content: error.response?.data?.message || "Gagal mengimport data. Pastikan format file sesuai template.",
        key: "import",
        duration: 4,
      });
    } finally {
      setImportLoading(false);
      event.target.value = ""; // Reset file input
    }
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // Show maximum 5 page numbers
    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(start + maxVisible - 1, totalPages);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <DashboardLayout>
      <div className="status-card-wrapper w-full flex flex-wrap gap-3 justify-center items-stretch p-2 md:p-0">
        <div className="status-card bg-blue-500 w-full md:w-1/4 p-4 rounded-lg">
          <div className="status-card-content text-white flex items-center gap-3">
            <FaClipboardCheck className="text-3xl" />
            <div>
              <h1 className="text-2xl font-semibold">{statusCounts.picker || 0}</h1>
              <p>Picker</p>
            </div>
          </div>
        </div>
        <div className="status-card bg-green-500 w-full md:w-1/4 p-4 rounded-lg">
          <div className="status-card-content text-white flex items-center gap-3">
            <LuPackageCheck className="text-3xl" />
            <div>
              <h1 className="text-2xl font-semibold">{statusCounts.packing || 0}</h1>
              <p>Packing</p>
            </div>
          </div>
        </div>
        <div className="status-card bg-purple-500 w-full md:w-1/4 p-4 rounded-lg">
          <div className="status-card-content text-white flex items-center gap-3">
            <FaUserCheck className="text-3xl" />
            <div>
              <h1 className="text-2xl font-semibold">{statusCounts.pickout || 0}</h1>
              <p>Pickout</p>
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

            <div className="flex gap-2 mb-4">
              <button onClick={() => setSelectedStatus("all")} className={`px-4 py-2 rounded-md ${selectedStatus === "all" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                All
              </button>
              <button onClick={() => setSelectedStatus("picker")} className={`px-4 py-2 rounded-md ${selectedStatus === "picker" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                Picker
              </button>
              <button onClick={() => setSelectedStatus("packing")} className={`px-4 py-2 rounded-md ${selectedStatus === "packing" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                Packing
              </button>
              <button onClick={() => setSelectedStatus("pickout")} className={`px-4 py-2 rounded-md ${selectedStatus === "pickout" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                Pickout
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                <FaFileExport /> Export
              </button>
              <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                <FaDatabase /> Backup
              </button>
              <label className={`flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 cursor-pointer ${importLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
                <FaFileImport />
                {importLoading ? "Importing..." : "Import"}
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={ImportFromExcelHandler} disabled={importLoading} />
              </label>
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4">
          {selectedStatus === "picker" && <span>Picked Orders</span>}
          {selectedStatus === "packing" && <span>Packed Orders</span>}
          {selectedStatus === "all" && <span>All Orders</span>}
          {selectedStatus === "pickout" && <span>Pickout Orders</span>}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resi ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((order, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{!order.resi_id ? "Telah dihapus / bermasalah" : order.resi_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.nama_pekerja}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        order.status_proses === "picker"
                          ? "bg-blue-100 text-blue-800"
                          : order.status_proses === "packing"
                          ? "bg-green-100 text-green-800"
                          : order.status_proses === "Konfirmasi"
                          ? "bg-orange-100 text-orange-800"
                          : order.status_proses === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {order.status_proses === "Konfirmasi" ? "Melakukan konfirmasi pembatalan resi" : order.status_proses === "cancelled" ? "Menyetujui pembatalan resi" : `Telah ${order.status_proses} barang`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{moment(order.created_at).format("DD/MM/YY | HH:MM:SS")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end items-center gap-2 px-6">
          <button
            onClick={() => handlePageChange(1)}
            disabled={pagination.currentPage === 1}
            className={`px-3 py-1 rounded-md ${pagination.currentPage === 1 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
          >
            First
          </button>

          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className={`px-3 py-1 rounded-md ${pagination.currentPage === 1 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
          >
            Prev
          </button>

          {generatePageNumbers().map((pageNum) => (
            <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`px-3 py-1 rounded-md ${pagination.currentPage === pageNum ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-blue-100"}`}>
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className={`px-3 py-1 rounded-md ${pagination.currentPage === pagination.totalPages ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
          >
            Next
          </button>

          <button
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.currentPage === pagination.totalPages}
            className={`px-3 py-1 rounded-md ${pagination.currentPage === pagination.totalPages ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
          >
            Last
          </button>

          <span className="text-gray-600 ml-4">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
