import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Button, Modal, Form, Input, Space, message, Pagination, Checkbox, Card, Avatar, Tag, Row, Col } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, DownloadOutlined, UserOutlined } from "@ant-design/icons";
import axios from "axios";
import "./staff.css";
import SearchFragment from "../../../Fragments/SearchFragment";
import ExcelActionModal from "../../../Fragments/ExcelActionModal";
import urlApi from "../../../../utils/url";

const StaffManagementPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10; // Define consistent page size
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);

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
      let url = new URL(`${urlApi}/api/v1/auth/show`);

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

  const handleAdd = () => {
    setEditingStaff(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const roleGroups = {
    office: [
      { label: "Superadmin", value: "BGN005" },
      { label: "Admin", value: "BGN004" },
      { label: "Finance", value: "BGN006" },
    ],
    warehouse: [
      { label: "Picker", value: "BGN001" },
      { label: "Packing", value: "BGN002" },
      { label: "Pickout", value: "BGN003" },
    ],
    staffType: [
      { label: "Fulltime", value: "BGN007" },
      { label: "Freelance", value: "BGN008" },
    ],
  };

  // Modify handleEdit to work with id_bagian
  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setShowPasswordEdit(false);

    // Convert role names to id_bagian values
    const officeRoles = staff.bagian_ids.filter((id) => roleGroups.office.some((r) => r.value === id));
    const warehouseRoles = staff.bagian_ids.filter((id) => roleGroups.warehouse.some((r) => r.value === id));
    const staffTypeRoles = staff.bagian_ids.filter((id) => roleGroups.staffType.some((r) => r.value === id));

    form.setFieldsValue({
      username: staff.username,
      nama_pekerja: staff.nama_pekerja,
      roles: {
        office: officeRoles,
        warehouse: warehouseRoles,
        staffType: staffTypeRoles,
      },
      changePassword: false,
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
      await axios.delete(`${urlApi}/api/v1/auth/${id_pekerja}`, {
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

  const handlePasswordEditChange = (e) => {
    setShowPasswordEdit(e.target.checked);
    if (!e.target.checked) {
      form.setFieldsValue({ new_password: undefined });
    }
  };

  const handleSubmit = async (values) => {
    try {
      // Combine all selected roles into a single array
      const allRoles = [...(values.roles.office || []), ...(values.roles.warehouse || []), ...(values.roles.staffType || [])];

      const formattedValues = {
        username: values.username,
        nama_pekerja: values.nama_pekerja,
        bagian_roles: allRoles,
      };

      if (editingStaff) {
        // Add password only if it's being changed
        if (showPasswordEdit && values.new_password) {
          formattedValues.new_password = values.new_password;
        }

        await axios.put(`${urlApi}/api/v1/auth/${editingStaff.id_pekerja}`, formattedValues, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      } else {
        // For new staff, include password
        formattedValues.password = values.password;
        await axios.post(`${urlApi}/api/v1/auth/register`, formattedValues, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      }

      setIsModalVisible(false);
      form.resetFields();
      setShowPasswordEdit(false);
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

        const response = await axios.post(`${urlApi}/api/v1/auth-import`, formData, {
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
      const response = await axios.get(`${urlApi}/api/v1/auth-export`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `barang_data_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error("Failed to export staff data");
    }
  };

  const handleBackup = async () => {
    try {
      const response = await axios.get(`${urlApi}/api/v1/auth-backup`, {
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

  const getRoleLabel = (id) => {
    const allRoles = [...roleGroups.office, ...roleGroups.warehouse, ...roleGroups.staffType];
    const role = allRoles.find((r) => r.value === id);
    return role ? role.label : "";
  };

  const StaffCards = ({ data }) => {
    return (
      <Row gutter={[16, 16]}>
        {data.map((staff) => (
          <Col xs={24} sm={12} md={8} lg={6} key={staff.id_pekerja}>
            <Card hoverable className="staff-card" actions={[<Button icon={<EditOutlined />} onClick={() => handleEdit(staff)} />, <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(staff.id_pekerja)} />]}>
              <div className="staff-card-content">
                <Avatar size={64} icon={<UserOutlined />} className="staff-avatar" style={{ backgroundColor: "#1890ff" }} />
                <div className="staff-info">
                  <h3 className="staff-name">{staff.nama_pekerja}</h3>
                  <p className="staff-username">@{staff.username}</p>
                  <div className="staff-roles">
                    {staff.bagian_ids?.map((id, index) => (
                      <Tag
                        key={index}
                        color={
                          id === "BGN005"
                            ? "red" // superadmin
                            : id === "BGN004"
                            ? "blue" // admin
                            : id === "BGN006"
                            ? "purple" // finance
                            : id === "BGN001"
                            ? "green" // picker
                            : id === "BGN002"
                            ? "orange" // packing
                            : id === "BGN003"
                            ? "cyan" // pickout
                            : id === "BGN007"
                            ? "gold" // fulltime
                            : id === "BGN008"
                            ? "lime" // freelance
                            : "default"
                        }
                      >
                        {getRoleLabel(id)}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <DashboardLayout activePage={"staff"}>
      <div style={{ padding: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between" }} className="mobile:flex mobile:flex-col mobile:gap-5">
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Staff
            </Button>
          </Space>
          <SearchFragment onSearch={handleSearchInput} value={searchInput} placeholder="Search by name or role..." style={{ width: "250px" }} allowClear />
        </div>

        <div className="staff-container">
          <StaffCards data={staffList} />

          <Pagination
            current={currentPage}
            total={totalItems}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            style={{ marginTop: "24px", textAlign: "right" }}
            showQuickJumper
          />
        </div>

        <Modal
          open={isModalVisible}
          onCancel={() => {
            form.resetFields();
            setShowPasswordEdit(false);
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

            <Form.Item label="Roles" required>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <h4 className="font-bold">Office Roles:</h4>
                  <Form.Item name={["roles", "office"]} noStyle>
                    <Checkbox.Group options={roleGroups.office} />
                  </Form.Item>
                </div>

                <div>
                  <h4 className="font-bold">Warehouse Roles:</h4>
                  <Form.Item name={["roles", "warehouse"]} noStyle>
                    <Checkbox.Group options={roleGroups.warehouse} />
                  </Form.Item>
                </div>

                <div>
                  <h4 className="font-bold flex gap-1">
                    Staff Type <span className="text-red-500 ">*</span>
                  </h4>
                  <Form.Item name={["roles", "staffType"]} noStyle rules={[{ required: true, message: "Please select a staff type!" }]} required>
                    <Checkbox.Group options={roleGroups.staffType} />
                  </Form.Item>
                </div>
              </Space>
            </Form.Item>

            {editingStaff ? (
              <>
                <Form.Item name="changePassword" valuePropName="checked">
                  <Checkbox onChange={handlePasswordEditChange}>Change Password</Checkbox>
                </Form.Item>

                {showPasswordEdit && (
                  <Form.Item
                    name="new_password"
                    label="New Password"
                    rules={[
                      { required: true, message: "Please input new password!" },
                      { min: 6, message: "Password must be at least 6 characters!" },
                    ]}
                  >
                    <Input.Password placeholder="Input new password" />
                  </Form.Item>
                )}
              </>
            ) : (
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please input staff password!" },
                  { min: 6, message: "Password must be at least 6 characters!" },
                ]}
              >
                <Input.Password placeholder="Input password" />
              </Form.Item>
            )}

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
