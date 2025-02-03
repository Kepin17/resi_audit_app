import axios from "axios";
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Card, DatePicker, Input } from "antd";
import moment from "moment";

const { RangePicker } = DatePicker;
const { Search } = Input;

const LogLoginPage = () => {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get("http://localhost:8080/api/v1/auth/log", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const logsWithKey = res.data.data.map((log) => ({
          ...log,
          key: log.id_log,
        }));
        setLogs(logsWithKey);
        setFilteredLogs(logsWithKey);
      } catch (err) {
        console.log(err);
      }
    };

    fetchLogs();
  }, []);

  const handleDateChange = (dates) => {
    setDateRange(dates);
    filterLogs(dates, searchTerm);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    filterLogs(dateRange, value);
  };

  const filterLogs = (dates, term) => {
    let filtered = logs;
    if (dates && dates[0] && dates[1]) {
      const [start, end] = dates;
      filtered = filtered.filter((log) => {
        const logDate = moment(log.login_time);
        return logDate.isBetween(start, end, null, "[]");
      });
    }
    if (term) {
      filtered = filtered.filter((log) => log.nama_pekerja.toLowerCase().includes(term.toLowerCase()));
    }
    setFilteredLogs(filtered);
  };

  return (
    <DashboardLayout>
      <div className="w-full h-[84vh] bg-slate-200 rounded-md p-4 overflow-y-scroll">
        <div className="mb-4 flex space-x-4">
          <RangePicker onChange={handleDateChange} />
          <Search placeholder="Search by Nama Pekerja" onSearch={handleSearch} enterButton />
        </div>
        {filteredLogs.map((log) => {
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
      </div>
    </DashboardLayout>
  );
};

export default LogLoginPage;
