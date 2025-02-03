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

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/v1/gaji/packing", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log(res.data.data);
        setSource(res.data.data);
      });
  }, []);

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
  };

  const handleDateChange = (dates) => {
    setDateRange(dates);
  };

  const filteredSource = source.filter((item) => {
    const matchesSearch = item.nama_pekerja.toLowerCase().includes(searchText.toLowerCase());
    const matchesDateRange = dateRange.length === 0 || (new Date(item.updated_at) >= dateRange[0] && new Date(item.updated_at) <= dateRange[1]);
    return matchesSearch && matchesDateRange;
  });

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

        <Table columns={coloms} rowKey="id_gaji_pegawai" dataSource={filteredSource} className="mt-4 border border-gray-200 rounded-lg shadow-sm" />
      </div>
    </DashboardLayout>
  );
};

export default PackSalary;
