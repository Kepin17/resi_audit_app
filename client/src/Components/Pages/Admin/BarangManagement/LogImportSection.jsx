import React, { useEffect, useState } from "react";
import { DatePicker, message, Pagination, Empty } from "antd";
import Button from "../../../Elements/Button";
import axios from "axios";
import urlApi from "../../../../utils/url";
import { FaDownload, FaFileExcel } from "react-icons/fa";
import moment from "moment";

const LogImportSection = ({ openImportMenu, openImportMenuHandler, title }) => {
  const { RangePicker } = DatePicker;
  const [logData, setLogData] = useState({
    data: [],
    pagination: {
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 5,
    },
  });
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const getLogData = async (page = 1, dates = null) => {
    try {
      setLoading(true);
      let url;
      if (title === "barang") {
        url = `${urlApi}/api/v1/barang-impor-log?page=${page}&limit=${logData.pagination.limit}`;
      } else {
        url = `${urlApi}/api/v1/barang-retur-log?page=${page}&limit=${logData.pagination.limit}`;
      }

      if (dates) {
        url += `&startDate=${dates[0]}&endDate=${dates[1]}`;
      }

      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setLogData({
        data: res.data.data,
        pagination: res.data.pagination,
      });
    } catch (err) {
      message.error(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates, dateStrings) => {
    setDateRange(dateStrings);
    if (dates) {
      getLogData(1, dateStrings);
    } else {
      getLogData(1);
    }
  };

  const handlePageChange = (page) => {
    getLogData(page, dateRange);
  };

  const handleExport = async (imporDate) => {
    try {
      let url;
      if (title === "barang") {
        url = `${urlApi}/api/v1/barang-impor-log/export?imporDate=${imporDate}`;
      } else {
        url = `${urlApi}/api/v1/barang-retur-log/download?imporDate=${imporDate}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      if (!response.data) {
        throw new Error("No data received");
      }

      const contentType = response.headers["content-type"];
      if (!contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
        throw new Error("Invalid file format received");
      }

      // Buat file download
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `import_log_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      message.error("Failed to export data: " + err.message);
    }
  };

  useEffect(() => {
    getLogData();
  }, []);

  return (
    <div
      className={`absolute top-0 w-[30rem] h-[100vh] bg-slate-100 shadow-md z-50 rounded-md
        transition-all ease-in-out duration-200 p-5 ${openImportMenu ? "right-0" : "-right-[100rem]"}`}
    >
      <div className="flex flex-col gap-4"></div>
      <div className="flex items-center gap-2">
        <RangePicker className="px-4 py-2 flex-1" onChange={handleDateRangeChange} showTime />

        <Button buttonStyle="bg-red-500 text-white px-4 py-2 rounded-md" onClick={openImportMenuHandler}>
          Close
        </Button>
      </div>

      <div className="excel-card my-5 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-180px)]">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : logData.data.length > 0 ? (
          logData.data.map((item, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">{moment(item.created_at).format("DD MMM YYYY HH:mm:ss")}</h3>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Total: {item.total_entries}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="success flex items-center gap-1 text-green-500">
                    <FaFileExcel />
                    <span className="font-semibold"></span> {item.success_count}
                  </div>
                  <div className="duplicate flex items-center gap-1 text-yellow-500">
                    <FaFileExcel />
                    <span className="font-semibold"></span> {item.duplicate_count}
                  </div>

                  <div className="failed flex items-center gap-1 text-red-500">
                    <FaFileExcel />
                    <span className="font-semibold"></span> {item.failed_count}
                  </div>
                </div>
                <div
                  className="bg-slate-800 shadow-lg p-2 rounded-md mt-3"
                  onClick={() => {
                    handleExport(moment(item.created_at).format("YYYY-MM-DD HH:mm:ss"));
                    console.log(moment(item.created_at).format("YYYY-MM-DD HH:mm:ss"));
                  }}
                >
                  <FaDownload className="text-2xl text-gray-400 cursor-pointer hover:text-gray-200" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <Empty description="No import logs found" />
        )}
      </div>

      {logData.data.length > 0 && (
        <div className="flex justify-center mt-4">
          <Pagination current={logData.pagination.currentPage} total={logData.pagination.totalItems} pageSize={logData.pagination.limit} onChange={handlePageChange} showSizeChanger={false} />
        </div>
      )}
    </div>
  );
};

export default LogImportSection;
