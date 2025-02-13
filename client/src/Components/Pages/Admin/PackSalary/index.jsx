import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import Title from "../../../Elements/Title";
import { MdCancel, MdEdit } from "react-icons/md";
import { GiConfirmed } from "react-icons/gi";
import { Table, DatePicker, Input, Modal, message, Button } from "antd";
import Form from "../../../Elements/Form";
import InputFragment from "../../../Fragments/InputFragment";
import { MdPayments } from "react-icons/md";
const { RangePicker } = DatePicker;
const { Search } = Input;
import moment from "moment";
import axios from "axios";
import ExcelActionModal from "../../../Fragments/ExcelActionModal";
import urlApi from "../../../../utils/url";
import { jwtDecode } from "jwt-decode";

const PackSalary = () => {
  const [isEdit, setisEdit] = useState(false);
  const [form, setForm] = useState({
    total_gaji_per_scan: 0,
  });

  const [source, setSource] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0); // Add this state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false); // Add this line
  const [openModal, setOpenModal] = useState(false);
  const [user, setUser] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalWorkers: 0,
    totalPayments: 0,
    activePacking: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

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
            id_gaji: res.data.data[0].id_gaji, // Add this line
          });
        })
        .catch((err) => {
          message.error("Failed to fetch salary data");
        });
    }
  }, [user]);

  const fetchGajiPacking = async (page, pageSize, searchValue) => {
    try {
      let url = new URL(`${urlApi}/api/v1/gaji/packing`);

      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", pageSize);

      if (searchValue?.trim()) {
        params.append("search", searchValue.trim());
      }
      if (dateRange?.[0] && dateRange?.[1]) {
        // Set the time to start of day for start date and end of day for end date
        const startDate = dateRange[0].startOf("day").toISOString();
        const endDate = dateRange[1].endOf("day").toISOString();
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
        setSource(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems); // Add this line
      }
    } catch (err) {
      if (err.response) {
        message.error(err.response.data.message);
        setSource([]);
        setTotalPages(1);
      }
    }
  };

  useEffect(() => {
    fetchGajiPacking(currentPage, pageSize, searchText);
  }, [currentPage, pageSize, searchText, dateRange]);

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
    if (!selectedRecord) return;

    setLoading(true);
    try {
      const response = await axios.put(
        `${urlApi}/api/v1/gaji/packing/${selectedRecord.id_gaji_pegawai}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data?.success) {
        Modal.success({
          title: "Payment Success",
          content: "The payment has been processed successfully",
        });
        fetchGajiPacking(currentPage, pageSize, searchText);
        fetchTodayStats(); // Refetch stats after successful payment
      }
    } catch (err) {
      Modal.error({
        title: "Payment Failed",
        content: err.response?.data?.message || "An error occurred while processing the payment",
      });
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
      title: "Last Update",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (text) => formatDate(text),
    },

    {
      title: "Status dibayar",
      dataIndex: "is_dibayar",
      key: "is_dibayar",
      render: (text) => (text ? <span className="bg-green-200 p-2 rounded-md text-green-600 font-bold">Sudah Dibayar</span> : <span className="bg-red-200 p-2 rounded-md text-red-600 font-bold">Belum Dibayar</span>),
    },

    {
      title: "Action",
      dataIndex: "view",
      key: "updated_at",
      render: (text, record) => (
        <button
          className={`${record.is_dibayar ? "bg-gray-500 hover:bg-gray-600" : "bg-blue-500 hover:bg-blue-600"} text-white p-2 rounded-lg transition duration-300 flex items-center gap-2`}
          onClick={() => {
            setSelectedRecord(record);
            setIsModalVisible(true);
          }}
          disabled={record.is_dibayar}
        >
          <MdPayments className="text-xl" /> Payment
        </button>
      ),
    },
  ];

  const handleSalaryUpdate = async () => {
    if (!user?.roles?.includes("superadmin")) return;

    setUpdateLoading(true);
    try {
      await axios.put(
        `${urlApi}/api/v1/gaji/${form.id_gaji}`, // Updated endpoint with id_gaji
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
    setCurrentPage(1);
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
      console.error("Error exporting file:", error);
      message.error("Gagal mengexport file");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full bg-white rounded-lg shadow-md p-6">
        {/* Modified Card Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Current Salary Rate</p>
                <h2 className="text-2xl font-bold mt-2">{formatRupiah(form.total_gaji_per_scan)}</h2>
                <p className="text-xs opacity-70 mt-2">Per Item Today</p>
              </div>
              <div className="text-4xl opacity-80">
                <MdPayments />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Active Workers Today</p>
                <h2 className="text-2xl font-bold mt-2">{statsLoading ? "Loading..." : todayStats.totalWorkers}</h2>
                <p className="text-xs opacity-70 mt-2">{statsLoading ? "Loading..." : `${todayStats.activePacking} Items Packed`}</p>
              </div>
              <div className="text-4xl opacity-80">
                <MdEdit />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Today's Total Payments</p>
                <h2 className="text-2xl font-bold mt-2">{formatRupiah(todayStats.totalPayments)}</h2>
                <p className="text-xs opacity-70 mt-2">{moment().format("DD MMMM YYYY")}</p>
              </div>
              <div className="text-4xl opacity-80">
                <GiConfirmed />
              </div>
            </div>
          </div>
        </div>

        {/* Modified Salary Control Section */}
        <div className="w-full h-auto bg-gray-50 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <Title className="text-gray-700">Packing Salary Management</Title>
            <Button type="primary" onClick={handleExport} loading={exportLoading} className="flex items-center gap-2 h-12 px-6 text-lg" icon={<MdPayments className="text-xl" />}>
              Export Data
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex gap-4 items-start w-full">
              {user?.roles?.includes("superadmin") && (
                <>
                  <Form onSubmit={handleSubmit} className="flex-1">
                    <InputFragment
                      htmlFor={"total_gaji_per_scan"}
                      InputType="number"
                      isJustNumber={true}
                      inputName={"total_gaji_per_scan"}
                      inputValue={form.total_gaji_per_scan}
                      isDisabled={!isEdit}
                      inputOnChange={handleInputChange}
                      className="w-full h-12" // Added fixed height
                    >
                      Salary Rate Per Item
                    </InputFragment>
                  </Form>
                  <button
                    className={`h-12 px-6 rounded-lg text-white flex items-center gap-2 transition-all duration-300 ${isEdit ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
                    onClick={() => setisEdit(!isEdit)}
                    disabled={updateLoading}
                  >
                    {!isEdit ? (
                      <>
                        <MdEdit className="text-xl" /> Edit Rate
                      </>
                    ) : (
                      <>
                        <MdCancel className="text-xl" /> Cancel
                      </>
                    )}
                  </button>
                  {isEdit && (
                    <button className="h-12 px-6 bg-green-500 hover:bg-green-600 rounded-lg text-white flex items-center gap-2 transition-all duration-300" onClick={handleSubmit} disabled={updateLoading}>
                      <GiConfirmed className="text-xl" /> Save
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-4">
              <RangePicker
                onChange={handleDateChange}
                showTime={false}
                allowSame={true}
                format="YYYY-MM-DD"
                className="flex-1 h-12" // Added fixed height
              />
              <Search
                placeholder="Search by Name"
                onSearch={handleSearch}
                enterButton
                className="flex-1 h-12" // Added fixed height
                size="large" // Makes the search input larger
              />
            </div>
          </div>
        </div>

        {/* Enhanced Table Section */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <Table
            columns={coloms}
            rowKey="id_gaji_pegawai"
            dataSource={source}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalItems,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} items`,
              className: "px-6",
            }}
            onChange={handleTableChange}
            className="custom-table"
          />
        </div>

        {/* Fix Modal Structure */}
        <Modal
          title="Confirm Payment"
          open={isModalVisible}
          onOk={handlePayment}
          onCancel={() => {
            setIsModalVisible(false);
            setSelectedRecord(null);
          }}
          confirmLoading={loading}
        >
          <p>Are you sure you want to process the payment for {selectedRecord?.nama_pekerja}?</p>
          <p>Total amount: {selectedRecord ? formatRupiah(selectedRecord.gaji_total) : ""}</p>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default PackSalary;
