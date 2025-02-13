import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import SearchFragment from "../../../Fragments/SearchFragment";
import moment from "moment";
import { DatePicker, Form, Input, message, Table } from "antd";
import Button from "../../../Elements/Button";
import { MdOutlinePendingActions, MdLocalShipping } from "react-icons/md";
import { MdCancelScheduleSend } from "react-icons/md";
import { IoIosCreate } from "react-icons/io";
import axios from "axios";
import Modal from "antd/es/modal/Modal";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { TbCancel } from "react-icons/tb";
import { FaBoxArchive, FaBoxesPacking, FaRotate, FaSort } from "react-icons/fa6";
import urlApi from "../../../../utils/url";
import { PiNoteBlankFill } from "react-icons/pi";
import { jwtDecode } from "jwt-decode";

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
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [form] = Form.useForm();
  const [resiDetail, setResiDetail] = useState([]);
  const [Img, setImg] = useState("");
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [getJenisPekerja, setJenisPekerja] = useState("");
  const [totalDeg, setTotalDeg] = useState(0);
  const [exportModal, setExportModal] = useState(false);
  const [user, setUser] = useState(null);
  const { RangePicker } = DatePicker;
  const [sortBy, setSortBy] = useState("newest"); // Add this state

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = jwtDecode(token);
    setUser(user);
  }, []);

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
      let url = new URL(`${urlApi}/api/v1/barang`);

      // Add query parameters
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 16);
      params.append("sortBy", sortBy); // Add sort parameter

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
  }, [currentPage, searchTerm, activeButton, dateRange, sortBy]);

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
        `${urlApi}/api/v1/barang`,
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
    try {
      // Show confirmation modal before cancelling
      Modal.confirm({
        title: "Konfirmasi Pembatalan",
        content: `Apakah anda yakin ingin membatalkan resi ${resi_id}?`,
        okText: "Ya, Batalkan",
        cancelText: "Tidak",
        onOk: async () => {
          try {
            message.loading({ content: "Membatalkan pesanan...", key: "cancelOrder" });

            const response = await axios.put(
              `${urlApi}/api/v1/barang-cancel/${resi_id}`,
              { resi_id }, // Add resi_id to request body
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (response.data?.success) {
              message.success({
                content: "Pesanan berhasil dibatalkan",
                key: "cancelOrder",
                duration: 3,
              });
              fetchBarang(currentPage);
            } else {
              throw new Error(response.data?.message || "Failed to cancel order");
            }
          } catch (error) {
            console.error("Error cancelling order:", error);
            let errorMsg = "Gagal membatalkan pesanan";

            if (error.response?.status === 404) {
              errorMsg = "Resi tidak ditemukan";
            } else if (error.response?.data?.message) {
              errorMsg = error.response.data.message;
            }

            message.error({
              content: errorMsg,
              key: "cancelOrder",
              duration: 3,
            });
          }
        },
      });
    } catch (error) {
      console.error("Error in confirmation modal:", error);
      message.error("Terjadi kesalahan sistem");
    }
  };

  const ImportFromExcelHandler = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";

    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
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

        setImportLoading(true);
        message.loading({ content: "Mengimport data...", key: "import" });

        const formData = new FormData();
        formData.append("file", file); // Changed field name to 'file'

        const response = await axios.post(`${urlApi}/api/v1/barang/import`, formData, {
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
          fetchBarang(currentPage);
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
        input.value = "";
      }
    };

    input.click();
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      message.loading({ content: "Mengexport data...", key: "export" });

      const response = await axios.get(`${urlApi}/api/v1/barang-export`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob", // Penting! Menandakan response sebagai binary
      });

      // Cek apakah response adalah file Excel
      const contentType = response.headers["content-type"];
      if (!contentType || !contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
        throw new Error("Response bukan file Excel");
      }

      // Buat blob dari response
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Buat URL untuk download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `data_barang_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success({
        content: "Data berhasil diexport",
        key: "export",
        duration: 3,
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      message.error({
        content: "Gagal mengexport data",
        key: "export",
        duration: 3,
      });
    } finally {
      setExportLoading(false);
    }
  };
  const handleBackup = async () => {
    try {
      setExportLoading(true);
      message.loading({ content: "Memproses backup...", key: "backup" });

      const response = await axios.get(`${urlApi}/api/v1/barang-backup`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      // Handle the backup file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = `backup_barang_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({
        content: "Backup berhasil disimpan",
        key: "backup",
        duration: 3,
      });
    } catch (error) {
      console.error("Error backing up data:", error);
      message.error({
        content: "Gagal melakukan backup: " + (error.response?.data?.message || "Terjadi kesalahan"),
        key: "backup",
        duration: 3,
      });
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <MdOutlinePendingActions className="text-2xl text-yellow-600" />;
      case "cancelled":
        return <TbCancel className="text-2xl text-red-600" />;
      case "picker":
        return <FaBoxArchive className="text-2xl text-blue-600" />;
      case "packing":
        return <FaBoxesPacking className="text-2xl text-orange-600" />;
      case "pickout":
        return <MdLocalShipping className="text-2xl text-green-600" />;
      case "konfirmasi":
        return <PiNoteBlankFill className="text-2xl text-yellow-500" />;
      default:
        return <MdOutlinePendingActions className="text-2xl text-gray-600" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "picker":
        return "bg-blue-100 text-blue-800";
      case "packing":
        return "bg-orange-100 text-orange-800";
      case "pickout":
        return "bg-green-100 text-green-800";
      case "konfirmasi":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusOptions = [
    { value: "Semua", label: "Semua" },
    { value: "pending", label: "Pending" },
    { value: "picker", label: "Picked" },
    { value: "packing", label: "Packed" },
    { value: "pickout", label: "Shipped" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const handleModalDetailClose = () => {
    setModalDetailOpen(false);
    setResiDetail([]); // Clear detail data when modal closes
  };

  const handleSort = (sortType) => {
    setSortBy(sortType);
    setCurrentPage(1);
  };

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
        <div className="w-full h-auto bg-slate-50 rounded-md px-6 py-5">
          <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">
            {/* Search and Filter Section */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Left side: Date, Search, and Sort */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                <RangePicker onChange={handleDateChange} className="w-full sm:w-[200px] p-2.5 shadow-sm border border-gray-200 rounded-md hover:border-blue-500 focus:border-blue-500" />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <SearchFragment onSearch={handleSearchInput} onKeyPress={handleSearchSubmit} value={searchInput} placeholder="Cari nomor resi" className="w-full sm:w-[250px] shadow-sm" />
                  <div className="flex items-center gap-2">
                    <Button
                      buttonStyle={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300
                        ${sortBy === "today-first" ? "bg-green-500 text-white" : "bg-white text-gray-700 border border-green-500"}
                        hover:bg-green-600 hover:text-white text-xs`}
                      onClick={() => handleSort("today-first")}
                    >
                      <FaSort className="text-sm" />
                      <span>Hari Ini</span>
                    </Button>
                    <Button
                      buttonStyle={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300
                        ${sortBy === "oldest-first" ? "bg-green-500 text-white" : "bg-white text-gray-700 border border-green-500"}
                        hover:bg-green-600 hover:text-white text-xs`}
                      onClick={() => handleSort("oldest-first")}
                    >
                      <FaSort className="text-sm" />
                      <span>Terlama</span>
                    </Button>
                    <Button
                      buttonStyle={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300
                        ${sortBy === "last-update" ? "bg-green-500 text-white" : "bg-white text-gray-700 border border-green-500"}
                        hover:bg-green-600 hover:text-white text-xs`}
                      onClick={() => handleSort("last-update")}
                    >
                      <FaSort className="text-sm" />
                      <span>Update</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right side: Action Buttons */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                <Button buttonStyle="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 text-sm shadow-md hover:shadow-lg" onClick={handleExport} disabled={exportLoading}>
                  {exportLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </span>
                  ) : (
                    <>
                      <PiMicrosoftExcelLogoFill className="text-lg" />
                      <span>Export</span>
                    </>
                  )}
                </Button>
                <Button
                  buttonStyle="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 text-sm shadow-md hover:shadow-lg"
                  onClick={ImportFromExcelHandler}
                  disabled={importLoading}
                >
                  {importLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </span>
                  ) : (
                    <>
                      <PiMicrosoftExcelLogoFill className="text-lg" />
                      <span>Import</span>
                    </>
                  )}
                </Button>
                <Button buttonStyle="bg-blue-500 flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 shadow-md hover:shadow-lg font-medium" onClick={() => setIsModalOpen(true)}>
                  <IoIosCreate className="text-lg" />
                  <span className="text-sm">Buat Resi</span>
                </Button>
              </div>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  buttonStyle={`
                    ${activeButton === value ? "bg-blue-500 text-white shadow-md" : "bg-white text-gray-700 border border-blue-500 hover:shadow-md"} 
                    px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 
                    hover:text-white font-medium text-sm min-w-[90px] flex items-center justify-center
                  `}
                  onClick={() => handleButtonClick(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="content-card w-full  mx-auto h-[66vh] p-5 rounded-lg shadow-lg overflow-y-auto bg-slate-50 relative">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative">
              <Modal className=" w-[100rem] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" open={isModalDetailOpen} onCancel={handleModalDetailClose} title="Detail Resi" footer={null}>
                <Table dataSource={resiDetail} pagination={false}>
                  <Table.Column title="Resi ID" dataIndex="resi_id" key="resi_id" />
                  <Table.Column title="Nama Pekerja" dataIndex="nama_pekerja" key="nama_pekerja" />
                  <Table.Column
                    title="Status"
                    dataIndex="status_proses"
                    key="status_proses"
                    render={(text) => {
                      setJenisPekerja(text);

                      return <span>{text === "picker" ? "Pickup" : text === "packing" ? "Packing" : text === "pickout" ? "Shipper" : "Cancelled"}</span>;
                    }}
                  />
                  <Table.Column title="Created At" dataIndex="created_at" key="created_at" render={(text) => moment(text).format("DD/MM/YYYY HH:mm:ss")} />
                  <Table.Column
                    title="Images View"
                    dataIndex="gambar_resi"
                    key="gambar_resi"
                    render={(text) => {
                      return (
                        <div className="flex gap-2">
                          {text ? (
                            <Button
                              onClick={() => {
                                setImg(text);
                                setModalDetailOpen(false);
                                setIsImageViewerOpen(true);
                              }}
                            >
                              View
                            </Button>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      );
                    }}
                  />
                </Table>
              </Modal>

              {isImageViewerOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                  <div className="relative w-[1280px] h-[720px] flex items-center justify-center">
                    <div className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors flex items-center gap-2 z-50">
                      <button
                        onClick={() => {
                          setIsImageViewerOpen(true);
                          if (totalDeg === 0) setTotalDeg(90);
                          else setTotalDeg(0);
                        }}
                      >
                        <FaRotate className="text-4xl text-orange-500" />
                      </button>

                      <button
                        onClick={() => {
                          setIsImageViewerOpen(false);
                          setImg("");
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="relative">
                      <img src={`${urlApi}/${Img}`} alt={Img} className={`object-contain rounded-lg shadow-2xl rotate-[${totalDeg}deg]`} onClick={(e) => e.stopPropagation()} width={"500"} id="imagedetail" />
                    </div>
                  </div>
                </div>
              )}

              {barang.map((item) => {
                return (
                  <div
                    key={item.resi_id}
                    className="card bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                    onClick={async (e) => {
                      e.preventDefault();

                      if (item.status_proses !== "pending") {
                        try {
                          const response = await axios.get(`${urlApi}/api/v1/barang/${item.resi_id}`, {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem("token")}`,
                            },
                          });
                          if (response.data?.success) {
                            setResiDetail(response.data.data);
                            setModalDetailOpen(true);
                          }
                        } catch (error) {
                          message.error("Gagal memuat detail resi");
                        }
                      }
                    }}
                  >
                    <div className="flex flex-col space-y-4">
                      {/* Header with Status Icon */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusClass(item.status_proses)}`}>{getStatusIcon(item.status_proses)}</div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.resi_id}</h3>
                            <span
                              className={`text-sm px-2.5 py-1 rounded-full inline-block mt-1
                ${getStatusClass(item.status_proses)}`}
                            >
                              {item.status_description}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          {item.status_description} {item.status_proses !== "pending" && item.status_proses !== "cancelled" ? <span className="font-medium text-gray-900">• {item.nama_pekerja}</span> : ""}
                        </p>
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Create at: {moment(item.created_at).format("DD/MM/YYYY")}
                          </span>
                        </div>

                        <div className="flex items-center text-xs text-gray-500">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Last Scan: {!item.last_scan ? "Belum di scan" : moment(item.last_scan).format("DD/MM/YYYY")}
                          </span>
                        </div>
                      </div>

                      {/* Cancel Button */}
                      {item.status_proses !== "pickout" && item.status_proses !== "cancelled" && (
                        <div className="pt-3 mt-3 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(item.resi_id);
                            }}
                            className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-2 rounded-lg transition-all duration-300"
                          >
                            <MdCancelScheduleSend className="text-lg" />
                            <span className="text-sm font-medium">
                              {item.status_proses === "pending" && user.roles === "admin" ? "konfirmasi Cancel" : item.status_proses === "Menyetujui Cancel" ? "Cancel Resi" : `Cancel ${item.status_description}`}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="pagination flex items-center justify-end gap-2 my-5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-blue-500 text-white px-3 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  // Show first page, last page, current page, and one page before and after current
                  if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-2 rounded-md transition-all duration-300 min-w-[40px]
                          ${currentPage === pageNumber ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-50"} border border-blue-500`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                    // Show ellipsis
                    return (
                      <span key={pageNumber} className="px-2 py-1">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-blue-500 text-white px-3 py-2 rounded-md shadow-sm hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
