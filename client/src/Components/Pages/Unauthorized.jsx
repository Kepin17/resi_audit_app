import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold text-red-600 mb-4">401</h1>
        <h2 className="text-2xl font-semibold mb-4">Unauthorized Access</h2>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Go Back
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
