import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Button, Table, Modal, Form, Input, Space, message, Select, Pagination, Upload } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import axios from "axios";
import "./staff.css";
import { FaMoneyBill } from "react-icons/fa";
import SearchFragment from "../../../Fragments/SearchFragment";
import ExcelActionModal from "../../../Fragments/ExcelActionModal";

const StaffManagementPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingStaff, setEditingStaff] = useState(null);
  const [bagian, setBagian] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10; // Define consistent page size

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const fetchStaff = async (page = 1, search = "") => {
    try {
      setIsLoading(true);
      let url = new URL("http://localhost:8080/api/v1/auth/show");

      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", pageSize);

      if (search?.trim()) {
        params.append("search", search.trim());
      }

      url.search = params.toString();

      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data?.success) {
        setStaffList(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to fetch staff data");
      setStaffList([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setSearchTerm(searchValue);
      setCurrentPage(1);
    }, 500),
    []
  );

  useEffect(() => {
    fetchStaff(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/v1/bagian", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((response) => {
        setBagian(response.data.data);
      })
      .catch((error) => {
        message.error(error.response.data.message);
      });
  }, []);

  const columns = [
    {
      title: "Nama Pekerja",
      dataIndex: "nama_pekerja",
      key: "nama_pekerja",
    },

    {
      title: "Username",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Dapartement",
      dataIndex: "jenis_pekerja",
      key: "jenis_pekerja",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<FaMoneyBill />} />
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id_pekerja)} />
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingStaff(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (staff) => {
    setEditingStaff(staff);
    form.setFieldsValue({
      username: staff.username,
      nama_pekerja: staff.nama_pekerja,
      id_bagian: staff.id_bagian,
      role: staff.role,
    });
    setIsModalVisible(true);
  };

  useEffect(() => {
    if (editingStaff) {
      form.setFieldsValue({
        username: editingStaff.username,
        nama_pekerja: editingStaff.nama_pekerja,
        id_bagian: editingStaff.id_bagian,
        role: editingStaff.role,
      });
    }
  }, [editingStaff, form]);

  const handleDelete = async (id_pekerja) => {
    try {
      await axios.delete(`http://localhost:8080/api/v1/auth/${id_pekerja}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      message.success("Staff deleted successfully");
      fetchStaff(currentPage, searchTerm);
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to delete staff");
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingStaff) {
        await axios.put(`http://localhost:8080/api/v1/auth/${editingStaff.id_pekerja}`, values, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      } else {
        await axios.post("http://localhost:8080/api/v1/auth/register", values, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      }

      setIsModalVisible(false);
      form.resetFields();
      message.success(`Staff ${editingStaff ? "updated" : "added"} successfully`);
      fetchStaff(currentPage, searchTerm);
    } catch (error) {
      message.error(error.response?.data?.message || `Failed to ${editingStaff ? "update" : "add"} staff`);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearchInput = (value) => {
    setSearchInput(value);
    debouncedSearch(value);
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

        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post("http://localhost:8080/api/v1/auth-import", formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data?.success) {
          message.success("Data berhasil diimport");
          fetchStaff(currentPage);
        }
      } catch (error) {
        console.error("Error importing file:", error);
        message.error(error.response?.data?.message || "Gagal mengimport data");
      }
    };

    input.click();
  };

  const handleExport = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/v1/auth-export", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `staff_data_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error("Failed to export staff data");
    }
  };

  const handleBackup = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/v1/auth-backup", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `staff_data_${new Date().toISOString().split("T")[0]}_backup.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error("Failed to backup staff data");
    }
  };

  const [ExcelModalOpen, setExcelModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div style={{ padding: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Staff
            </Button>

            <Button icon={<DownloadOutlined />} onClick={() => setExcelModalOpen(true)}>
              Excel Action
            </Button>
          </Space>
          <SearchFragment onSearch={handleSearchInput} value={searchInput} placeholder="Search by name or role..." style={{ width: "250px" }} allowClear />
        </div>

        <div className="staff-table h-full bg-white rounded-lg shadow-lg p-5">
          <Table columns={columns} dataSource={staffList} rowKey="id_pekerja" pagination={false} loading={isLoading} />

          <Pagination
            current={currentPage}
            total={totalItems}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            style={{ marginTop: "16px", textAlign: "right" }}
            nextIcon="Next"
            prevIcon="Previous"
            align="end"
          />
        </div>

        <ExcelActionModal isOpen={ExcelModalOpen} onCancel={() => setExcelModalOpen(false)} ImportFromExcelHandler={ImportFromExcelHandler} handleBackup={handleBackup} handleExport={handleExport} />

        <Modal
          open={isModalVisible}
          onCancel={() => {
            form.resetFields();
            setIsModalVisible(false);
          }}
          footer={null}
          title={editingStaff ? "Edit Staff" : "Add Staff"}
        >
          <Form form={form} onFinish={handleSubmit} layout="vertical" preserve={false}>
            <Form.Item name="username" label="username" rules={[{ required: true, message: "Please input staff username!" }]}>
              <Input />
            </Form.Item>

            <Form.Item name="nama_pekerja" label="nama_pekerja" rules={[{ required: true, message: "Please input staff name!" }]}>
              <Input />
            </Form.Item>

            <Form.Item
              name="id_bagian"
              label="Dapartement"
              rules={[
                {
                  required: form.getFieldValue("role") !== "superadmin",
                  message: "Please input staff department!",
                },
              ]}
            >
              <Select
                style={{ width: "100%" }}
                placeholder="Select Department"
                optionFilterProp="children"
                value={form.getFieldValue("id_bagian")}
                options={bagian.map((item) => ({
                  label: item.jenis_pekerja,
                  value: item.id_bagian,
                }))}
              />
            </Form.Item>

            {editingStaff ? (
              ""
            ) : (
              <Form.Item name="password" label="password" rules={[{ required: true, message: "Please input staff password!" }]}>
                <Input.Password placeholder="Input password" />
              </Form.Item>
            )}
            <Form.Item name="role" label="role" rules={[{ required: true, message: "Please input staff role!" }]}>
              <Select
                style={{ width: 200 }}
                placeholder="Select Role"
                optionFilterProp="label"
                value={form.getFieldValue("id_bagian") || ""}
                filterSort={(optionA, optionB) => (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())}
                options={[
                  {
                    label: "super admin",
                    value: "superadmin",
                  },
                  {
                    label: "admin",
                    value: "admin",
                  },
                  {
                    label: "staff",
                    value: "staff",
                  },
                ]}
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingStaff ? "Update" : "Add"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default StaffManagementPage;
