import React, { useEffect, useState, useRef } from "react";
import { Button, Table, Pagination } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import ApiService from "../../../../services/Api.service";
import { toast } from "react-toastify";
import { bytesToMB } from "../../../../utils/helper";
import DeleteConfirmModal from "../../../../components/confirmation.modal";
import "./FileUpload.scss";

const PdfManager = () => {
  const navigate = useNavigate();
  let [searchParams] = useSearchParams();
  const [files, setFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const filesPerPage = 5;
  const fileInputRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletetionItem, setdeletetionItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    fetchAllFiles();
  }, []);

  const fetchAllFiles = async () => {
    let { data, error } = await ApiService.getAllFiles(searchParams.get("id"));

    if (error) {
      toast.error(error.response.data.message);
      return;
    }

    if (data) {
      setFiles(data.result);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files[0]);
  };

  const uploadFile = async () => {
    setLoading(true);

    const formData = new FormData();
    formData.append("chatbot_id", searchParams.get("id"));
    formData.append("namespace_id", searchParams.get("namespace_id"));
    formData.append("files", selectedFiles);

    let { data, error } = await ApiService.uploadFile(formData);
    setLoading(false);

    if (error) {
      toast.error(error.response.data.message);
      return;
    }

    if (data) {
      fetchAllFiles();
      resetFileInput();
    }
  };

  const resetFileInput = () => {
    setSelectedFiles(null);
    fileInputRef.current.value = "";
  };

  const handleDeleteClick = (item) => {
    setdeletetionItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletetionItem) return;
    setIsDeleting(true);

    let payload = {
      id: deletetionItem._id["$oid"],
      name: deletetionItem.name,
      namespace_id: deletetionItem.namespace_id,
    };
    let { data, error } = await ApiService.deleteFile(payload);

    if (error) {
      toast.error(error.response.data.message);
    }

    if (data) {
      setCurrentPage(1);
      fetchAllFiles();
    }
    setIsDeleting(false);
    setdeletetionItem(null);
    setShowDeleteModal(false);
  };

  // Pagination logic
  const indexOfLastFile = currentPage * filesPerPage;
  const indexOfFirstFile = indexOfLastFile - filesPerPage;
  const currentFiles = files.slice(indexOfFirstFile, indexOfLastFile);
  const totalPages = Math.ceil(files.length / filesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="container-fluid p-4 ">
      <div className="row justify-content-center ">
        <div className="col-8">
          <div className="row align-items-center mb-4">
            <div className="col">
              <h3 className="fw-bold text-primary">📄 PDF Upload Manager</h3>
            </div>
            <div className="col text-end">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                className="px-4"
              >
                ← Back
              </Button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="card shadow-sm p-4 mb-4">
            <form>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Select PDF File
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </div>

              <div className="text-end">
                <Button
                  variant="primary"
                  onClick={uploadFile}
                  disabled={!selectedFiles || loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Uploading...
                    </>
                  ) : (
                    "Upload PDF"
                  )}
                </Button>
              </div>
            </form>
          </div>

          <div className="card shadow-sm p-3">
            <h5 className="fw-semibold mb-3 text-secondary">Uploaded PDFs</h5>
            <div className="table-responsive">
              <Table responsive bordered hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>File Name</th>
                    <th>Size (MB)</th>
                    <th>Uploaded Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentFiles.map((file, index) => (
                    <tr key={file._id["$oid"]}>
                      <td>{indexOfFirstFile + index + 1}</td>
                      <td>{file?.name}</td>
                      <td>{bytesToMB(file?.size).toFixed(3)} </td>
                      <td>{file?.createdAt["$date"]}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            onClick={() => handleDeleteClick(file)}
                            size="sm"
                            variant="outline-danger"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {totalPages > 0 && (
              <Pagination size="sm"  className="justify-content-end mt-3">
                <Pagination.First
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                />

                {(() => {
                  const pageNumbers = [];
                  const maxVisible = 3;
                  let start = Math.max(
                    1,
                    currentPage - Math.floor(maxVisible / 2)
                  );
                  let end = start + maxVisible - 1;

                  if (end > totalPages) {
                    end = totalPages;
                    start = Math.max(1, end - maxVisible + 1);
                  }

                  for (let i = start; i <= end; i++) {
                    pageNumbers.push(
                      <Pagination.Item
                        key={i}
                        active={i === currentPage}
                        onClick={() => paginate(i)}
                      >
                        {i}
                      </Pagination.Item>
                    );
                  }

                  return pageNumbers;
                })()}

                <Pagination.Next
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
                <Pagination.Last
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            )}
          </div>

          <DeleteConfirmModal
            show={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
            message={`Are you sure you want to delete "${deletetionItem?.name}"?`}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    </div>
  );
};

export default PdfManager;
