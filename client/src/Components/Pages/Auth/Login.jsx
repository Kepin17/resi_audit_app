import React from "react";
import AuthLayout from "../../Layouts/AuthLayout";
import InputFragment from "../../Fragments/InputFragment";
import { IoIosWarning } from "react-icons/io";
import SubChapter from "../../Elements/SubChapter";
import axios from "axios";
const LoginPage = () => {
  const [loginData, setLoginData] = React.useState({
    username: "",
    password: "",
  });

  const loginHandler = (e) => {
    e.preventDefault();
    axios
      .post("http://localhost:8080/api/v1/auth/login", loginData)
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        if (err.response) {
          // Server responded with a status other than 200 range
          console.error("Response error:", err.response.data);
        } else if (err.request) {
          // Request was made but no response received
          console.error("Request error:", err.request);
        } else {
          // Something else happened
          console.error("Error:", err.message);
        }
      });
  };
  return (
    <>
      <AuthLayout onSubmit={loginHandler}>
        <InputFragment htmlFor={"username"} InputType="text" inputName={"username"} inputValue={loginData.username} inputOnChange={(e) => setLoginData({ ...loginData, username: e.target.value })}>
          username
        </InputFragment>

        <InputFragment htmlFor={"password"} InputType={"password"} inputName={"password"} inputValue={loginData.password} inputOnChange={(e) => setLoginData({ ...loginData, password: e.target.value })}>
          password
        </InputFragment>

        <div className="note-section bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 p-4 flex flex-col gap-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
          <SubChapter titleStyle="text-md font-bold flex items-center gap-2">
            <IoIosWarning className="text-2xl text-orange-400" />
            <span className="text-orange-700">Catatan :</span>
          </SubChapter>
          <p className="text-gray-700 font-medium">Jika anda lupa password, silahkan hubungi admin</p>
        </div>
      </AuthLayout>
    </>
  );
};

export default LoginPage;
