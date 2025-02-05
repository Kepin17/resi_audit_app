import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import Title from "../../../Elements/Title";
import { MdCancel, MdEdit } from "react-icons/md";
import { GiConfirmed } from "react-icons/gi";
import { Table, DatePicker, Input } from "antd";
import Form from "../../../Elements/Form";
import InputFragment from "../../../Fragments/InputFragment";
import axios from "axios";

const { RangePicker } = DatePicker;
const { Search } = Input;

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
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0); // Add this state

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
        setError(err.response.data.message);
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
      render: (text) => (text ? "Sudah Dibayar" : "Belum Dibayar"),
    },

    {
      title: "Action",
      dataIndex: "view",
      key: "updated_at",
      render: (text, record) => <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition duration-300">View</button>,
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

  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
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
          </div>
          <div className="mt-4 flex space-x-4 gap-2">
            <RangePicker onChange={handleDateChange} />
            <Search placeholder="Search by Nama Pekerja" onSearch={handleSearch} enterButton />
          </div>
        </div>

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
