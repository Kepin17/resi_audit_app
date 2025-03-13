import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import Title from "../../../Elements/Title";
import { MdCancel, MdEdit, MdOutlineAnalytics } from "react-icons/md";
import { GiConfirmed } from "react-icons/gi";
import { Table, DatePicker, Input, Modal, message, Button, Skeleton, Tag } from "antd";
import Form from "../../../Elements/Form";
import InputFragment from "../../../Fragments/InputFragment";
import { MdPayments } from "react-icons/md";
import { BsPeopleFill, BsCalendarCheck } from "react-icons/bs";
import "./styles.css"; // Import the custom styles
const { RangePicker } = DatePicker;
const { Search } = Input;
import moment from "moment";
import axios from "axios";
import urlApi from "../../../../utils/url";
import { jwtDecode } from "jwt-decode";
import { FaHistory } from "react-icons/fa";

const PackSalary = () => {
  const [isEdit, setisEdit] = useState(false);
  const [form, setForm] = useState({
    total_gaji_per_scan: 0,
  });

  const [source, setSource] = useState([]);
  const [packingStaff, setPackingStaff] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Changed from 3 to 10
  const [totalItems, setTotalItems] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState("");
  const [statusBayar, setStatusBayar] = useState("");
  const [todayStats, setTodayStats] = useState({
    totalWorkers: 0,
    totalPayments: 0,
    activePacking: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalBayar, setTotalBayar] = useState(0);
  const [historyPagination, setHistoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  useEffect(() => {
    const token = localStorage.getItem("token");
    const decodedUser = jwtDecode(token);
    setUser(decodedUser);
  }, []);

  useEffect(() => {
    if (user?.roles?.includes("superadmin")) {
      axios
        .get(`${urlApi}/api/v1/gaji`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then((res) => {
          setForm({
            ...form,
            total_gaji_per_scan: res.data.data[0].total_gaji_per_scan,
            id_gaji: res.data.data[0].id_gaji,
          });
        })
        .catch((err) => {
          message.error("Failed to fetch salary data");
        });
    }
  }, [user]);

  const showPackingStaff = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${urlApi}/api/v1/auth/packing-staff`, {
        params: {
          page: currentPage,
          limit: pageSize,
          search: searchText.trim(),
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setPackingStaff(response.data.data);
      setTotalItems(response.data.pagination.totalItems);
    } catch (error) {
      message.error("Failed to fetch packing staff data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    showPackingStaff();
  }, [currentPage, pageSize, searchText]);

  const fetchTodayStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const today = moment().format("YYYY-MM-DD");
      const response = await axios.get(`${urlApi}/api/v1/packing/stats`, {
        params: { date: today },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data?.success) {
        setTodayStats({
          totalWorkers: response.data.data.totalWorkers || 0,
          totalPayments: response.data.data.totalPayments || 0,
          activePacking: response.data.data.activePacking || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching today's stats:", err);
      message.error(err.response?.data?.message || "Failed to fetch today's statistics");
      setTodayStats({
        totalWorkers: 0,
        totalPayments: 0,
        activePacking: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(number);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${urlApi}/api/v1/gaji/packing-pay`,
        {
          id_gaji_pegawai_list: source.map((item) => item.id_gaji_pegawai),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data?.success) {
        Modal.success({
          title: "Pembayaran Berhasil",
          content: response.data.message,
        });
        // Refresh data
        axios
          .get(`${urlApi}/api/v1/auth/packing-staff`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
          .then((res) => {
            setPackingStaff(res.data.data);
          });
        fetchTodayStats();
      }
    } catch (err) {
      Modal.error({
        title: "Pembayaran Gagal",
        content: err.response?.data?.message || "Terjadi kesalahan saat memproses pembayaran",
      });
      console.error("Payment error:", err);
    } finally {
      setLoading(false);
      setIsModalVisible(false);
      setSelectedRecord(null);
    }
  };

  const coloms = [
    {
      title: "Nama Pekerja",
      dataIndex: "nama_pekerja",
      key: "nama_pekerja",
    },
    {
      title: "Gaji Saat ini",
      dataIndex: "gaji_total",
      key: "gaji_total",
      render: (text) => formatRupiah(text),
    },
    {
      title: "Total Packing",
      dataIndex: "jumlah_scan",
      key: "jumlah_scan",
    },
    {
      title: "Last Scan",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (text) => formatDate(text),
    },
  ];

  const packingStaffCol = [
    {
      title: "Nama Pekerja",
      dataIndex: "nama_pekerja",
      key: "nama_pekerja",
      render: (text) => (
        <div className="flex items-center gap-2">
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: "Belum Dibayar",
      dataIndex: "gaji_pokok",
      key: "gaji_pokok",
      render: (text, record) => (
        <Tag color={text == 0 ? "green" : "red"} key={record.id_gaji_pegawai}>
          {text == 0 ? "Sudah Dibayar" : "Belum Dibayar"}
        </Tag>
      ),
    },

    {
      title: "Action",
      dataIndex: "view",
      key: "action",
      render: (text, record) => (
        <div className="flex gap-2">
          <Button
            type={record.is_dibayar ? "default" : "primary"}
            id={record.id_pekerja}
            className={`action-button ${record.is_dibayar ? "bg-gray-100" : "bg-blue-50 text-blue-600"}`}
            onClick={() => {
              setSelectedRecord(record);
              setIsModalVisible(true);
              setModalStatus("belum_dibayar");
              axios
                .get(`${urlApi}/api/v1/gaji/packing/${record.id_pekerja}`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                })
                .then((res) => {
                  setSource(res.data.data);
                  setTotalBayar(res.data.totalGaji);
                  if (res.data.data.length > 0) {
                    setSelectedRecord({
                      ...record,
                      id_gaji_pegawai: res.data.data[0].id_gaji_pegawai,
                    });
                  }
                })
                .catch((err) => {
                  message.error("Failed to fetch salary data");
                });
            }}
            disabled={!user?.roles?.includes("superadmin") || record.is_dibayar === 1 ? true : record.is_dibayar}
            icon={<MdPayments />}
          >
            Payment
          </Button>

          <Button className="action-button bg-orange-50 text-orange-600" onClick={() => handleHistoryClick(record)}>
            <FaHistory />
            Payment History
          </Button>
        </div>
      ),
    },
  ];

  const handleSalaryUpdate = async () => {
    if (!user?.roles?.includes("superadmin")) return;

    setUpdateLoading(true);
    try {
      await axios.put(
        `${urlApi}/api/v1/gaji/${form.id_gaji}`,
        { total_gaji_per_scan: form.total_gaji_per_scan },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      message.success("Salary updated successfully");
      setisEdit(false);
    } catch (error) {
      console.error("Salary update error:", error);
      message.error(error.response?.data?.message || "Failed to update salary");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSalaryUpdate();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, total_gaji_per_scan: value < 0 ? 0 : value });
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDateChange = (dates) => {
    setDateRange(dates);
  };

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);

      // Build query parameters
      const params = new URLSearchParams();

      if (searchText?.trim()) {
        params.append("search", searchText.trim());
      }

      if (dateRange?.[0] && dateRange?.[1]) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      if (statusBayar) {
        params.append("is_dibayar", statusBayar === "Sudah Dibayar" ? 1 : 0);
      }

      const response = await axios.get(`${urlApi}/api/v1/gaji/packing-export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
        responseEncoding: "binary",
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = `gaji_packing_${moment().format("YYYY-MM-DD")}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success("File berhasil diexport");
    } catch (error) {
      message.error(error.response?.data?.message || "Gagal mengekspor data");
    } finally {
      setExportLoading(false);
    }
  };

  const handleHistoryTableChange = (pagination) => {
    setHistoryPagination((prev) => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }));

    // Refetch data with new pagination
    axios
      .get(`${urlApi}/api/v1/gaji/packing-sudahdibayar/${selectedRecord.id_pekerja}`, {
        params: {
          page: pagination.current,
          limit: pagination.pageSize,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setSource(res.data.data);
        setTotalBayar(res.data.totalGaji);
        setHistoryPagination((prev) => ({
          ...prev,
          total: res.data.pagination.totalItems,
        }));
      })
      .catch((err) => {
        message.error("Failed to fetch payment history");
      });
  };

  const handleHistoryClick = (record) => {
    setSelectedRecord(record);
    setModalStatus("sudah_dibayar");
    setIsModalVisible(true);

    axios
      .get(`${urlApi}/api/v1/gaji/packing-sudahdibayar/${record.id_pekerja}`, {
        params: {
          page: 1,
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setSource(res.data.data);
        setTotalBayar(res.data.totalGaji);
        setHistoryPagination({
          current: 1,
          pageSize: 10,
          total: res.data.pagination.totalItems,
        });
      })
      .catch((err) => {
        message.error("Failed to fetch payment history");
      });
  };

  return (
    <DashboardLayout activePage="Packing Salary">
      <div className="w-full h-full bg-white rounded-xl shadow-sm p-6">
        {/* Stats Cards - Modern & Minimalist Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {/* Card 1 - Salary Rate */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative stats-card">
            <div className="absolute w-24 h-24 -right-6 -top-6 rounded-full bg-blue-50 opacity-70"></div>
            <div className="text-blue-600 mb-1">
              <MdPayments className="text-3xl" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Salary Rate</h3>
            <div className="flex items-baseline">
              <h2 className="text-2xl font-bold text-gray-800">{formatRupiah(form.total_gaji_per_scan)}</h2>
            </div>
            <p className="text-xs text-gray-500 mt-2">Per Item Today</p>
          </div>

          {/* Card 2 - Workers */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative stats-card">
            <div className="absolute w-24 h-24 -right-6 -top-6 rounded-full bg-green-50 opacity-70"></div>
            <div className="text-green-600 mb-1">
              <BsPeopleFill className="text-3xl" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Packing Workers Today</h3>
            {statsLoading ? (
              <Skeleton.Button active size="small" className="w-16 h-8" />
            ) : (
              <div className="flex items-baseline">
                <h2 className="text-2xl font-bold text-gray-800">{todayStats.totalWorkers}</h2>
                <span className="text-xs text-gray-500 ml-2">workers</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Active Packing: {statsLoading ? "-" : todayStats.activePacking}</p>
          </div>

          {/* Card 3 - Payments */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative stats-card">
            <div className="absolute w-24 h-24 -right-6 -top-6 rounded-full bg-purple-50 opacity-70"></div>
            <div className="text-purple-600 mb-1">
              <BsCalendarCheck className="text-3xl" />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Today's Total Payments</h3>
            {statsLoading ? (
              <Skeleton.Button active size="small" className="w-24 h-8" />
            ) : (
              <div className="flex items-baseline">
                <h2 className="text-2xl font-bold text-gray-800">{formatRupiah(todayStats.totalPayments)}</h2>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">{moment().format("DD MMMM YYYY")}</p>
          </div>
        </div>

        {/* Salary Management Section - Simplified & Modern */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <Title className="text-xl font-medium text-gray-800 mb-4 sm:mb-0">Packing Salary Management</Title>
            <Button type="primary" onClick={handleExport} loading={exportLoading} icon={<MdOutlineAnalytics />} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 border-none rounded-lg h-10">
              Export Data
            </Button>
          </div>

          {user?.roles?.includes("superadmin") && (
            <div className="bg-gray-50 p-5 rounded-xl mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-4">Salary Rate Configuration</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Form onSubmit={handleSubmit} className="flex-1 w-full">
                  <InputFragment
                    htmlFor={"total_gaji_per_scan"}
                    InputType="number"
                    isJustNumber={true}
                    inputName={"total_gaji_per_scan"}
                    inputValue={form.total_gaji_per_scan}
                    isDisabled={!isEdit}
                    inputOnChange={handleInputChange}
                    className="w-full h-10"
                  >
                    Salary Rate Per Item
                  </InputFragment>
                </Form>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    className={`h-10 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 ${isEdit ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
                    onClick={() => setisEdit(!isEdit)}
                    disabled={updateLoading}
                    icon={!isEdit ? <MdEdit className="text-lg" /> : <MdCancel className="text-lg" />}
                  >
                    {!isEdit ? "Edit Rate" : "Cancel"}
                  </Button>
                  {isEdit && (
                    <Button
                      className="h-10 px-4 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-2 transition-all duration-300"
                      onClick={handleSubmit}
                      disabled={updateLoading}
                      loading={updateLoading}
                      icon={<GiConfirmed className="text-lg" />}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <Search placeholder="Search by name" onSearch={handleSearch} allowClear className="flex-1 h-10" size="middle" />
        </div>

        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <Table
            columns={packingStaffCol}
            rowKey="id_gaji_pegawai"
            dataSource={packingStaff}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalItems,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} items`,
              className: "p-6",
              size: "default",
              responsive: true,
              position: ["bottomCenter"],
            }}
            onChange={handleTableChange}
            className="custom-minimal-table"
            rowClassName={() => "hover:bg-gray-50 transition-colors"}
            scroll={{ x: "max-content" }}
            size="middle"
            loading={loading}
          />
        </div>

        {/* Modernized Modal */}
        <Modal
          width={1000}
          title={<span className="text-lg">{modalStatus === "sudah_dibayar" ? "History Pembayaran" : "Confirm Payment"} </span>}
          open={isModalVisible}
          onOk={handlePayment}
          footer={modalStatus === "sudah_dibayar" ? null : undefined}
          onCancel={() => {
            setIsModalVisible(false);
            setSelectedRecord(null);
          }}
          confirmLoading={loading}
          okText="Process Payment"
          okType="primary"
          okButtonProps={{
            className: "bg-blue-600 hover:bg-blue-700 border-none",
            size: "middle",
          }}
          cancelButtonProps={{ size: "middle" }}
          centered
        >
          <div className="py-4">
            <p className={`text-gray-700 ${modalStatus === "sudah_dibayar" ? "hidden" : ""}`}>Are you sure you want to process the payment for:</p>
            <p className="font-bold text-lg mt-2 mb-4">{selectedRecord?.nama_pekerja}</p>
            {/* Table Section - Clean & Modern */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <Table
                columns={coloms}
                rowKey="id_gaji_pegawai"
                dataSource={source}
                onChange={handleTableChange}
                pagination={
                  modalStatus === "sudah_dibayar"
                    ? {
                        ...historyPagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Total ${total} items`,
                        onChange: handleHistoryTableChange,
                      }
                    : false
                }
                className="custom-minimal-table"
                rowClassName={() => "hover:bg-gray-50 transition-colors"}
                scroll={{ x: "max-content" }}
                size="middle"
                loading={loading}
              />
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total amount:</span>
                <span className="font-bold text-lg">{totalBayar ? formatRupiah(totalBayar) : ""}</span>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default PackSalary;
