import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Card, Table, Button, Input, DatePicker, Space, message, Modal, Form, Tag } from "antd";
import { FileExcelOutlined, DownloadOutlined, PlusOutlined, SearchOutlined, ImportOutlined, ReloadOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";
import urlApi from "../../../../utils/url";

const { RangePicker } = DatePicker;

const ReturBarangPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
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
        setData(response.data.data);
        setFilteredData(response.data.data);
        setTotalItems(response.data.pagination.totalItems);
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
      render: (status) => <Tag color={status === "diproses" ? "processing" : "success"}>{status === "diproses" ? "Diproses" : "Selesai"}</Tag>,
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

  const ekspedisiOptions = [
    { label: "Semua", value: "all" },
    { label: "J&T ", value: "JNT" },
    { label: "JNE", value: "JNE" },
    { label: "J&T Truck", value: "JTR" },
    { label: "JNT Cargo", value: "JCG" },
    { label: "Gosend", value: "GJK" },
  ];

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

          if (response.data.results.failed > 0 || response.data.results.duplicates > 0) {
            setImportResults(response.data.results);
            setShowImportModal(true);
          }

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
      <Card
        title="Retur Barang Management"
        extra={
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
        }
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* Search and Date Filter */}
          <Space wrap>
            <RangePicker onChange={handleDateRangeChange} value={dateRange} />
            <Input placeholder="Search by Resi ID" prefix={<SearchOutlined />} onChange={(e) => handleSearch(e.target.value)} value={searchText} style={{ width: 200 }} allowClear />
          </Space>

          {/* Status and Ekspedisi Filters */}
          <Space wrap align="start">
            <Space>
              <Button type={status === "diproses" ? "primary" : "default"} onClick={() => handleStatusFilter("diproses")}>
                Diproses
              </Button>
              <Button type={status === "selesai" ? "primary" : "default"} onClick={() => handleStatusFilter("selesai")}>
                Selesai
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
        visible={isModalVisible}
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

      {/* Import Results Modal */}
      <Modal
        title="Hasil Import"
        visible={showImportModal}
        onCancel={() => setShowImportModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowImportModal(false)}>
            Tutup
          </Button>,
        ]}
      >
        {importResults && (
          <div>
            <p>Berhasil: {importResults.successful} data</p>
            <p>Gagal: {importResults.failed} data</p>
            <p>Duplikat: {importResults.duplicates} data</p>
            {importResults.errors && (
              <div>
                <h4>Detail Error:</h4>
                <ul>
                  {importResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Image Preview Modal */}
      <Modal
        visible={previewVisible}
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
    </DashboardLayout>
  );
};

export default ReturBarangPage;
