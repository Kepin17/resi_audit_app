import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import SearchFragment from "../../../Fragments/SearchFragment";
import PaginationFragment from "../../../Fragments/PaginationFragement";
import { FaBox, FaTruck, FaTruckLoading } from "react-icons/fa";
import { FaBoxesPacking } from "react-icons/fa6";
import { IoIosAddCircle } from "react-icons/io";
import ModalMenuFragment from "../../../Fragments/ModalMenuFragment";
import InputFragment from "../../../Fragments/InputFragment";
import Form from "../../../Elements/Form";
import Button from "../../../Elements/Button";
import axios from "axios";
import SelectOptionFragment from "../../../Fragments/SelectOptionFragment";
import { ToastContainer, toast } from "react-toastify";

const ItemCard = ({ item, index }) => (
  <div className="w-full md:w-[22rem] bg-white p-4 md:p-6 rounded-lg shadow-md flex items-center justify-between gap-3 md:gap-5 hover:shadow-lg transition-all duration-300 border border-slate-200 cursor-pointer" key={index}>
    <div className="w-full flex items-center gap-3 md:gap-5">
      <FaBox className="text-3xl md:text-5xl text-orange-400" />
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="text-base md:text-lg font-semibold text-slate-800">{item.nama_barang}</h3>
        <div className="w-full flex items-center justify-between gap-2 relative">
          <div className=" flex flex-col gap-1">
            <p className="text-slate-600 text-xs">{item.resi_id}</p>
            <p className={`text-slate-600 text-xs`}>{item.nama_category}</p>
          </div>

          <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-lg">
            {item.status_barang === "pending for packing" && <FaTruckLoading />}
            {item.status_barang === "pending for shipment" && <FaBoxesPacking />}
            {item.status_barang === "ready for shipment" && <FaTruck />}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminBarangSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState([]);
  const [category, setCategory] = useState([]);
  const [form, setForm] = useState({
    resi_id: "",
    nama_barang: "",
    id_category: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Add filtered data logic
  const filteredData = data.filter(
    (item) => item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) || item.resi_id.toLowerCase().includes(searchTerm.toLowerCase()) || item.nama_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/v1/barang", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setData(res.data.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/v1/categories", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log(res.data);
        setCategory(res.data.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (form.resi_id === "" || form.nama_barang === "" || form.id_category === "") {
      alert("Please fill all the form");
      return;
    }

    try {
      const response = await axios.post("http://localhost:8080/api/v1/barang", form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast(response.data.message);

      // Add new item to existing data
      setData([...data, response.data.data]);

      // Reset form
      setForm({
        resi_id: "",
        nama_barang: "",
        id_category: "",
      });

      // Close modal
      handleCloseModal();
    } catch (error) {
      console.error("Error adding item:", error);
      toast(error.response.data.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <ToastContainer position="top-center" autoClose={2000} hideProgressBar={false} closeOnClick={false} pauseOnHover={false} theme="dark" />
        <div className="w-full h-[85vh] flex flex-col px-2 md:px-5 bg-slate-200 rounded-md relative">
          {/* modal menu */}

          <ModalMenuFragment
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={
              <span className="text-2xl font-semibold flex items-center gap-2 px-4">
                <FaBox className="text-orange-400 text-2xl" />
                Barang Management
              </span>
            }
          >
            <Form formStyle={`flex flex-col gap-4 p-4`} onSubmit={submitHandler}>
              <InputFragment htmlFor={"resi_id"} inputName={"resi_id"} inputValue={form.resi_id} inputOnChange={(e) => setForm({ ...form, resi_id: e.target.value })}>
                Resi ID
              </InputFragment>
              <InputFragment htmlFor={"nama_barang"} inputName={"nama_barang"} inputValue={form.nama_barang} inputOnChange={(e) => setForm({ ...form, nama_barang: e.target.value })}>
                Nama Barang
              </InputFragment>

              <SelectOptionFragment
                name={"barang"}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, id_category: e.target.value })}
                options={[
                  {
                    value: "",
                    label: "Select Category",
                  },
                  ...category.map((item) => ({
                    value: item.id_category,
                    label: item.nama_category,
                  })),
                ]}
              />

              <Button
                buttonStyle="bg-blue-500 hover:bg-blue-600
          flex items-center justify-center gap-2 font-bold
          text-white p-2 rounded-md transition-all duration-200"
              >
                <IoIosAddCircle className="text-xl" />
                add new barang
              </Button>
            </Form>
          </ModalMenuFragment>

          <div className="w-full flex flex-col md:flex-row gap-3 md:gap-5 mb-4 px-4">
            <SearchFragment value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, resi, or category..." />
            <div className="w-full md:w-28 flex items-center gap-5">
              <Button onClick={() => setIsModalOpen(true)} buttonStyle="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-all duration-200">
                Add Barang
              </Button>
            </div>
          </div>

          {/* Wrap content in a container with overflow handling */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              <PaginationFragment data={filteredData}>
                <ItemCard />
              </PaginationFragment>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBarangSection;
