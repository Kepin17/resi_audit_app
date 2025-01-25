import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../Layouts/DashboardLayout";
import { FaBox } from "react-icons/fa";
import { IoIosAddCircle } from "react-icons/io";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "../../../Elements/Button";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import ModalMenuFragment from "../../../Fragments/ModalMenuFragment";
import InputFragment from "../../../Fragments/InputFragment";
import Form from "../../../Elements/Form";

const CategoryCard = ({ category, onEdit, onDelete }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <FaBox className="text-2xl text-orange-500" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{category.nama_category}</h3>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => onEdit(category)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
          Edit
        </button>
        <button onClick={() => onDelete(category)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
          Delete
        </button>
      </div>
    </div>
  );
};

const KategoriPage = () => {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    nama_category: "",
  });
  const [formData, setFormData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    id_category: "",
    nama_category: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/v1/categories", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Ensure we have an array of categories
      const categoriesData = Array.isArray(response.data.data) ? response.data.data : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
      setCategories([]); // Set empty array on error
    }
  };

  const submitHandler = (e) => {
    e.preventDefault();

    if (!form.nama_category.trim()) {
      toast.error("Category name is required");
      return;
    }

    setFormData(form);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      const response = await axios.post("http://localhost:8080/api/v1/categories", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Category added successfully");
      setCategories([...categories, response.data.data]);

      // Reset form
      setForm({ nama_category: "" });
      setShowConfirm(false);
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add category");
    }
  };

  const handleEditClick = (category) => {
    setEditForm({
      id_category: category.id_category,
      nama_category: category.nama_category,
    });
    setIsEditModalOpen(true);
  };

  const submitEditHandler = (e) => {
    e.preventDefault();
    if (!editForm.nama_category.trim()) {
      toast.error("Category name is required");
      return;
    }
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = async () => {
    try {
      const response = await axios.put(
        `http://localhost:8080/api/v1/categories/${editForm.id_category}`,
        { nama_category: editForm.nama_category },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Category updated successfully");

      // Update categories list
      setCategories(categories.map((cat) => (cat.id_category === editForm.id_category ? { ...cat, nama_category: editForm.nama_category } : cat)));

      // Reset and close modals
      setEditForm({ id_category: "", nama_category: "" });
      setShowEditConfirm(false);
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update category");
    }
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:8080/api/v1/categories/${categoryToDelete.id_category}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Category deleted successfully");

      // Update categories list by removing deleted category
      setCategories(categories.filter((cat) => cat.id_category !== categoryToDelete.id_category));

      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full p-4">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-100">Category Management</h1>
          <Button onClick={() => setIsModalOpen(true)} buttonStyle="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
            <IoIosAddCircle className="text-xl" />
            Add Category
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.isArray(categories) && categories.length > 0 ? (
            categories.map((category) => <CategoryCard key={category?.id_category || Math.random()} category={category || {}} onEdit={handleEditClick} onDelete={handleDeleteClick} />)
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">No categories found</div>
          )}
        </div>

        <ModalMenuFragment
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            <span className="text-2xl font-semibold flex items-center gap-2 px-4">
              <FaBox className="text-orange-400" />
              Add New Category
            </span>
          }
        >
          <Form formStyle="flex flex-col gap-4 p-4" onSubmit={submitHandler}>
            <InputFragment htmlFor="nama_category" inputName="nama_category" inputValue={form.nama_category} inputOnChange={(e) => setForm({ nama_category: e.target.value })}>
              Category Name
            </InputFragment>
            <Button buttonStyle="bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-2 font-bold text-white p-2 rounded-md">
              <IoIosAddCircle className="text-xl" />
              Add Category
            </Button>
          </Form>
        </ModalMenuFragment>

        <ModalMenuFragment
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          title={
            <span className="text-2xl font-semibold flex items-center gap-2 px-4">
              <FiAlertTriangle className="text-yellow-500" />
              Confirm Add Category
            </span>
          }
        >
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Are you sure you want to add this category?</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <span className="font-semibold">Category Name:</span> {formData?.nama_category}
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

        <ModalMenuFragment
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={
            <span className="text-2xl font-semibold flex items-center gap-2 px-4">
              <FaBox className="text-orange-400" />
              Edit Category
            </span>
          }
        >
          <Form formStyle="flex flex-col gap-4 p-4" onSubmit={submitEditHandler}>
            <InputFragment htmlFor="nama_category" inputName="nama_category" inputValue={editForm.nama_category} inputOnChange={(e) => setEditForm({ ...editForm, nama_category: e.target.value })}>
              Category Name
            </InputFragment>
            <Button buttonStyle="bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-2 font-bold text-white p-2 rounded-md">Update Category</Button>
          </Form>
        </ModalMenuFragment>

        <ModalMenuFragment
          isOpen={showEditConfirm}
          onClose={() => setShowEditConfirm(false)}
          title={
            <span className="text-2xl font-semibold flex items-center gap-2 px-4">
              <FiAlertTriangle className="text-yellow-500" />
              Confirm Edit Category
            </span>
          }
        >
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Are you sure you want to update this category?</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <span className="font-semibold">New Category Name:</span> {editForm.nama_category}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowEditConfirm(false);
                  setIsEditModalOpen(true);
                }}
                buttonStyle="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmEdit} buttonStyle="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md">
                Confirm
              </Button>
            </div>
          </div>
        </ModalMenuFragment>

        <ModalMenuFragment
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setCategoryToDelete(null);
          }}
          title={
            <span className="text-2xl font-semibold flex items-center gap-2 px-4">
              <FiAlertTriangle className="text-red-500" />
              Confirm Delete Category
            </span>
          }
        >
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Are you sure you want to delete this category?</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <span className="font-semibold">Category Name: </span>
                  {categoryToDelete?.nama_category}
                </p>
              </div>
              <p className="mt-4 text-red-500 text-sm">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCategoryToDelete(null);
                }}
                buttonStyle="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} buttonStyle="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md">
                Delete
              </Button>
            </div>
          </div>
        </ModalMenuFragment>

        <ToastContainer position="top-center" autoClose={2000} />
      </div>
    </DashboardLayout>
  );
};

export default KategoriPage;
