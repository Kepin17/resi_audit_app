import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Card, Table, Button, Input, DatePicker, Space, message, Modal, Form, Tag } from "antd";
import { FileExcelOutlined, DownloadOutlined, PlusOutlined, SearchOutlined, ImportOutlined, ReloadOutlined, EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";
import urlApi from "../../../../utils/url";
import LogImportSection from "../BarangManagement/LogImportSection";
import { IoIosOpen } from "react-icons/io";

const { RangePicker } = DatePicker;

const ReturBarangPage = () => {
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("all");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form] = Form.useForm();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ekspedisi, setEkspedisi] = useState("all");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [rotationDegree, setRotationDegree] = useState(0);
  const [getEkspedisi, setGetEkspedisi] = useState([]);
  const [editingKey, setEditingKey] = useState("");
  const [editingNote, setEditingNote] = useState("");
  const [openImportMenu, setOpenImportMenu] = useState(false);
  const [totalData, setTotalData] = useState(0);

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, refreshKey, searchText, dateRange, status, ekspedisi]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status,
        ekspedisi,
        startDate: dateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: dateRange?.[1]?.format("YYYY-MM-DD"),
      };

      const response = await axios.get(`${urlApi}/api/v1/barang-retur`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        setFilteredData(response.data.data);
        setTotalItems(response.data.pagination.totalItems);
        setTotalData(response.data.totalData);
      }
    } catch (error) {
      message.error("Gagal mengambil data retur");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
    setRotationDegree(0); // Reset rotation when opening new image
  };

  const handleRotate = () => {
    setRotationDegree((prev) => (prev + 90) % 360);
  };

  const isEditing = (record) => record.resi_id === editingKey;

  const handleEditNote = (record) => {
    setEditingKey(record.resi_id);
    setEditingNote(record.note || "");
  };

  const handleCancelEdit = () => {
    setEditingKey("");
    setEditingNote("");
  };

  const handleSaveNote = async (resiId) => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${urlApi}/api/v1/barang-retur/note`,
        {
          resi_id: resiId,
          note: editingNote,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        message.success("Note berhasil diperbarui");
        setEditingKey("");
        setEditingNote("");
        fetchData();
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Gagal memperbarui note");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Resi ID",
      dataIndex: "resi_id",
      key: "resi_id",
      width: 150,
    },
    {
      title: "Ekspedisi",
      dataIndex: "nama_ekspedisi",
      key: "nama_ekspedisi",
      width: 100,
    },
    {
      title: "Status",
      dataIndex: "status_retur",
      key: "status_retur",
      width: 120,
      render: (status, record) => (
        <div className="flex items-center gap-2 group">
          <Tag
            color={status === "diproses" ? "processing" : status === "diterima" ? "success" : "red"}
            className={`${status === "diterima" ? "cursor-default" : "cursor-pointer"} transition-colors`}
            onClick={() => {
              if (status === "diterima") {
                return;
              } else {
                axios
                  .put(
                    `${urlApi}/api/v1/auditResi-toggle-status`,
                    { status: status, resi_id: record.resi_id },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    }
                  )
                  .then((response) => {
                    if (response.data.success) {
                      message.success("Status berhasil diubah");
                      setRefreshKey((old) => old + 1);
                    }
                  })
                  .catch((error) => {
                    message.error(error.response?.data?.message || "Gagal mengubah status");
                  });
              }
            }}
          >
            {status === "diproses" ? "Diproses" : status === "diterima" ? "Diterima" : "Hilang"}
          </Tag>
          <Button type="text" icon={<EditOutlined />} size="small" className={`opacity-0 ${status === "diterima" ? "" : "group-hover:opacity-100 transition-opacity"}`} />
        </div>
      ),
    },
    {
      title: "Retur Scan",
      dataIndex: "nama_pekerja",
      key: "nama_pekerja",
      width: 150,
      render: (namaPekerja) => (namaPekerja ? namaPekerja : "-"),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      width: 200,
      render: (note, record) => {
        if (isEditing(record)) {
          return (
            <div className="flex flex-col space-y-2">
              <Input.TextArea value={editingNote} onChange={(e) => setEditingNote(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }} />
              <Space>
                <Button type="primary" icon={<CheckOutlined />} size="small" onClick={() => handleSaveNote(record.resi_id)}>
                  Save
                </Button>
                <Button danger icon={<CloseOutlined />} size="small" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </Space>
            </div>
          );
        } else {
          return (
            <div className="flex justify-between items-start group">
              <span className="flex-1">{note || "-"}</span>
              <Button type="text" icon={<EditOutlined />} size="small" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEditNote(record)} />
            </div>
          );
        }
      },
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (date) => moment(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Last Update",
      dataIndex: "last_scan",
      key: "last_scan",
      width: 150,
      render: (date) => (date ? moment(date).format("DD/MM/YYYY HH:mm") : "-"),
    },
    {
      title: "Image",
      dataIndex: "gambar_retur",
      key: "gambar_retur",
      width: 150,
      render: (imageUrl) =>
        imageUrl ? (
          <Button type="link" onClick={() => handlePreview(imageUrl)}>
            View Image
          </Button>
        ) : (
          "-"
        ),
    },
  ];

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (newStatus) => {
    setStatus(newStatus);
    setCurrentPage(1);
  };

  const handleEkspedisiFilter = (value) => {
    setEkspedisi(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    axios
      .get(`${urlApi}/api/v1/ekspedisi`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((response) => {
        setGetEkspedisi(response.data.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const ekspedisiOptions = [
    { label: "Semua", value: "all" },

    ...getEkspedisi.map((eks) => ({
      value: eks.id_ekspedisi,
      label: eks.nama_ekspedisi,
    })),
  ];

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
              <p className="text-2xl font-bold text-yellow-800">{results.duplicates}</p>
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

  const downloadTemplate = async () => {
    try {
      setExportLoading(true);
      message.loading({ content: "Downloading template...", key: "template" });
      const response = await axios.get(`${urlApi}/api/v1/retur-template`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "retur_template.xlsx";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success({
        content: "Template berhasil didownload",
        key: "template",
        duration: 3,
      });
    } catch (error) {
      message.error({
        content: "Gagal download template",
        key: "template",
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

        const fileExt = file.name.split(".").pop().toLowerCase();
        if (!["xlsx", "xls"].includes(fileExt)) {
          message.error("Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)");
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          message.error("Ukuran file terlalu besar. Maksimal 5MB");
          return;
        }

        setImportLoading(true);
        message.loading({ content: "Mengimport data...", key: "import" });

        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${urlApi}/api/v1/retur/import`, formData, {
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

          // Refresh data
          fetchData();
        }
      } catch (error) {
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

      const response = await axios.get(`${urlApi}/api/v1/retur-export`, {
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
      link.download = `data_retur_${new Date().toISOString().split("T")[0]}.xlsx`;

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
        content: "Gagal mengexport data",
        key: "export",
        duration: 3,
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleAddRetur = async (values) => {
    try {
      const response = await axios.post(`${urlApi}/api/v1/barang-retur`, values, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        message.success("Berhasil menambahkan retur");
        setIsModalVisible(false);
        form.resetFields();
        setRefreshKey((old) => old + 1);
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Gagal menambahkan retur");
    }
  };

  return (
    <DashboardLayout activePage={"retur"}>
      <div className="w-full h-full rounded-md flex flex-col gap-2 relative overflow-hidden">
        <LogImportSection title={"retur"} openImportMenu={openImportMenu} openImportMenuHandler={() => setOpenImportMenu(!openImportMenu)} />
        <ImportResultsModal visible={showImportModal} onClose={() => setShowImportModal(false)} results={importResults} />
        <Card
          title="Retur Barang Management"
          extra={
            <div className="flex items-center gap-2">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchText("");
                  setDateRange(null);
                  setStatus("all");
                  setEkspedisi("all");
                  setRefreshKey((old) => old + 1);
                }}
              >
                Reset Filter
              </Button>

              <Button
                icon={<IoIosOpen />}
                onClick={() => {
                  setOpenImportMenu(!openImportMenu);
                }}
              >
                Open Filter
              </Button>
            </div>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {/* Search and Date Filter */}
            <Space wrap>
              <RangePicker onChange={handleDateRangeChange} value={dateRange} 
              />
              <Input placeholder="Search by Resi ID" prefix={<SearchOutlined />} onChange={(e) => handleSearch(e.target.value)} value={searchText} style={{ width: 200 }} allowClear />
            </Space>

            {/* Status and Ekspedisi Filters */}
            <Space wrap align="start">
              <Space>
                <Button type={status === "diproses" ? "primary" : "default"} onClick={() => handleStatusFilter("diproses")}>
                  Diproses
                </Button>
                <Button type={status === "hilang" ? "primary" : "default"} onClick={() => handleStatusFilter("hilang")}>
                  Hilang
                </Button>
                <Button type={status === "diterima" ? "primary" : "default"} onClick={() => handleStatusFilter("diterima")}>
                  Diterima
                </Button>
                <Button type={status === "all" ? "primary" : "default"} onClick={() => handleStatusFilter("all")}>
                  Semua
                </Button>
              </Space>

              <Space wrap>
                {ekspedisiOptions.map((option) => (
                  <Button key={option.value} type={ekspedisi === option.value ? "primary" : "default"} onClick={() => handleEkspedisiFilter(option.value)}>
                    {option.label}
                  </Button>
                ))}
              </Space>
            </Space>

            {/* Action Buttons */}
            <Space wrap>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                Add Retur
              </Button>
              <Button icon={<ImportOutlined />} onClick={ImportFromExcelHandler} loading={importLoading}>
                Import Excel
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={handleExport} loading={exportLoading}>
                Export to Excel
              </Button>
              <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                Download Template
              </Button>

              <p>{totalData} resi ditemukan</p>
            </Space>

            {/* Data Table */}
            <Table
              columns={columns}
              dataSource={filteredData}
              loading={loading}
              rowKey="resi_id"
              pagination={{
                current: currentPage,
                pageSize,
                total: totalItems,
                onChange: (page, pageSize) => {
                  setCurrentPage(page);
                  setPageSize(pageSize);
                },
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} items`,
              }}
              scroll={{ x: 1200 }}
            />
          </Space>
        </Card>

        {/* Add Retur Modal */}
        <Modal
          title="Add Retur"
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
          }}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleAddRetur}>
            <Form.Item
              label="Resi ID"
              name="resi_id"
              rules={[
                { required: true, message: "Please input Resi ID!" },
                { min: 8, message: "Resi ID must be at least 8 characters!" },
                {
                  pattern: /^([A-Z]{2}\d+|\d+)$/,
                  message: "Format resi tidak valid. Gunakan format ekspedisi (Cth: CM1234567) atau nomor saja",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Note" name="note">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
                <Button
                  onClick={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          open={previewVisible}
          footer={[
            <Button key="rotate" onClick={handleRotate}>
              Rotate
            </Button>,
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              Close
            </Button>,
          ]}
          onCancel={() => setPreviewVisible(false)}
          width={800}
        >
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
            <img
              alt="preview"
              style={{
                maxWidth: "100%",
                maxHeight: "600px",
                transform: `rotate(${rotationDegree}deg)`,
                transition: "transform 0.3s ease",
              }}
              src={`${urlApi}/${previewImage}`}
            />
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default ReturBarangPage;
