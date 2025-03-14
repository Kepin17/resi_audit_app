import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { Button, Form, Input, message, Modal, Select, Table, Tag } from "antd";
import Title from "../../../Elements/Title";
import { FaTruck, FaTimes } from "react-icons/fa";
import { useAxios } from "../../../../utils/useAxios";
import axios from "axios";
import urlApi from "../../../../utils/url";

const LogisticPage = () => {
  const [ekspedisiData, setEkspedisiData] = useState([]);
  const [logisticsList, setLogisticsList] = useState([]);
  const [toggleAutoScan, setToggleAutoScan] = useState(false);
  const [isToggleLoading, setIsToggleLoading] = useState(false);
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
            <div
              key={index}
              className="mb-2 relative group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                axios
                  .delete(`${urlApi}/api/v1/ekspedisi`, {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    data: {
                      id_ekspedisi: record.id_ekspedisi,
                      id_resi: resi.id_resi,
                    },
                  })
                  .then(() => {
                    message.success("Logistic code removed successfully");
                    fetchLogisticsData();
                  })
                  .catch((error) => {
                    message.error("Failed to remove logistic code");
                    console.error(error);
                  });
              }}
            >
              <Tag color={resi.id_resi ? "blue" : "red"} className="pr-5 relative">
                {resi.id_resi || "Number Only"}
                <span className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 hover:text-red-600 p-1 cursor-pointer transition-opacity duration-200">
                  <FaTimes size={10} className="absolute -top-1" />
                </span>
              </Tag>
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

  useEffect(() => {
    // Fetch auto scan config
    const token = localStorage.getItem("token");
    axios
      .get(`${urlApi}/api/v1/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        const isAutoScanOn = res.data.auto_scan[0].config_value === "nyala";
        setToggleAutoScan(isAutoScanOn);
        localStorage.setItem("autoScan", isAutoScanOn ? "true" : "false");
      })
      .catch((err) => {
        console.error("Failed to fetch auto scan config:", err);
        const storedValue = localStorage.getItem("autoScan");
        if (storedValue) {
          setToggleAutoScan(storedValue === "true");
        }
      });
  }, []);

  const handleToggleAutoScan = () => {
    if (isToggleLoading) return;

    const newValue = !toggleAutoScan;
    const newConfigValue = newValue ? "nyala" : "mati";
    setIsToggleLoading(true);

    axios
      .put(
        `${urlApi}/api/v1/config`,
        {
          auto_scan: newConfigValue,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )
      .then((res) => {
        setToggleAutoScan(newValue);
        localStorage.setItem("autoScan", newValue ? "true" : "false");
        message.success(`Auto Scan is ${newValue ? "on" : "off"}`);
      })
      .catch((err) => {
        message.error("Failed to change Auto Scan");
      })
      .finally(() => {
        setIsToggleLoading(false);
      });
  };

  return (
    <DashboardLayout activePage={"Logistic"}>
      <div className="h-screen bg-slate-100 p-4 rounded-md">
        <div className="header flex mobile:flex-col mobile:items-start mobile:justify-none items-center justify-between mb-5 gap-5">
          <div>
            <Title titleStyle="flex items-center gap-2 font-bold text-2xl ">
              <FaTruck />
              <span>Logistic Management</span>
            </Title>
            <div className="font-bold text-slate-700 flex items-center gap-2 my-5">
              <h3>Auto Scan</h3>
              <div className={`controlToggle w-12 h-5 border-2 rounded-full bg-white relative flex items-center ${isToggleLoading ? "opacity-70 cursor-wait" : "cursor-pointer"}`} onClick={handleToggleAutoScan}>
                <div className={`toggle w-5 h-5 rounded-full bg-orange-500 transition-all ease-in duration-300 absolute ${toggleAutoScan ? "left-7" : "-left-1"}`}></div>
              </div>
            </div>
          </div>

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
                <Input placeholder="Example: CM" maxLength={2} />
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
