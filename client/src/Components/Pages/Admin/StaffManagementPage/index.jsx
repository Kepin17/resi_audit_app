import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Button, Table, Modal, Form, Input, Space, message } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

const StaffManagementPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingStaff, setEditingStaff] = useState(null);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
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
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
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
      message.error("Failed to delete staff");
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingStaff) {
        // Add API call to update staff
        setStaffList(staffList.map((staff) => (staff.id === editingStaff.id ? { ...values, id: staff.id } : staff)));
      } else {
        // Add API call to create staff
        setStaffList([...staffList, { ...values, id: Date.now() }]);
      }
      setIsModalVisible(false);
      message.success(`Staff ${editingStaff ? "updated" : "added"} successfully`);
    } catch (error) {
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

        <Table columns={columns} dataSource={staffList} rowKey="id" />

        <Modal title={editingStaff ? "Edit Staff" : "Add Staff"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: "Please input staff name!" }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input staff email!" },
                { type: "email", message: "Please input valid email!" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="role" label="Role" rules={[{ required: true, message: "Please input staff role!" }]}>
              <Input />
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
