import { useState, useEffect } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Button, Table, Modal, Form, Input, Space, message, Select } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import "./staff.css";
import { FaMoneyBill } from "react-icons/fa";

const StaffManagementPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingStaff, setEditingStaff] = useState(null);
  const [bagian, setBagian] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/v1/auth/show", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((response) => {
        setStaffList(response.data.data);
      })
      .catch((error) => {
        message.error(error.response.data.message);
      });
  }, []);

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
    form.setFieldsValue(staff);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      // Add API call to delete staff
      setStaffList(staffList.filter((staff) => staff.id !== id));
      message.success("Staff deleted successfully");
    } catch (error) {
      message.error(error.response.data.message);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingStaff) {
        // Add API call to update staff
        axios.put(`http://localhost:8080/api/v1/auth/${editingStaff.id_pekerja}`, values, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setStaffList(staffList.map((staff) => (staff.id === editingStaff.id_pekerja ? { ...values, id: staff.id } : staff)));
      } else {
        // Add API call to create staff
        axios
          .post("http://localhost:8080/api/v1/auth/register", values, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
          .then((response) => {
            setStaffList([...staffList, { ...values, id: response.data.data.id_pekerja }]);
          })
          .catch((error) => {
            message.error(error.response.data.message);
          });
      }
      setIsModalVisible(false);
      message.success(`Staff ${editingStaff ? "updated" : "added"} successfully`);
    } catch (error) {
      console.log(error);
      message.error(`Failed to ${editingStaff ? "update" : "add"} staff`);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Staff
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={staffList}
          rowKey="id_pekerja"
          pagination={{
            className: "custom-pagination",
          }}
        />

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

            <Form.Item name="id_bagian" label="Dapartement (Optional for admin)" rules={[{ required: true, message: "Please input staff department!" }]}>
              <Select
                style={{ width: 200 }}
                placeholder="Search to Select"
                optionFilterProp="label"
                value={form.getFieldValue("id_bagian") || ""}
                filterSort={(optionA, optionB) => (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())}
                options={[].concat(
                  bagian.map((item) => ({
                    label: item.jenis_pekerja,
                    value: item.id_bagian,
                  }))
                )}
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
