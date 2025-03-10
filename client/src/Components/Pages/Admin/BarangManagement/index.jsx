import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import SearchFragment from "../../../Fragments/SearchFragment";
import moment from "moment";
import { DatePicker, Form, Input, message, Table, Calendar, Tag } from "antd";
import Button from "../../../Elements/Button";
import { MdOutlinePendingActions, MdLocalShipping } from "react-icons/md";
import { MdCancelScheduleSend } from "react-icons/md";
import { IoIosCreate } from "react-icons/io";
import axios from "axios";
import Modal from "antd/es/modal/Modal";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { TbCancel } from "react-icons/tb";
import { FaBoxArchive, FaBoxesPacking, FaRotate, FaSort } from "react-icons/fa6";
import urlApi, { urlImg } from "../../../../utils/url";
import { PiNoteBlankFill } from "react-icons/pi";
import { jwtDecode } from "jwt-decode";
import { FaReceipt, FaShoppingCart, FaTrash, FaTruck } from "react-icons/fa";
import { RiEBikeFill, RiCheckboxMultipleFill } from "react-icons/ri";
import LogImportSection from "./LogImportSection";
import { BiReset } from "react-icons/bi";

const AdminBarangSection = () => {
  const [dateRange, setDateRange] = useState([null, null]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeButton, setActiveButton] = useState("Semua");
  const [ekspedisiActiveButton, setEkspedisiActiveButton] = useState("Semua");
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
  const [totalDeg, setTotalDeg] = useState(0);
  const [user, setUser] = useState(null);
  const { RangePicker } = DatePicker;
  const [sortBy, setSortBy] = useState("newest"); // Add this state
  const [importResults, setImportResults] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [ekspedisi, setEkspedisi] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [totalCountPending, setTotalCountPending] = useState(0);
  const [totalPesanan, setTotalPesanan] = useState(0);
  const [isMultipleActive, setIsMultipleActive] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [openImportMenu, setOpenImportMenu] = useState(false);

  useEffect(() => {
    const fetchEkspedisi = async () => {
      try {
        const response = await axios.get(`${urlApi}/api/v1/ekspedisi`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.data?.success) {
          setEkspedisi(response.data.data);
        } else {
          throw new Error(response.data?.message || "Invalid response format");
        }
      } catch (error) {
        message.error("Gagal memuat data ekspedisi");
      }
    };

    fetchEkspedisi();
  }, []);

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

  const handleEkspedisiButtonClick = (ekspedisiId) => {
    setEkspedisiActiveButton(ekspedisiId);
    setCurrentPage(1);
  };

  const fetchBarang = async (page) => {
    setLoading(true);
    setError(null);
    try {
      let url = new URL(`${urlApi}/api/v1/barang`);

      // Add query parameters
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 24);
      params.append("sortBy", sortBy); // Add sort parameter

      if (searchTerm?.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (activeButton !== "Semua") {
        params.append("status", activeButton);
      }

      if (ekspedisiActiveButton !== "Semua") {
        params.append("ekspedisi", ekspedisiActiveButton);
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
        setTotalCountPending(response.data.countPending);
        setTotalPesanan(response.data.totalPesanan);
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
  }, [currentPage, searchTerm, activeButton, ekspedisiActiveButton, dateRange, sortBy]); // Add ekspedisiActiveButton to dependencies

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
        formData.append("file", file);

        const response = await axios.post(`${urlApi}/api/v1/barang/import`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data?.success) {
          message.success({
            content: `Berhasil import ${response.data.results.successful} data`,
            key: "import",
            duration: 3,
          });

          setImportResults(response.data.results);
          setShowImportModal(true);

          fetchBarang(currentPage);
        }
      } catch (error) {
        console.error("Error importing file:", error);
        message.error({
          content: error.response?.data?.message || "Gagal mengimport data. Pastikan format file sesuai template.",
          key: "import",
          duration: 4,
        });

        if (error.response?.data?.results) {
          setImportResults(error.response.data.results);
          setShowImportModal(true);
        }
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

      // Build query parameters for filtering the export
      const params = new URLSearchParams();
      if (searchTerm?.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (activeButton !== "Semua") {
        params.append("status", activeButton);
      }
      if (ekspedisiActiveButton !== "Semua") {
        params.append("ekspedisi", ekspedisiActiveButton);
      }
      if (dateRange?.[0] && dateRange?.[1]) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      const response = await axios.get(`${urlApi}/api/v1/barang-export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const contentType = response.headers["content-type"];
      if (!contentType || !contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
        throw new Error("Response bukan file Excel");
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `data_barang_${new Date().toISOString().split("T")[0]}.xlsx`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success({
        content: "Data berhasil diexport",
        key: "export",
        duration: 3,
      });
    } catch (error) {
      message.error({
        content: error.response?.data?.message || "Gagal melakukan export data",
        key: "export",
        duration: 3,
      });
    } finally {
      setExportLoading(false);
    }
  };
  const templateDownload = async () => {
    try {
      setExportLoading(true);
      message.loading({ content: "Memproses download...", key: "download" });

      const response = await axios.get(`${urlApi}/api/v1/template-resi`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      // Handle the backup file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = `template-resi${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({
        content: "template berhasil di download",
        key: "backup",
        duration: 3,
      });
    } catch (error) {
      console.error("Error download up data:", error);
      message.error({
        content: "Gagal melakukan download template: " + (error.response?.data?.message || "Terjadi kesalahan"),
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

  const ImportResultsModal = ({ visible, onClose, results }) => {
    if (!results) return null;

    return (
      <Modal
        title="Hasil Import Data"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Tutup
          </Button>,
        ]}
        width={800}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-700">Total Diproses</h3>
              <p className="text-2xl font-bold text-blue-800">{results.totalProcessed}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-700">Berhasil Import</h3>
              <p className="text-2xl font-bold text-green-800">{results.successful}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-700">Data Duplikat</h3>
              <p className="text-2xl font-bold text-yellow-800">{results.duplicatesInFile + results.duplicates}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-700">Gagal Import</h3>
              <p className="text-2xl font-bold text-red-800">{results.failed}</p>
            </div>
          </div>

          {results.problemRows && results.problemRows.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Detail Error:</h3>
              <div className="max-h-60 overflow-y-auto">
                <Table
                  dataSource={results.problemRows}
                  columns={[
                    {
                      title: "No Resi",
                      dataIndex: "resi",
                      key: "resi",
                    },
                    {
                      title: "Keterangan",
                      dataIndex: "reason",
                      key: "reason",
                      render: (text) => <span className="text-red-600">{text}</span>,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            </div>
          )}

          {results.errors && results.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-red-700 mb-2">System Errors:</h3>
              <ul className="list-disc list-inside text-red-600">
                {results.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const deleteResi = async (resi_id) => {
    try {
      Modal.confirm({
        title: "Konfirmasi Pembatalan",
        content: `Apakah anda yakin ingin menghapus resi ${resi_id}?`,
        okText: "Ya, Batalkan",
        cancelText: "Tidak",
        onOk: async () => {
          try {
            message.loading({ content: "menghapus pesanan...", key: "hapusResi" });

            const response = await axios.delete(`${urlApi}/api/v1/barang/${resi_id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            });

            if (response.data?.success) {
              message.success({
                content: "Pesanan berhasil menghapus",
                key: "hapusResi",
                duration: 3,
              });
              fetchBarang(currentPage);
            } else {
              throw new Error(response.data?.message || "Failed to delete order");
            }
          } catch (error) {
            console.error("Error deleting order:", error);
            let errorMsg = "Gagal menghapus pesanan";

            if (error.response?.status === 404) {
              errorMsg = "Resi tidak ditemukan";
            } else if (error.response?.data?.message) {
              errorMsg = error.response.data.message;
            }

            message.error({
              content: errorMsg,
              key: "hapusResi",
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

  // Fix the ekspedisi buttons rendering
  const ekspedisiButtons = [
    { value: "Semua", label: "Semua" },
    ...ekspedisi.map((eks) => ({
      value: eks.id_ekspedisi,
      label: eks.nama_ekspedisi,
    })),
  ];

  const fetchCalendarData = async () => {
    try {
      // Create URL with query parameters
      let url = new URL(`${urlApi}/api/v1/barang/calendar-data`);
      const params = new URLSearchParams();

      if (searchTerm?.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (activeButton !== "Semua") {
        params.append("status", activeButton);
      }
      if (ekspedisiActiveButton !== "Semua") {
        params.append("ekspedisi", ekspedisiActiveButton);
      }

      url.search = params.toString();

      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data?.success) {
        const formattedData = {};
        response.data.data.forEach((item) => {
          formattedData[item.date] = {
            statuses: item.statuses,
            counts: item.counts,
          };
        });
        setCalendarData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      message.error("Gagal memuat data kalender");
    }
  };

  // Update useEffect to include new dependencies
  useEffect(() => {
    fetchCalendarData();
  }, [searchTerm, activeButton, ekspedisiActiveButton]);

  // Update dateCellRender to show counts
  const dateCellRender = (date) => {
    const dateStr = date.format("YYYY-MM-DD");
    const data = calendarData[dateStr];

    if (!data) return null;

    const getBackgroundColor = () => {
      if (data.statuses.includes("pending")) return "bg-yellow-100";
      if (data.statuses.includes("picker")) return "bg-blue-100";
      if (data.statuses.includes("packing")) return "bg-orange-100";
      return "";
    };

    return (
      <div className="relative h-full">
        <div className={`absolute inset-0 ${getBackgroundColor()} opacity-50`} />
        {Object.entries(data.counts).map(([status, count]) => (
          <div key={status} className="relative z-10 text-xs">
            {status}: {count}
          </div>
        ))}
      </div>
    );
  };

  const handleItemSelection = (resi_id) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resi_id)) {
        newSet.delete(resi_id);
      } else {
        newSet.add(resi_id);
      }
      return newSet;
    });
  };

  const handleMultipleCancel = async () => {
    if (selectedItems.size === 0) {
      message.warning("Pilih minimal satu item untuk dibatalkan");
      return;
    }

    Modal.confirm({
      title: "Konfirmasi Pembatalan Multiple",
      content: `Apakah anda yakin ingin membatalkan ${selectedItems.size} resi yang dipilih?`,
      okText: "Ya, Batalkan",
      cancelText: "Tidak",
      onOk: async () => {
        try {
          message.loading({ content: "Membatalkan pesanan...", key: "multipleCancel" });

          const cancelPromises = Array.from(selectedItems).map((resi_id) =>
            axios.put(
              `${urlApi}/api/v1/barang-cancel/${resi_id}`,
              { resi_id },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                  "Content-Type": "application/json",
                },
              }
            )
          );

          await Promise.all(cancelPromises);

          message.success({
            content: `${selectedItems.size} pesanan berhasil dibatalkan`,
            key: "multipleCancel",
            duration: 3,
          });

          setSelectedItems(new Set());
          setIsMultipleActive(false);
          fetchBarang(currentPage);
        } catch (error) {
          console.error("Error cancelling orders:", error);
          message.error({
            content: "Gagal membatalkan beberapa pesanan",
            key: "multipleCancel",
            duration: 3,
          });
        }
      },
    });
  };

  const handleMultipleDelete = async () => {
    if (selectedItems.size === 0) {
      message.warning("Pilih minimal satu item untuk dihapus");
      return;
    }

    Modal.confirm({
      title: "Konfirmasi Penghapusan Multiple",
      content: `Apakah anda yakin ingin menghapus ${selectedItems.size} resi yang dipilih?`,
      okText: "Ya, Hapus",
      cancelText: "Tidak",
      onOk: async () => {
        try {
          message.loading({ content: "Menghapus pesanan...", key: "multipleDelete" });

          const deletePromises = Array.from(selectedItems).map((resi_id) =>
            axios.delete(`${urlApi}/api/v1/barang/${resi_id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            })
          );

          await Promise.all(deletePromises);

          message.success({
            content: `${selectedItems.size} pesanan berhasil dihapus`,
            key: "multipleDelete",
            duration: 3,
          });

          setSelectedItems(new Set());
          setIsMultipleActive(false);
          fetchBarang(currentPage);
        } catch (error) {
          console.error("Error deleting orders:", error);
          message.error({
            content: "Gagal menghapus beberapa pesanan",
            key: "multipleDelete",
            duration: 3,
          });
        }
      },
    });
  };

  return (
    <DashboardLayout activePage={"barang"}>
      <div className="w-full h-full rounded-md flex flex-col gap-2 relative overflow-hidden">
        <LogImportSection title={"barang"} openImportMenu={openImportMenu} openImportMenuHandler={() => setOpenImportMenu(!openImportMenu)} />
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
        <div className="w-full h-auto bg-white rounded-md px-3 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-4 max-w-[1400px] mx-auto">
            {/* Search and Filter Section */}
            <div className="flex flex-col gap-4">
              {/* Top Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Date and Search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-full sm:w-auto">
                    <RangePicker onChange={handleDateChange} className="w-full sm:w-[200px] p-2.5 shadow-sm border border-gray-200 rounded-md hover:border-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="flex items-center gap-5">
                    <Button buttonStyle="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600  w-auto relative" onClick={() => setIsCalendarModalVisible(true)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {totalCountPending !== 0 && <div className="w-4 h-4 bg-red-400 rounded-full absolute -bottom-1 -right-2 flex items-center justify-center"></div>}
                    </Button>

                    <div className="bg-orange-100 text-orange-500 p-2 w-32 rounded-md font-bold text-xl flex items-center gap-1">
                      <MdOutlinePendingActions />
                      {totalCountPending > 99999 ? "99999+" : totalCountPending}
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="w-full">
                  <SearchFragment onSearch={handleSearchInput} onKeyPress={handleSearchSubmit} value={searchInput} placeholder="Cari nomor resi" className="w-full" />
                </div>
                {/* Sort Buttons */}
                <div className="flex flex-wrap items-center gap-2">
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

                  <Button
                    buttonStyle={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300
                        bg-orange-400 text-white
                        hover:bg-orange-600 hover:text-white text-xs`}
                    onClick={() => {
                      setOpenImportMenu(true);
                    }}
                  >
                    <FaSort className="text-sm" />
                    <span>Log Import</span>
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  buttonStyle="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 text-sm shadow-md hover:shadow-lg"
                  onClick={handleExport}
                  disabled={exportLoading}
                >
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
                  buttonStyle="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 text-sm shadow-md hover:shadow-lg"
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
                <Button buttonStyle="bg-blue-500 flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 shadow-md hover:shadow-lg font-medium" onClick={templateDownload}>
                  <PiMicrosoftExcelLogoFill className="text-lg" />
                  <span className="text-sm">Template</span>
                </Button>

                <Button buttonStyle="bg-blue-500 flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 shadow-md hover:shadow-lg font-medium" onClick={() => setIsModalOpen(true)}>
                  <IoIosCreate className="text-lg" />
                  <span className="text-sm">Buat Resi</span>
                </Button>

                <Button
                  buttonStyle={` ${
                    isMultipleActive ? "bg-orange-300 text-white hover:bg-blue-500 hover:text-blue-100 " : "border-2 border-blue-500 hover:border-none hover:bg-orange-300 hover:text-white "
                  } flex items-center gap-2 text-blue-500 px-4 py-2 rounded-lg transition-all duration-300  shadow-md hover:shadow-lg font-medium`}
                  onClick={() => setIsMultipleActive(!isMultipleActive)}
                >
                  <RiCheckboxMultipleFill className="text-lg" />
                  <span className="text-sm">Multiple Action</span>
                </Button>
              </div>
            </div>
            {/* Status Filter Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2">
              {statusOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  buttonStyle={`
                    ${activeButton === value ? "bg-blue-500 text-white shadow-md" : "bg-white text-gray-700 border border-blue-500 hover:shadow-md"} 
                    px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 
                    hover:text-white font-medium text-sm w-full md:w-auto min-w-[90px] flex items-center justify-center
                  `}
                  onClick={() => handleButtonClick(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {/* Ekspedisi Filter Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 items-center">
              {ekspedisiButtons.map(({ value, label }) => (
                <Button
                  key={value}
                  buttonStyle={`
                    ${ekspedisiActiveButton === value ? "bg-blue-500 text-white shadow-md" : "bg-white text-gray-700 border border-blue-500 hover:shadow-md"} 
                    px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-600 
                    hover:text-white font-medium text-sm w-full md:w-auto min-w-[90px] flex items-center justify-center
                  `}
                  onClick={() => handleEkspedisiButtonClick(value)}
                >
                  {label}
                </Button>
              ))}
              <h4 className={`${totalPesanan === 0 ? " bg-yellow-100 text-yellow-700" : " bg-green-100 text-green-700"} flex items-center gap-2 p-2 rounded-lg`}>
                <FaShoppingCart />
                <span>Ada {totalPesanan} pesanan</span>
              </h4>
            </div>
          </div>
        </div>

        <div className="content-card w-full mx-auto h-auto phone:h-auto p-3 sm:p-5 rounded-lg shadow-lg overflow-y-auto bg-slate-50 relative">
          {barang.length <= 0 && (
            <div className="flex flex-col items-center justify-center w-full h-[100vh] rounded-lg text-center my-5 ">
              <div className="mb-4">
                <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Belum ada data barang</h3>
              <p className="text-gray-500 mb-6">Data barang yang Anda cari tidak ditemukan. Silakan tambah data baru atau ubah filter pencarian Anda.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                    setDateRange([null, null]);
                    setActiveButton("Semua");
                    setEkspedisiActiveButton("Semua");
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition duration-200"
                >
                  <FaRotate className="mr-2" />
                  Reset Filter
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 relative">
              <Modal width={"1000px"} className=" absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" open={isModalDetailOpen} onCancel={handleModalDetailClose} title="Detail Resi" footer={null}>
                <div className="flex items-center justify-between gap-4">
                  <Tag color="blue">
                    <span className="font-semibold text-xl flex items-center gap-2">
                      <FaReceipt />
                      {resiDetail[0]?.resi_id}
                    </span>
                  </Tag>
                  <button
                    className={`bg-slate-500 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:bg-slate-600
                  flex items-center gap-2 
                  ${user?.roles?.includes("superadmin") ? "block" : "hidden"}
                  `}
                    onClick={() => {
                      axios
                        .put(
                          `${urlApi}/api/v1/barang-reset-status/${resiDetail[0]?.resi_id}`,
                          {},
                          {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem("token")}`,
                            },
                          }
                        )
                        .then((res) => {
                          message.success("Status berhasil direset");
                          fetchBarang(currentPage);
                        })
                        .catch((err) => {
                          message.error("Gagal mereset status");
                        })
                        .finally(() => {
                          handleModalDetailClose();
                        });
                    }}
                  >
                    <BiReset />
                    Reset Status
                  </button>
                </div>
                <Table dataSource={resiDetail} pagination={false} className="my-3" key={resiDetail[0]?.resi_id}>
                  <Table.Column title="Nama Pekerja" dataIndex="nama_pekerja" key="nama_pekerja" />
                  <Table.Column
                    title="Status"
                    dataIndex="status_proses"
                    key="status_proses"
                    render={(text) => {
                      return <span>{text === "picker" ? "Pickup" : text === "packing" ? "Packing" : text === "pickout" ? "Shipper" : "Cancelled"}</span>;
                    }}
                  />
                  <Table.Column title="Last Scan" dataIndex="created_at" key="created_at" render={(text) => moment(text).format("LL HH:mm:ss")} />
                  <Table.Column
                    title="Images View"
                    dataIndex="gambar_resi"
                    key="gambar_resi"
                    render={(text) => {
                      return (
                        <div className="flex gap-2">
                          {text ? (
                            <Button
                              buttonStyle="m-auto px-2 py-1 text-blue-500 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg"
                              onClick={() => {
                                setImg(text);
                                setModalDetailOpen(false);
                                setIsImageViewerOpen(true);
                              }}
                            >
                              View
                            </Button>
                          ) : (
                            <span className="m-auto">-</span>
                          )}
                        </div>
                      );
                    }}
                  />
                </Table>
              </Modal>

              {isImageViewerOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                  <div className="relative bg-slate-50 w-[1280px] h-[720px] flex items-center justify-center rounded-lg">
                    <div className="absolute bottom-4 right-4 text-gray-500 hover:text-gray-600 transition-colors flex items-center gap-2 z-50">
                      <button
                        className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={() => {
                          setIsImageViewerOpen(true);
                          if (totalDeg === 0) setTotalDeg(90);
                          else if (totalDeg === 90) setTotalDeg(180);
                          else if (totalDeg === 180) setTotalDeg(270);
                          else setTotalDeg(0);
                        }}
                      >
                        <FaRotate className="text-xl " />
                        Rotate
                      </button>

                      <button
                        className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={() => {
                          setIsImageViewerOpen(false);
                          setImg("");
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div className="relative">
                      <img src={`${urlImg}${Img}`} alt={Img} className={`object-contain rounded-lg shadow-2xl `} style={{ transform: `rotate(${totalDeg}deg)` }} onClick={(e) => e.stopPropagation()} width={"500"} id="imagedetail" />
                    </div>
                  </div>
                </div>
              )}

              {barang.map((item) => (
                <div
                  key={item.resi_id}
                  className={`card bg-white p-5 rounded-xl border ${
                    isMultipleActive ? (selectedItems.has(item.resi_id) ? "border-blue-500 shadow-lg" : "border-gray-200") : "border-gray-200 hover:shadow-lg"
                  } transition-all duration-300 cursor-pointer transform ${isMultipleActive ? "" : "hover:-translate-y-1"}`}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (isMultipleActive) {
                      handleItemSelection(item.resi_id);
                    } else if (item.status_proses !== "pending") {
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
                  <div className="flex flex-col space-y-4 relative">
                    {/* Header with Status Icon */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusClass(item.status_proses)}`}>{getStatusIcon(item.status_proses)}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.resi_id}</h3>
                          <h3
                            className={`text-sm px-2.5 py-1 rounded-full  mt-1 flex gap-2 items-center justify-center
                           ${item.status_proses === "cancelled" ? "text-red-500 bg-red-100" : "text-[#321F74] bg-indigo-100"}
                           `}
                          >
                            <span>{item.id_ekspedisi === "GJK" ? <RiEBikeFill /> : item.status_proses !== "cancelled" ? <FaTruck /> : ""}</span>
                            {!item.nama_ekspedisi ? "Ekspedisi Bermasalah" : item.nama_ekspedisi}
                          </h3>
                        </div>
                      </div>

                      <button
                        className={`${isMultipleActive ? "hidden" : ""} absolute top-0 right-0 bg-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 ease-in border-2 p-1 rounded-md
                           ${user.roles.includes("superadmin") ? "block" : "hidden"}
                         `}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteResi(item.resi_id);
                        }}
                      >
                        <FaTrash className="text-red-500" />
                      </button>
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
                          Create at: {moment(item.created_at).format("LL HH:mm:ss")}
                        </span>
                      </div>

                      <div className="flex items-center text-xs text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Last Scan: {!item.last_scan ? "Belum di scan" : moment(item.last_scan).format("LL HH:mm:ss")}
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
                          className={`w-full flex items-center justify-center gap-2 ${isMultipleActive ? "hidden" : ""} text-red-500 hover:bg-red-50 py-2 rounded-lg transition-all duration-300`}
                        >
                          <MdCancelScheduleSend className="text-lg" />
                          <span className="text-sm font-medium">
                            {item.status_proses === "pending" && user.roles === "admin" ? "konfirmasi Cancel" : item.status_proses === "Menyetujui Cancel" ? "Cancel Resi" : `Cancel ${item.status_description}`}
                          </span>
                        </button>
                      </div>
                    )}
                    {isMultipleActive && (
                      <div className={`absolute top-2 right-2 ${item.status_proses === "cancelled" ? "hidden" : ""}`}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.resi_id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleItemSelection(item.resi_id);
                          }}
                          className="w-5 h-5 text-blue-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="pagination flex flex-wrap items-center justify-center sm:justify-end gap-2 my-5 px-2">
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
      <ImportResultsModal visible={showImportModal} onClose={() => setShowImportModal(false)} results={importResults} />
      <Modal title="Calendar View" open={isCalendarModalVisible} onCancel={() => setIsCalendarModalVisible(false)} footer={null} width={800}>
        <div className="p-4">
          <div className="mb-4 flex gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded"></div>
              <span>Picked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 rounded"></div>
              <span>Packed</span>
            </div>
          </div>
          <Calendar
            cellRender={dateCellRender}
            onSelect={(date) => {
              setDateRange([date, date]);
              setIsCalendarModalVisible(false);
            }}
            className="border rounded-lg p-4"
          />
        </div>
      </Modal>
      {isMultipleActive && selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/30 backdrop-blur-md shadow-lg p-4 flex justify-center gap-4 z-50">
          <Button buttonStyle="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600" onClick={handleMultipleCancel}>
            Cancel Selected ({selectedItems.size})
          </Button>
          {user.roles.includes("superadmin") && (
            <Button buttonStyle="bg-red-700 text-white px-6 py-2 rounded-lg hover:bg-red-800" onClick={handleMultipleDelete}>
              Delete Selected ({selectedItems.size})
            </Button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminBarangSection;
