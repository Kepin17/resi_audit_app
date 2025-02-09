import axios from "axios";
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Card, DatePicker } from "antd";
import SearchFragment from "../../../Fragments/SearchFragment";
import urlApi from "../../../../utils/url";

const { RangePicker } = DatePicker;
const LogLoginPage = () => {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const [filteredLogs, setFilteredLogs] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const fetchBarang = async (page) => {
        setLoading(true);
        setError(null);
        try {
          let url = new URL(`${urlApi}/api/v1/auth/log`);

          // Add query parameters
          const params = new URLSearchParams();
          params.append("page", page);
          params.append("limit", 16);

          if (searchTerm?.trim()) {
            params.append("search", searchTerm.trim());
          }

          if (dateRange?.[0] && dateRange?.[1]) {
            // Add time to dates to capture full day
            const startDate = dateRange[0].startOf("day").format("YYYY-MM-DD HH:mm:ss");
            const endDate = dateRange[1].endOf("day").format("YYYY-MM-DD HH:mm:ss");
            params.append("startDate", startDate);
            params.append("endDate", endDate);
          }

          url.search = params.toString();

          const response = await axios.get(url.toString(), {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (response.data?.success) {
            setFilteredLogs(response.data.data);
            setTotalPages(response.data.pagination.totalPages);
          } else {
            throw new Error(response.data?.message || "Invalid response format");
          }
        } catch (error) {
          let errorMessage = "Failed to fetch barang data";
          if (error.response) {
            // Handle specific HTTP error responses
            if (error.response.status === 500) {
              errorMessage = "Server error. Please try again later.";
            } else {
              errorMessage = error.response.data?.message || errorMessage;
            }
          }
          setError(errorMessage);
          console.error("Error fetching barang:", error);
          setFilteredLogs([]);
          setTotalPages(1);
        } finally {
          setLoading(false);
        }
      };

      await fetchBarang(page);
    } catch (error) {
      setError("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage, searchTerm, dateRange]);

  const handleDateChange = (dates) => {
    setDateRange(dates);
    setCurrentPage(1); // Reset to first page when changing dates
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearchInput = (value) => {
    setSearchInput(value);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter") {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-[84vh] bg-slate-200 rounded-md p-4 overflow-y-scroll">
        <div className="mb-4 flex space-x-4">
          <RangePicker onChange={handleDateChange} format="YYYY-MM-DD HH:mm:ss" showTime={{ format: "HH:mm:ss" }} />
          <SearchFragment onSearch={handleSearchInput} onKeyPress={handleSearchSubmit} value={searchInput} placeholder="Cari nama " className="w-full md:w-64" />
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {!loading &&
          !error &&
          filteredLogs.map((log) => {
            const device = log.device_info;
            const devicejson = JSON.parse(device);
            return (
              <Card key={log.id_log} className="mb-4">
                <p>
                  <strong>Nama Pekerja:</strong> {log.nama_pekerja}
                </p>
                <p>
                  <strong>IP Address:</strong> {log.ip_address}
                </p>
                <p>
                  <strong>Last Login:</strong> {formatDate(log.login_time)}
                </p>

                <p>
                  <strong>Device:</strong> {devicejson.device_type}
                </p>

                <p>
                  <strong>OS:</strong> {devicejson.os}
                </p>

                <p>
                  <strong>Browser:</strong> {devicejson.browser}
                </p>
              </Card>
            );
          })}
        {totalPages > 1 && (
          <div className="pagination flex items-center justify-end gap-2 my-5">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-all duration-300 disabled:opacity-50">
              Previous
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              // Only show 5 page numbers around current page
              if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-3 py-1 rounded-md ${currentPage === pageNumber ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-50"} border border-blue-500 transition-all duration-300`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                return (
                  <span key={pageNumber} className="px-2">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-all duration-300 disabled:opacity-50">
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LogLoginPage;
