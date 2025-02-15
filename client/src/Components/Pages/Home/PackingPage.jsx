import React, { useEffect, useState } from "react";
import ScanMainLayout from "../../Layouts/ScanMainLayout";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import urlApi from "../../../utils/url";
import { toast } from "react-toastify";

const PackingPage = () => {
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [user, setUser] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }
    const decodeToken = jwtDecode(token);
    setUser(decodeToken);
  }, []);

  useEffect(() => {
    const fetchDailyEarnings = async () => {
      try {
        const response = await axios.get(`${urlApi}/api/v1/salary/daily-earnings?id_pekerja=${user.id_pekerja}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setDailyEarnings(response.data.data);
      } catch (err) {
        console.error("Error fetching daily earnings:", err);
        toast.error("Failed to fetch daily earnings");
      }
    };

    if (user.id_pekerja) {
      fetchDailyEarnings();

      // Refresh daily earnings every minute
      const interval = setInterval(fetchDailyEarnings, 60000);
      return () => clearInterval(interval);
    }
  }, [user.id_pekerja]);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  return <ScanMainLayout goTo={"packing"} dailyEarnings={formatRupiah(dailyEarnings)} />;
};

export default PackingPage;
