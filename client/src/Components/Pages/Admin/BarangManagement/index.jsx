import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import SearchFragment from "../../../Fragments/SearchFragment";
import moment from "moment";
import { DatePicker, Form, Input, message, Table } from "antd";
import Button from "../../../Elements/Button";
import { MdOutlinePendingActions } from "react-icons/md";
import Title from "../../../Elements/Title";
import { MdCancelScheduleSend } from "react-icons/md";
import { IoIosCreate } from "react-icons/io";
import axios from "axios";
import Modal from "antd/es/modal/Modal";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";

const AdminBarangSection = () => {
  const [dateRange, setDateRange] = useState([null, null]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeButton, setActiveButton] = useState("Semua");
  const [barang, setBarang] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalDetailOpen, setModalDetailOpen] = useState(false);
  const [resiId, setResiId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [resiDetail, setResiDetail] = useState([]);

  const { RangePicker } = DatePicker;

  const handleSearchInput = (value) => {
    setSearchInput(value);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter") {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }
  };

  const handleDateChange = (dates) => {
    setDateRange(dates);
    setCurrentPage(1); // Reset to first page when changing dates
  };

  const handleButtonClick = (buttonName) => {
    setActiveButton(buttonName);
    setCurrentPage(1); // Reset to first page when changing status
  };

  const fetchBarang = async (page) => {
    setLoading(true);
    setError(null);
    try {
      let url = new URL("http://localhost:8080/api/v1/barang");

      // Add query parameters
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 16);

      if (searchTerm?.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (activeButton !== "Semua") {
        params.append("status", activeButton);
      }
      if (dateRange?.[0] && dateRange?.[1]) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      url.search = params.toString();

      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data?.success) {
        setBarang(response.data.data);
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
      setBarang([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarang(currentPage);
  }, [currentPage, searchTerm, activeButton, dateRange]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddResi = async () => {
    try {
      setIsSubmitting(true);
      // Validate form
      await form.validateFields();
      // const values = form.getFieldsValue();
      const values = resiId;

      const response = await axios.post(
        "http://localhost:8080/api/v1/barang",
        {
          resi_id: values,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data?.success) {
        message.success("Resi berhasil ditambahkan");
        setIsModalOpen(false);
        form.resetFields();
        // Refresh data
        fetchBarang(currentPage);
      } else {
        throw new Error(response.data?.message || "Failed to add resi");
      }
    } catch (err) {
      console.error("Error adding resi:", err);
      message.error(err.response?.data?.message || "Gagal menambahkan resi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (resi_id) => {
    axios
      .put("http://localhost:8080/api/v1/barang/" + resi_id, "", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((response) => {
        if (response.data?.success) {
          message.success("Pesanan berhasil dibatalkan");
          fetchBarang(currentPage);
        } else {
          throw new Error(response.data?.message || "Failed to cancel order");
        }
      })
      .catch((error) => {
        console.error("Error cancelling order:", error);
        message.error(error.response?.data?.message || "Gagal membatalkan pesanan");
      });
  };

  const exportHandler = () => {};

  return (
    <DashboardLayout>
      <div className="w-full h-full rounded-md flex flex-col gap-2">
        <Modal
          title="Tambah Resi Baru"
          open={isModalOpen}
          onOk={handleAddResi}
          onCancel={() => {
            setIsModalOpen(false);
            form.resetFields();
          }}
          okText="Tambah Resi"
          cancelText="Batal"
          confirmLoading={isSubmitting}
        >
          <Form form={form} layout="vertical" name="addResiForm">
            <Form.Item
              label="Resi ID"
              name="resi_id"
              rules={[
                { required: true, message: "Resi ID tidak boleh kosong!" },
                { min: 3, message: "Resi ID minimal 3 karakter" },
                {
                  pattern: /^[A-Za-z0-9]+$/,
                  message: "Resi ID hanya boleh berisi huruf dan angka",
                },
              ]}
            >
              <Input placeholder="Masukan Resi ID" maxLength={50} value={resiId} onChange={(e) => setResiId(e.target.value.toUpperCase())} />
            </Form.Item>
          </Form>
        </Modal>
        <div className="w-full h-auto bg-slate-50 rounded-md px-5 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <RangePicker onChange={handleDateChange} className="p-2 shadow-sm border border-gray-200 rounded-md" />
              <SearchFragment onSearch={handleSearchInput} onKeyPress={handleSearchSubmit} value={searchInput} placeholder="Cari nomor resi " className="w-full md:w-64" />
              <div className="flex items-center gap-4 w-32">
                <Button buttonStyle="flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg transition-all duration-300 hover:bg-green-600 text-lg shadow-sm" onClick={exportHandler}>
                  <PiMicrosoftExcelLogoFill />
                  Export
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                {["Semua", "Pending", "Picked", "Packed", "Shipped", "cancelled"].map((status) => (
                  <Button
                    key={status}
                    buttonStyle={`
                      ${activeButton === status ? "bg-blue-500 text-white" : "bg-white text-gray-700 border-2 border-blue-500"} px-6 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 
                      hover:text-white font-medium text-sm shadow-sm
                    `}
                    onClick={() => handleButtonClick(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
              <Button
                buttonStyle="bg-blue-500 flex items-center gap-2 text-white px-6 py-2 
                rounded-lg transition-all duration-300 hover:bg-blue-600 shadow-sm"
                onClick={() => setIsModalOpen(true)}
              >
                <IoIosCreate className="text-lg" />
                <span className="font-medium text-sm whitespace-nowrap">Buat Resi</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="content-card w-full h-[66vh] p-5 rounded-lg shadow-lg overflow-y-auto bg-slate-50 relative">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative">
              <Modal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" open={isModalDetailOpen} onCancel={() => setModalDetailOpen(false)} title="Detail Resi" footer={null}>
                <Table dataSource={resiDetail} pagination={false}>
                  <Table.Column title="Resi ID" dataIndex="resi_id" key="resi_id" />
                  <Table.Column title="Nama Pekerja" dataIndex="nama_pekerja" key="nama_pekerja" />
                  <Table.Column title="Status" dataIndex="jenis_pekerja" key="status_barang" />
                  <Table.Column title="Created At" dataIndex="created_at" key="created_at" render={(text) => moment(text).format("DD/MM/YYYY HH:mm:ss")} />
                </Table>
              </Modal>
              {barang.map((item) => {
                return (
                  <div
                    key={item.resi_id}
                    className="card bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer "
                    onClick={() => {
                      setModalDetailOpen(true);

                      axios
                        .get("http://localhost:8080/api/v1/barang/" + item.resi_id, {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                          },
                        })
                        .then((response) => {
                          if (response.data?.success) {
                            console.log(response.data.data);
                            setResiDetail(response.data.data);
                          }
                        })
                        .catch((error) => {
                          console.error("Error fetching barang detail:", error);
                        });
                    }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                          <MdOutlinePendingActions className={`text-2xl ${item.status_barang === "pending" ? "text-yellow-500" : item.status === "picked" ? "text-blue-500" : item.status === "packed" ? "text-green-500" : "text-red-500"}`} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-2">
                          <Title titleStyle="text-lg font-bold text-gray-800">{item.resi_id}</Title>
                          <span className="text-sm text-gray-500">
                            {item.status_description} {item.status !== "pending" ? "oleh" : ""} {item.nama_pekerja}
                          </span>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="text-xs text-gray-500">Last Scan : {!item.last_scan ? "Belum di scan" : moment(item.last_scan).format("DD/MM/YYYY")}</span>
                        </div>
                      </div>
                    </div>
                    {item.status === "pending" && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button onClick={() => handleCancelOrder(item.resi_id)} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-1 rounded-md transition-colors">
                          <MdCancelScheduleSend className="text-lg" />
                          <span className="text-sm font-medium">Cancel Order</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="pagination flex items-center justify-end gap-4 my-5">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-all duration-300 disabled:opacity-50">
                Previous
              </button>
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-all duration-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBarangSection;
