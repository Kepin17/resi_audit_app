import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { FaArrowCircleLeft, FaFileExport, FaSearch, FaTruck } from "react-icons/fa";
import { FaCartFlatbed } from "react-icons/fa6";
import { LuPackageCheck } from "react-icons/lu";
import { Input, message, Form, Button } from "antd";
import moment from "moment";
import axios from "axios";
import urlApi from "../../../../utils/url";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(moment().format("YYYY-MM-DD "));
  const [endDate, setEndDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isCountActive, setIsCountActive] = useState(false);

  const toggleCountActive = () => {
    setIsCountActive((prev) => !prev);
  };

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
  const [expeditionCounts, setExpeditionCounts] = useState([]);
  const [loadingExpeditions, setLoadingExpeditions] = useState(false);
  // Add state for chart series visibility
  const [visibleSeries, setVisibleSeries] = useState({
    picker: true,
    packing: true,
    pickout: true,
  });

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    message.error("Session expired. Please login again.");
    navigate("/login");
  }, [navigate]);

  // Add axios interceptor setup
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on component unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [handleLogout]);

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
      setPagination(response.data.pagination);
      setExpeditionCounts(response.data.countEkspedisiToday);
      setStatusCounts(response.data.statusCounts);
    } catch (err) {
      if (err.response?.status !== 401) {
        // Only show error if not 401
        message.error("Failed to fetch data");
      }
    }
  };

  const fetchStatistics = async (period) => {
    try {
      const response = await axios.get(`${urlApi}/api/v1/statistics?period=${period}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setStatisticsData(response.data.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        message.error("Failed to fetch statistics");
      }
    }
  };

  const fetchWorkerStats = async (period) => {
    try {
      const response = await axios.get(`${urlApi}/api/v1/worker-statistics?period=${period}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setWorkerStats(response.data.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        message.error("Failed to fetch worker statistics");
      }
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
        fetchStatistics(statisticsPeriod);
        fetchWorkerStats(statisticsPeriod);
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
    if (userRole && userRole.includes("superadmin")) {
      fetchStatistics(statisticsPeriod);
      fetchWorkerStats(statisticsPeriod);
    }
  }, [statisticsPeriod]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      if (searchQuery) {
        params.append("search", searchQuery);
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

  // Add function to toggle series visibility
  const toggleSeriesVisibility = (series) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }));
  };

  // Clear date filters and refresh data
  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
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
    <DashboardLayout activePage={"Dashboard"}>
      {/* Improved Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 p-3 md:p-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs sm:text-sm font-medium mb-1">Total Picked</p>
                <h3 className="text-white text-2xl sm:text-3xl font-bold">{statusCounts.picker || 0}</h3>
              </div>
              <div className="bg-blue-400 rounded-full p-2 sm:p-3">
                <FaCartFlatbed className="text-white text-xl sm:text-2xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs sm:text-sm font-medium mb-1">Total Packed</p>
                <h3 className="text-white text-2xl sm:text-3xl font-bold">{statusCounts.packing || 0}</h3>
              </div>
              <div className="bg-green-400 rounded-full p-2 sm:p-3">
                <LuPackageCheck className="text-white text-xl sm:text-2xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg relative sm:col-span-2 lg:col-span-1">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xs sm:text-sm font-medium mb-1">Total Pickout</p>
                <h3 className="text-white text-2xl sm:text-3xl font-bold">{statusCounts.pickout || 0}</h3>
              </div>
              <div className="bg-purple-400 rounded-full p-2 sm:p-3 flex items-center gap-2 cursor-pointer hover:bg-purple-300 transition-colors duration-200" onClick={toggleCountActive}>
                <FaTruck className="text-white text-xl sm:text-2xl" />
                <FaArrowCircleLeft className={`${isCountActive ? "-rotate-90" : "rotate-90"} text-white transition-all ease-in duration-300`} />
              </div>
            </div>
          </div>

          <div
            className={`w-full h-auto absolute top-full left-0 right-0 
            overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex flex-col gap-2 bg-white rounded-b-xl rounded-t-none md:rounded-xl p-3 md:p-4 shadow-lg z-20 
            transition-all duration-300 ease-in-out
            ${isCountActive ? "max-h-96 opacity-100 transform translate-y-0" : "max-h-0 opacity-0 pointer-events-none transform -translate-y-4"}`}
          >
            <div className="sticky top-0 bg-white z-10 pb-2 mb-2 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">Expedition Summary</h3>
                <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{expeditionCounts.length} couriers</span>
              </div>
              <p className="text-sm text-gray-500">Breakdown of pickout by expedition service</p>
            </div>

            {/* Date filter display */}
            <div className="flex flex-col sm:flex-row sm:items-center mt-2 gap-1 sm:gap-3">
              {(startDate || endDate) && (
                <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 py-1 px-2 rounded-md">
                  <span className="whitespace-nowrap">
                    {startDate && !endDate && `From: ${startDate}`}
                    {!startDate && endDate && `Until: ${endDate}`}
                    {startDate && endDate && `${startDate} - ${endDate}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDateFilters();
                    }}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className={`flex flex-col gap-3 md:gap-4 items-center justify-start`}>
              {loadingExpeditions && (
                <div className="py-8 flex justify-center items-center w-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              )}

              {!loadingExpeditions && expeditionCounts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-3">
                    <FaSearch className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500 font-medium">No expedition data available</p>
                  <p className="text-gray-400 text-sm mt-1">{startDate || endDate ? "No data found for the selected date range" : "Try adjusting your date filters"}</p>
                </div>
              )}

              {!loadingExpeditions &&
                expeditionCounts.map((ekspedisi, index) => {
                  return (
                    <div className={`w-full border-2 rounded-lg transition-all duration-200 overflow-hidden flex items-center cursor-pointer`} key={index}>
                      <div
                        className="flex items-center justify-center h-16 w-16 md:h-20 md:w-20 flex-shrink-0"
                        style={{ backgroundColor: `` }} // Light version of the color
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `indigo` }}>
                          <FaTruck className="text-white text-lg" />
                        </div>
                      </div>

                      <div className="flex-grow flex items-center justify-between p-3 md:p-4">
                        <div>
                          <h3 className="font-semibold text-base md:text-lg text-gray-800">{ekspedisi.nama_ekpedisi}</h3>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Courier</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="text-xs text-gray-500 font-medium">Total Packages</p>
                          <p className="font-bold text-lg md:text-2xl" style={{ color: "indigo" }}>
                            {ekspedisi.total_resi}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 p-3 md:p-4">
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 lg:col-span-2">
          <div className="flex flex-col space-y-4">
            {/* Statistics header and controls section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg md:text-xl font-semibold">Activity Statistics</h2>
              <div className="flex flex-wrap gap-2">
                {["daily", "weekly", "monthly", "yearly"].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setStatisticsPeriod(period);
                    }}
                    className={`px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg transition-all duration-200 ${
                      statisticsPeriod === period ? "bg-blue-500 text-white shadow-md transform scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Series toggle buttons with better spacing */}
            <div className="flex flex-wrap gap-2 pb-2">
              <button
                onClick={() => toggleSeriesVisibility("picker")}
                className={`px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-lg transition-all duration-200 flex items-center gap-1 ${
                  visibleSeries.picker ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 border border-blue-300"
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                Picker
              </button>
              <button
                onClick={() => toggleSeriesVisibility("packing")}
                className={`px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-lg transition-all duration-200 flex items-center gap-1 ${
                  visibleSeries.packing ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500 border border-green-300"
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                Packing
              </button>
              <button
                onClick={() => toggleSeriesVisibility("pickout")}
                className={`px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-lg transition-all duration-200 flex items-center gap-1 ${
                  visibleSeries.pickout ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500 border border-purple-300"
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                Pickout
              </button>
            </div>

            {/* Adjusted chart height for better visibility */}
            <div className="h-[350px] sm:h-[400px] lg:h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statisticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, width: 50 }}
                    interval="preserveStartEnd"
                    height={40}
                    tickFormatter={(value) => {
                      // Shorten date format on small screens
                      if (window.innerWidth < 640) {
                        return value.split(" ").slice(-1)[0]; // Just show the day or last part
                      }
                      return value;
                    }}
                  />
                  <YAxis width={40} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: "12px",
                      padding: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "none",
                      borderRadius: "4px",
                    }}
                    formatter={(value, name) => {
                      const labels = {
                        picker: "Picker Activities",
                        packing: "Packing Activities",
                        pickout: "Pickout Activities",
                      };
                      return [value, labels[name] || name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                    formatter={(value) => {
                      const statusMap = {
                        picker: "Picker",
                        packing: "Packing",
                        pickout: "Pickout",
                      };
                      return statusMap[value] || value;
                    }}
                  />
                  {visibleSeries.picker && <Line type="monotone" dataKey="picker" name="Picker" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
                  {visibleSeries.packing && <Line type="monotone" dataKey="packing" name="Packing" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
                  {visibleSeries.pickout && <Line type="monotone" dataKey="pickout" name="Pickout" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col h-full">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Worker Performance</h2>
            <div className="overflow-x-auto flex-grow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 md:px-4 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                    <th className="px-2 py-2 md:px-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Picked</th>
                    <th className="px-2 py-2 md:px-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Packed</th>
                    <th className="px-2 py-2 md:px-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Pickout</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workerStats.map((worker, index) => (
                    <tr key={worker.id_pekerja} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 md:px-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">{worker.nama_pekerja}</td>
                      <td className="px-2 py-2 md:px-3 whitespace-nowrap text-xs md:text-sm text-blue-600">{worker.picker_count}</td>
                      <td className="px-2 py-2 md:px-3 whitespace-nowrap text-xs md:text-sm text-green-600">{worker.packing_count}</td>
                      <td className="px-2 py-2 md:px-3 whitespace-nowrap text-xs md:text-sm text-purple-600">{worker.pickout_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Log Table Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col h-full">
            <div className="flex flex-col gap-4 mb-4">
              {/* Header and Description */}

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold">Activity Log</h2>
                  <p className="text-sm text-gray-500">Track all warehouse activities</p>
                </div>
                <Button className="h-full px-3 flex items-center justify-center hover:bg-gray-100 rounded-r-lg" onClick={handleExport} title="Export data">
                  <FaFileExport className="text-gray-600" /> Export
                </Button>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Date Filters */}
                <div className="flex flex-col sm:flex-row gap-2 md:w-1/2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                {/* Search and Status Filter */}
                <div className="flex flex-col sm:flex-row gap-2 md:w-1/2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                      <option value="all">All Status</option>
                      <option value="picker">Picker</option>
                      <option value="packing">Packing</option>
                      <option value="pickout">Pickout</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <Input className="w-full py-2" onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search resi or staff" prefix={<FaSearch className="text-gray-400" />} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-grow rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 md:px-4 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Resi ID</th>
                    <th className="px-2 py-2 md:px-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-2 py-2 md:px-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-2 py-2 md:px-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 md:px-4 whitespace-nowrap text-xs md:text-sm">{item.resi_id || "N/A"}</td>
                      <td className="px-2 py-2 md:px-3 whitespace-nowrap text-xs md:text-sm">{item.nama_pekerja}</td>
                      <td className="px-2 py-2 md:px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex text-xs md:text-sm px-2 py-1 rounded-full ${
                            item.status_proses === "picker" ? "bg-blue-100 text-blue-800" : item.status_proses === "packing" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {item.status_proses}
                        </span>
                      </td>
                      <td className="px-2 py-2 md:px-3 whitespace-nowrap text-xs md:text-sm text-gray-500">{moment(item.created_at).format("DD/MM HH:mm")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{pagination.currentPage}</span> of <span className="font-medium">{pagination.totalPages}</span> pages
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={pagination.currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {generatePageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => setPagination((prev) => ({ ...prev, currentPage: page }))}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          page === pagination.currentPage
                            ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
