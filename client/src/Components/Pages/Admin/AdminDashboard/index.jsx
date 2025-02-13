import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { FaFileExport, FaTruck } from "react-icons/fa";
import { FaCartFlatbed } from "react-icons/fa6";
import { LuPackageCheck } from "react-icons/lu";
import { message } from "antd";
import moment from "moment";
import axios from "axios";
import urlApi from "../../../../utils/url";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
  const [statisticsPeriod, setStatisticsPeriod] = useState("daily");
  const [statisticsData, setStatisticsData] = useState([]);
  const [workerStats, setWorkerStats] = useState([]);

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
      message.error("Failed to fetch data");
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${urlApi}/api/v1/statistics?period=${statisticsPeriod}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setStatisticsData(response.data.data);
    } catch (err) {
      message.error("Failed to fetch statistics");
    }
  };

  const fetchWorkerStats = async () => {
    try {
      const response = await axios.get(`${urlApi}/api/v1/worker-statistics?period=${statisticsPeriod}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setWorkerStats(response.data.data);
    } catch (err) {
      message.error("Failed to fetch worker statistics");
    }
  };

  const getUserRole = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode(token);
      return decoded.roles; // assuming role is stored in token payload
    } catch (error) {
      console.error("Token decode error:", error);
      return null;
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userRole = getUserRole();

        // Reduce delay from 800ms to 300ms for faster transition
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!userRole || !userRole.includes("superadmin")) {
          navigate("/admin/barang");
          return;
        }

        setIsLoading(false);
        // Only fetch these if superadmin
        fetchData();
        fetchStatistics();
        fetchWorkerStats();
      } catch (error) {
        console.error("Access check failed:", error);
        navigate("/admin/barang");
      }
    };

    checkAccess();
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [searchQuery, startDate, endDate, selectedStatus, pagination.currentPage]);

  useEffect(() => {
    const userRole = getUserRole();
    if (userRole === "superadmin") {
      fetchStatistics();
    }
  }, [statisticsPeriod]);

  useEffect(() => {
    const userRole = getUserRole();
    if (userRole === "superadmin") {
      fetchWorkerStats();
    }
  }, [statisticsPeriod]);

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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Total Picked</p>
                <h3 className="text-white text-3xl font-bold">{statusCounts.picker || 0}</h3>
              </div>
              <div className="bg-blue-400 rounded-full p-3">
                <FaCartFlatbed className="text-white text-2xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Total Packed</p>
                <h3 className="text-white text-3xl font-bold">{statusCounts.packing || 0}</h3>
              </div>
              <div className="bg-green-400 rounded-full p-3">
                <LuPackageCheck className="text-white text-2xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium mb-1">Total Pickout</p>
                <h3 className="text-white text-3xl font-bold">{statusCounts.pickout || 0}</h3>
              </div>
              <div className="bg-purple-400 rounded-full p-3">
                <FaTruck className="text-white text-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Chart Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mx-4 mb-8">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center mobile:flex-col gap-5">
            <h2 className="text-xl font-semibold">Activity Statistics</h2>
            <div className="flex gap-2">
              {["daily", "weekly", "monthly", "yearly"].map((period) => (
                <button
                  key={period}
                  onClick={() => setStatisticsPeriod(period)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${statisticsPeriod === period ? "bg-blue-500 text-white shadow-md transform scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statisticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="picker" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="packing" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="pickout" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Worker Performance Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mx-4 mb-8">
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold">Worker Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Picked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickout</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Scans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scans/Hour</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours Worked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workerStats.map((worker, index) => (
                  <tr key={worker.id_pekerja} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{worker.nama_pekerja}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{worker.picker_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{worker.packing_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">{worker.pickout_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{worker.total_scans}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{worker.scans_per_hour}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{worker.hours_worked}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-grow h-2 bg-gray-200 rounded-full">
                          <div className="h-2 bg-green-500 rounded-full" style={{ width: `${worker.performance_score}%` }} />
                        </div>
                        <span className="ml-2 text-sm text-gray-600">{worker.performance_score}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mx-4">
        <div className="space-y-6">
          {/* Controls Section */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <input
                type="text"
                placeholder="Search by Resi ID or Staff Name"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex gap-2">
                <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end mobile:justify-start">
              <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-md">
                <FaFileExport /> Export Data
              </button>
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {["all", "picker", "packing", "pickout"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-6 py-2 rounded-lg transition-all duration-200 ${selectedStatus === status ? "bg-blue-500 text-white shadow-md transform scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Resi ID", "Staff Name", "Activity", "Date & Time"].map((header) => (
                    <th key={header} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((order, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{!order.resi_id ? "Telah dihapus / bermasalah" : order.resi_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.nama_pekerja}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status_proses === "picker"
                            ? "bg-blue-100 text-blue-800"
                            : order.status_proses === "packing"
                            ? "bg-green-100 text-green-800"
                            : order.status_proses === "pickout"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {`Telah ${order.status_proses} barang`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{moment(order.created_at).format("DD/MM/YY | HH:mm:ss")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
            <div className="flex gap-2">
              {generatePageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 rounded-lg transition-colors ${pagination.currentPage === pageNum ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
