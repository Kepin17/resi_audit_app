import React, { useState } from "react";

const PaginationFragment = ({ children, data = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  // Ensure data is an array and not undefined
  const safeData = Array.isArray(data) ? data : [];

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeData.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <>
      {currentItems.map((item, index) =>
        React.cloneElement(children, {
          ...children.props,
          key: index,
          item: item,
        })
      )}

      {safeData.length > itemsPerPage && (
        <div className="col-span-full m-auto">
          <div className="flex flex-col items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, safeData.length)} of {safeData.length} entries
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                Previous
              </button>

              {getPageNumbers().map((number, index) => (
                <button
                  key={index}
                  onClick={() => typeof number === "number" && paginate(number)}
                  className={`px-4 py-2 rounded-md ${currentPage === number ? "bg-blue-600 text-white" : number === "..." ? "bg-white text-gray-600 cursor-default" : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"}`}
                >
                  {number}
                </button>
              ))}

              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaginationFragment;
