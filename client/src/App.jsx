import { Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./Components/Pages/Home";
import LoginPage from "./Components/Pages/Auth/Login";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </>
  );
}

export default App;
