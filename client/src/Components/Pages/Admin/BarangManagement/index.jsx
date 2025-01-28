import React, { useEffect, useState } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import SearchFragment from "../../../Fragments/SearchFragment";
import { FaBox, FaCalendar, FaTruck, FaWarehouse } from "react-icons/fa";
import { FaBoxesPacking } from "react-icons/fa6";
import { IoIosAddCircle } from "react-icons/io";
import ModalMenuFragment from "../../../Fragments/ModalMenuFragment";
import InputFragment from "../../../Fragments/InputFragment";
import Form from "../../../Elements/Form";
import Button from "../../../Elements/Button";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { MdBarcodeReader } from "react-icons/md";
import Title from "../../../Elements/Title";
import { FiAlertTriangle } from "react-icons/fi"; // Add this import
import Calendar from "react-calendar";
import { PiTrolleyFill } from "react-icons/pi";

// Update the formatDate function to have a simpler default option
const formatDate = (date, locale = "id-ID", options = {}) => {
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date));
};

const AdminBarangSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isviewDetailModalOpen, setIsViewDetailModalOpen] = useState(false);
  const [data, setData] = useState([]);
  const [logResiDetail, setLogResiDetail] = useState([]);
  const [form, setForm] = useState({
    resi_id: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(16); // Adjust number of items per page as needed
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [value, onChange] = useState(new Date());
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    // Don't fetch from API, just update the date range and let the filter work
    console.log("Date range updated:", range);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setIsViewDetailModalOpen(true);
    setLogResiDetail([]); // Clear previous data
    setIsLoading(true);

    if (!item) return;

    axios
      .get(`http://localhost:8080/api/v1/auditResi/${item.resi_id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setLogResiDetail(res.data.data || []);
      })
      .catch((err) => {
        console.log(err);
        setLogResiDetail([]); // Clear data on error
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const ItemCard = ({ item }) => {
    if (!item) return null;

    return (
      <div
        className="  w-full md:w-[22rem] bg-white p-4 md:p-6 rounded-lg shadow-md flex items-center justify-between gap-3 md:gap-5 hover:shadow-lg transition-all duration-300 border border-slate-200 cursor-pointer"
        onClick={() => handleItemClick(item)}
      >
        <div className="w-full flex items-center gap-3 md:gap-5">
          <FaBox className="text-3xl md:text-5xl text-orange-400" />
          <div className="flex flex-col gap-1 flex-1">
            <h3 className="text-base md:text-lg font-semibold text-slate-800">{item.resi_id}</h3>
            <div className="w-full flex items-center justify-between gap-2 relative">
              <div className="flex flex-col gap-1">
                <div className={`w-auto rounded-full px-2 py-1 text-white text-xs ${item.status_pengiriman === "pending" ? "bg-orange-500" : item.status_pengiriman === "ready" ? "bg-blue-500" : "bg-green-500"}`}>
                  <p className="text-slate-50 text-md font-bold">{item.status_pengiriman}</p>
                </div>
              </div>
              <div className="absolute -top-5 right-0 bg-slate-800 text-2xl shadow-xl border-2 text-white px-3 py-1 rounded-lg">
                {item.STATUS_BARANG === "pending for pickup" && <FaWarehouse className="text-red-400" />}
                {item.STATUS_BARANG === "pending for packing" && <PiTrolleyFill className="text-orange-400" />}
                {item.STATUS_BARANG === "pending for shipment" && <FaBoxesPacking className="text-blue-400" />}
                {item.STATUS_BARANG === "ready for shipment" && <FaTruck className="text-green-500" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredData = data.filter((item) => {
    if (!item) return false;

    // Text search filter
    const textMatch =
      item.nama_barang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.resi_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nama_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status_pengiriman?.toLowerCase().includes(searchTerm.toLowerCase());

    // Date range filter
    let dateMatch = true;
    if (dateRange[0] && dateRange[1] && item.created_at) {
      const itemDate = new Date(item.created_at);
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);

      // Reset hours to midnight for accurate date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      dateMatch = itemDate >= startDate && itemDate <= endDate;
    }

    return textMatch && dateMatch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const fetchBarang = async (page) => {
    try {
      const response = await axios.get(`http://localhost:8080/api/v1/barang?page=${page}&limit=${itemsPerPage}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setData(response.data.data);

      // Update total count based on filtered data
      const filteredCount = response.data.data.filter((item) => {
        if (!item || !item.created_at) return false;

        if (dateRange[0] && dateRange[1]) {
          const itemDate = new Date(item.created_at);
          const startDate = new Date(dateRange[0]);
          const endDate = new Date(dateRange[1]);

          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          return itemDate >= startDate && itemDate <= endDate;
        }
        return true;
      }).length;

      setTotalCount(filteredCount);
      setTotalPages(Math.ceil(filteredCount / itemsPerPage));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load items");
    }
  };

  useEffect(() => {
    fetchBarang(currentPage);
  }, [currentPage, itemsPerPage]);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top when changing page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (form.resi_id === "" || form.nama_barang === "" || form.id_category === "") {
      toast("Please fill all the form");
      return;
    }

    // Store form data and show confirmation
    setFormData(form);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      const response = await axios.post("http://localhost:8080/api/v1/barang", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast(response.data.message);
      setData([...data, response.data.data]);

      // Reset everything
      setForm({
        resi_id: "",
      });
      setShowConfirm(false);
      handleCloseModal();
      window.location.reload();
    } catch (error) {
      console.error("Error adding item:", error);
      toast(error.response.data.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCloseDetailModal = () => {
    setIsViewDetailModalOpen(false);
    setSelectedItem(null);
    setLogResiDetail([]); // Clear data when closing
  };

  // Keep the original formatDate for log details where you need time
  const formatDateWithTime = (date) => {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date(date));
  };

  useEffect(() => {
    console.log(value);
  });

  // Update calendar button to show active filter status
  const calendarButton = (
    <Button
      onClick={toggleCalendar}
      buttonStyle={`
        relative
        ${dateRange[0] && dateRange[1] ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"}
        text-white px-4 py-2 rounded-lg
        transition-all duration-200 flex items-center gap-3
        ${showCalendar ? "ring-2 ring-blue-300" : ""}
      `}
    >
      <FaCalendar className={`text-lg ${showCalendar ? "text-blue-100" : ""}`} />
    </Button>
  );

  // Add clear filter button when date range is active
  const clearFilters = () => {
    setDateRange([null, null]);
    setCurrentPage(1);
    fetchBarang(1, null);
  };

  const DateFilterStatus = () => {
    if (!dateRange[0] || !dateRange[1]) return null;

    return (
      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
        <span className="text-sm text-blue-700">
          Filtered:{" "}
          {formatDate(dateRange[0], "id-ID", {
            day: "numeric",
            month: "short",
          })}{" "}
          -{" "}
          {formatDate(dateRange[1], "id-ID", {
            day: "numeric",
            month: "short",
          })}
        </span>
        <button onClick={clearFilters} className="text-red-500 hover:text-red-700">
          ×
        </button>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <ToastContainer position="top-center" autoClose={2000} hideProgressBar={false} closeOnClick={false} pauseOnHover={false} theme="dark" />
        <div className="w-full h-[85vh] flex flex-col px-2 md:px-5 bg-slate-200 rounded-md relative">
          {/* Calendar */}
          {showCalendar && (
            <div className="absolute top-20 right-5 z-50">
              <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100 min-w-[320px]">
                <div className="mb-4 space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">Select Date Range</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex-1 p-2 bg-gray-50 rounded-lg">
                      <p className="font-medium">From</p>
                      <p>{dateRange[0] ? formatDate(dateRange[0], "id-ID", { day: "numeric", month: "long" }) : "Pick start date"}</p>
                    </div>
                    <div className="font-bold">→</div>
                    <div className="flex-1 p-2 bg-gray-50 rounded-lg">
                      <p className="font-medium">To</p>
                      <p>{dateRange[1] ? formatDate(dateRange[1], "id-ID", { day: "numeric", month: "long" }) : "Pick end date"}</p>
                    </div>
                  </div>
                </div>

                <Calendar
                  onChange={handleDateRangeChange}
                  value={dateRange}
                  selectRange={true}
                  className="
                    react-calendar
                    border-0
                    p-2
                    w-full
                    rounded-xl
                    overflow-hidden
                    bg-white
                  "
                  tileClassName={({ date, view }) => {
                    if (view === "month") {
                      if (dateRange[0] && dateRange[1]) {
                        if (date >= dateRange[0] && date <= dateRange[1]) {
                          return "bg-blue-50 text-blue-600 rounded-lg font-medium transition-all duration-200";
                        }
                      }
                    }
                    return "hover:bg-gray-50 rounded-lg transition-all duration-200";
                  }}
                  prevLabel={<span className="text-gray-600 text-lg">←</span>}
                  nextLabel={<span className="text-gray-600 text-lg">→</span>}
                  navigationLabel={({ date }) => <span className="text-gray-800 font-semibold">{date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>}
                />

                <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                  <Button onClick={clearFilters} buttonStyle="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200">
                    Clear Filter
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCalendar(false);
                      console.log(dateRange);
                    }}
                    buttonStyle="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200"
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ModalMenuFragment
            isOpen={isviewDetailModalOpen}
            onClose={handleCloseDetailModal}
            title={
              <span className="text-2xl font-semibold flex items-center gap-2 px-4">
                <MdBarcodeReader />
                Scan Activity
              </span>
            }
          >
            <div className="flex flex-col gap-4 p-4">
              <Title titleStyle="text-xl flex items-center gap-2">
                Resi Number :<span className="bg-green-600 p-1 rounded-md font-bold text-white">{selectedItem?.resi_id || ""}</span>
              </Title>

              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="py-3 px-4 text-left font-semibold">Timestamp</th>
                        <th className="py-3 px-4 text-left font-semibold">Scan by</th>
                        <th className="py-3 px-4 text-left font-semibold">Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan="3" className="py-8 px-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                              Loading...
                            </div>
                          </td>
                        </tr>
                      ) : logResiDetail.length > 0 ? (
                        logResiDetail.map((log, index) => (
                          <tr className="hover:bg-gray-50" key={index}>
                            <td className="py-3 px-4">{formatDateWithTime(log.proses_scan)}</td>
                            <td className="py-3 px-4">{log.nama_pekerja}</td>
                            <td className="py-3 px-4">{log.status}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="py-8 px-4 text-center text-gray-500">
                            No activity found for this resi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ModalMenuFragment>

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

          <div className="w-full flex flex-col gap-3 md:gap-5 mb-4 px-4">
            <div className="w-full flex items-center justify-end gap-5 mt-5">
              {calendarButton}
              <DateFilterStatus />
              <Button onClick={() => setIsModalOpen(true)} buttonStyle="w-32 md:w-auto bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md transition-all duration-200">
                Add Barang
              </Button>
            </div>
            <SearchFragment value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, resi, or category..." />
          </div>

          {/* Wrap content in a container with overflow handling */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-wrap justify-center gap-4 p-4">
              {currentItems.map((item, index) => (
                <ItemCard key={index} item={item} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="flex justify-between items-center gap-2 py-4 px-4">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} entries
                </div>
                <div className="flex gap-2">
                  <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className={`px-3 py-1 rounded ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}>
                    Previous
                  </button>

                  {[...Array(totalPages)].map((_, index) => {
                    // Show first page, last page, current page, and one page before and after current
                    if (index === 0 || index === totalPages - 1 || (index >= currentPage - 2 && index <= currentPage)) {
                      return (
                        <button key={index} onClick={() => paginate(index + 1)} className={`px-3 py-1 rounded ${currentPage === index + 1 ? "bg-blue-600 text-white" : "bg-blue-500 text-white hover:bg-blue-600"}`}>
                          {index + 1}
                        </button>
                      );
                    } else if (index === 1 || index === totalPages - 2) {
                      return (
                        <span key={index} className="px-2">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Confirmation Modal */}
      <ModalMenuFragment
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={
          <span className="text-2xl font-semibold flex items-center gap-2 px-4">
            <FiAlertTriangle className="text-yellow-500" />
            Confirm Add Item
          </span>
        }
      >
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Are you sure you want to add this item?</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p>
                <span className="font-semibold">Resi ID:</span> {formData?.resi_id}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setShowConfirm(false);
                setIsModalOpen(true);
              }}
              buttonStyle="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md"
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSubmit} buttonStyle="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md">
              Confirm
            </Button>
          </div>
        </div>
      </ModalMenuFragment>
    </DashboardLayout>
  );
};

export default AdminBarangSection;
