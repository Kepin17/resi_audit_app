import axios from "axios";
import { useNavigate } from "react-router-dom";
import urlApi from "./url";

export const useAxios = () => {
  const navigate = useNavigate();

  const axiosInstance = axios.create({
    baseURL: urlApi,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && (error.response.status === 401 || error.response.data.message === "Token expired!")) {
        localStorage.removeItem("token");
        navigate("/login", { state: { message: "Session expired. Please login again." } });
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
