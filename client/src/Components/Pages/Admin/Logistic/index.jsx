import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Button, Form, Input, message, Modal, Select, Table, Tag } from "antd";
import Title from "../../../Elements/Title";
import { FaTruck } from "react-icons/fa";
import { useAxios } from "../../../../utils/useAxios";

const LogisticPage = () => {
  // State setup with clear naming
  const [ekspedisiData, setEkspedisiData] = useState([]);
  const [logisticsList, setLogisticsList] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
  });
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
  });

  const [form] = Form.useForm();
  const api = useAxios();

  // Fetch logistics data
  const fetchLogisticsData = useCallback(async (page = 1) => {
    try {
      const response = await api.get(`/api/v1/ekspedisi-group?page=${page}`);
      const { data, pagination: paginationData } = response.data;

      setEkspedisiData(data);
      setPagination({
        currentPage: paginationData.currentPage,
        pageSize: paginationData.limit,
        totalItems: paginationData.totalItems,
      });
    } catch (error) {
      message.error("Failed to fetch logistics data");
    }
  }, []);

  // Fetch logistics list for dropdown
  const fetchLogisticsList = useCallback(async () => {
    try {
      const response = await api.get("/api/v1/ekspedisi");
      setLogisticsList(response.data.data);
    } catch (error) {
      message.error("Failed to fetch logistics list");
    }
  }, []);

  useEffect(() => {
    fetchLogisticsData();
    fetchLogisticsList();
  }, [fetchLogisticsData, fetchLogisticsList]);

  // Table columns configuration
  const columns = [
    {
      title: "Logistic ID",
      dataIndex: "id_ekspedisi",
      key: "id_ekspedisi",
    },
    {
      title: "Logistic Name",
      dataIndex: "nama_ekspedisi",
      key: "nama_ekspedisi",
    },
    {
      title: "Valid Code",
      dataIndex: "id_resi",
      key: "id_resi",
      render: (_, record) => (
        <div className="flex flex-wrap gap-2">
          {record.kode_resi.map((resi, index) => (
            <div key={index} className="mb-2">
              <Tag color={resi.id_resi ? "blue" : "red"}>{resi.id_resi || "Number Only"}</Tag>
            </div>
          ))}
        </div>
      ),
    },
  ];

  // Form submission handler
  const handleFormSubmit = async (values) => {
    try {
      if (modalConfig.title === "Assign Logistic") {
        const response = await api.post("/api/v1/ekspedisi-assign", {
          id_ekspedisi: values.id_ekspedisi,
          id_resi: values.id_resi,
        });
        message.success(`${response.data.data.id_resi} successfully assigned`);
      } else if (modalConfig.title === "Add Logistic") {
        const response = await api.post("/api/v1/ekspedisi", {
          nama_ekspedisi: values.nama_ekspedisi,
        });
        message.success(`${response.data.data.nama_ekspedisi} successfully added`);
        fetchLogisticsList();
      }

      // Reset form and refresh data
      form.resetFields();
      setModalConfig({ visible: false, title: "" });
      fetchLogisticsData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Operation failed";
      message.error(errorMsg);
    }
  };

  // Modal handling
  const handleOpenModal = (title) => {
    setModalConfig({ visible: true, title });
    form.resetFields();
  };

  // Handle pagination change
  const handlePageChange = (page) => {
    fetchLogisticsData(page);
  };

  return (
    <DashboardLayout activePage={"Logistic"}>
      <div className="h-screen bg-slate-100 p-4 rounded-md">
        <div className="header flex mobile:flex-col mobile:items-start mobile:justify-none items-center justify-between mb-5 gap-5">
          <Title titleStyle="flex items-center gap-2 font-bold text-2xl ">
            <FaTruck />
            <span>Logistic Management</span>
          </Title>

          <div className="btn-action flex items-center gap-4">
            <Button type="primary" onClick={() => handleOpenModal("Add Logistic")} className="bg-blue-700">
              Add Logistic
            </Button>

            <Button type="primary" onClick={() => handleOpenModal("Assign Logistic")} className="bg-blue-700">
              Assign Logistic
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={ekspedisiData.map((item) => ({
            ...item,
            key: item.id_ekspedisi,
          }))}
          pagination={{
            current: pagination.currentPage,
            pageSize: pagination.pageSize,
            total: pagination.totalItems,
            onChange: handlePageChange,
            showSizeChanger: false,
          }}
        />
      </div>

      <Modal title={modalConfig.title} open={modalConfig.visible} onCancel={() => setModalConfig({ visible: false, title: "" })} footer={null}>
        <Form form={form} onFinish={handleFormSubmit} layout="vertical">
          {modalConfig.title === "Assign Logistic" && (
            <>
              <Form.Item label="Logistic Name" name="id_ekspedisi" rules={[{ required: true, message: "Please select Logistic Name!" }]}>
                <Select
                  placeholder="Select logistic"
                  options={logisticsList.map((item) => ({
                    label: item.nama_ekspedisi,
                    value: item.id_ekspedisi,
                  }))}
                />
              </Form.Item>
              <Form.Item label="Resi Code" name="id_resi" rules={[{ required: true, message: "Please input Resi Code!" }]}>
                <Input placeholder="Example: CM" />
              </Form.Item>
            </>
          )}

          {modalConfig.title === "Add Logistic" && (
            <Form.Item label="Logistic Name" name="nama_ekspedisi" rules={[{ required: true, message: "Please input Logistic Name!" }]}>
              <Input placeholder="Enter logistic name" />
            </Form.Item>
          )}

          <Form.Item className="text-right">
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
};

export default LogisticPage;
