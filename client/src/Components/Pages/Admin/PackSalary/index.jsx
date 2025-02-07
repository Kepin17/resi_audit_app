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

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/v1/gaji", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log(res.data.data);
        setForm({ ...form, total_gaji_per_scan: res.data.data[0].total_gaji_per_scan });
      });
  }, []);

  const fetchGajiPacking = async (page, pageSize, searchValue) => {
    try {
      let url = new URL("http://localhost:8080/api/v1/gaji/packing");

      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", pageSize);

      if (searchValue?.trim()) {
        params.append("search", searchValue.trim());
      }
      if (dateRange?.[0] && dateRange?.[1]) {
        params.append("startDate", dateRange[0].toISOString());
        params.append("endDate", dateRange[1].toISOString());
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
        `http://localhost:8080/api/v1/gaji/packing/${selectedRecord.id_gaji_pegawai}`,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(form);
    setisEdit(false);
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

      const response = await axios.get(`http://localhost:8080/api/v1/gaji/packing-export?${params.toString()}`, {
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

  const handleBackup = async () => {
    try {
      setExportLoading(true);
      message.loading({ content: "Memproses backup...", key: "backup" });

      const response = await axios.get("http://localhost:8080/api/v1/gaji/packing-backup", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      // Handle the backup file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = `backup_gaji_packing_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`;
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

  const ImportFromExcelHandler = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";

    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        // Check file extension
        const fileExt = file.name.split(".").pop().toLowerCase();
        if (!["xlsx", "xls"].includes(fileExt)) {
          message.error("Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)");
          return;
        }

        setImportLoading(true);
        message.loading({ content: "Mengimport data...", key: "import" });

        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post("http://localhost:8080/api/v1/gaji/packing-import", formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data?.success) {
          message.success({ content: "Data berhasil diimport", key: "import" });
          fetchGajiPacking(currentPage, pageSize, searchText); // Fixed function name
        }
      } catch (error) {
        console.error("Error importing file:", error);
        message.error({
          content: error.response?.data?.message || "Gagal mengimport data",
          key: "import",
        });
      } finally {
        setImportLoading(false);
      }
    };

    input.click();
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full bg-white rounded-lg shadow-md p-6">
        <div className="w-full h-auto border-2 border-gray-200 rounded-lg p-6 mb-6">
          <Title>Packing Salary</Title>
          <div className="flex gap-4 items-center mt-4">
            <Form onSubmit={handleSubmit} className="flex-grow">
              <InputFragment htmlFor={"total_gaji_per_scan"} InputType="number" isJustNumber={true} inputName={"total_gaji_per_scan"} inputValue={form.total_gaji_per_scan} isDisabled={!isEdit} inputOnChange={handleInputChange}>
                Salary
              </InputFragment>
            </Form>
            <div className="flex items-center text-white">
              <button className={`bg-${isEdit ? "red-500" : "blue-500"} hover:bg-${isEdit ? "red-600" : "blue-600"} p-3 rounded-lg mr-2 transition duration-300`} onClick={() => setisEdit(!isEdit)}>
                {!isEdit ? <MdEdit /> : <MdCancel />}
              </button>
              {isEdit && (
                <button className="bg-green-500 hover:bg-green-600 p-3 rounded-lg transition duration-300" onClick={handleSubmit}>
                  <GiConfirmed />
                </button>
              )}
            </div>
            <Button className="border-2 border-blue-500 p-4" onClick={() => setOpenModal(true)}>
              Action
            </Button>
          </div>
          <div className="mt-4 flex space-x-4 gap-2">
            <RangePicker onChange={handleDateChange} />
            <Search placeholder="Search by Nama Pekerja" onSearch={handleSearch} enterButton />
          </div>
        </div>

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

        <ExcelActionModal isOpen={openModal} onCancel={() => setOpenModal(false)} ImportFromExcelHandler={ImportFromExcelHandler} handleExport={handleExport} handleBackup={handleBackup} />
        <Table
          columns={coloms}
          rowKey="id_gaji_pegawai"
          dataSource={source}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: `totalItems `,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} items`,
          }}
          onChange={handleTableChange}
          className="mt-4 border border-gray-200 rounded-lg shadow-sm"
        />
      </div>
    </DashboardLayout>
  );
};

export default PackSalary;
