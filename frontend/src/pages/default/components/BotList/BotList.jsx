import React, { useState, useEffect } from "react";
import "./BotList.scss";
import { Table, Pagination, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import ApiService from "../../../../services/Api.service";
import { toast } from "react-toastify";
import { getErrorMessage, notifyApiError, notifyError, notifySuccess, notifyWarning } from "../../../../utils/notify";
import { FaMicrophone, FaTrash, FaUpload } from "react-icons/fa";

const BotList = () => {
  const [bots, setBots] = useState([]);
  const [formData, setFormData] = useState({ bot_name: "", description: "" });
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const botsPerPage = 4;

  useEffect(() => {
    fetchAllChatBots();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { bot_name, description } = formData;

    if (!bot_name || !description) {
      notifyWarning("Please fill in all fields to create an interview session.");
      setLoading(false);

      return;
    }

    let { data, error } = await ApiService.createChatBot(formData);
    setLoading(false);

    if (error) {
      notifyApiError(error, "Could not create session. Please try again.");
      return;
    }

    if (data) {
      fetchAllChatBots();
      notifySuccess(data.message || "Session created successfully.");
    }

    setFormData({ bot_name: "", description: "" });
  };

  const fetchAllChatBots = async (e) => {
    let { data, error } = await ApiService.getAllChatBots({});

    if (error) {
      notifyApiError(error, "Could not load sessions. Please refresh the page.");
      return;
    }

    if (data) {
      setBots(data.result);
    }
  };

  const handleDelete = async (botId) => {
    if (!window.confirm("Are you sure you want to delete this interview session? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    let { data, error } = await ApiService.deleteBot(botId);
    setLoading(false);

    if (error) {
      notifyApiError(error, "Failed to delete session. Please try again.");
      return;
    }

    if (data) {
      notifySuccess(data.message || "Session deleted successfully.");
      fetchAllChatBots();
    }
  };

  // Pagination logic
  const indexOfLastBot = currentPage * botsPerPage;
  const indexOfFirstBot = indexOfLastBot - botsPerPage;
  const currentBots = bots.slice(indexOfFirstBot, indexOfLastBot);
  const totalPages = Math.ceil(bots.length / botsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  let navigate = useNavigate();

  const goToPage = (url, id, namespace_id = "") => {
    navigate(`${url}?id=${id}&namespace_id=${namespace_id}`);
  };

  return (
    <div className="bot-list-container container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm p-4  rounded-4 mb-3">
            <h4 className="fw-bold mb-3 text-center text-primary">
              <FaMicrophone className="me-2" /> Create a New Interview Session
            </h4>
            <p className="text-center text-muted mb-4 small">
              Set up a new interview preparation session to practice Java interviews with voice commands
            </p>

            <form>
              <div className="mb-3">
                <label className="form-label fw-semibold">Session Name</label>
                <input
                  type="text"
                  name="bot_name"
                  className="form-control form-control-lg"
                  placeholder="Enter session name (e.g., Java Fundamentals, Spring Boot, etc.)"
                  value={formData.bot_name}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Description</label>
                <textarea
                  name="description"
                  className="form-control form-control-lg"
                  rows="2"
                  placeholder="Enter session description (e.g., Core Java concepts, Design patterns, etc.)"
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>

              {error && <div className="alert alert-danger py-2">{error}</div>}

              <button
                onClick={handleCreate}
                className="btn btn-primary w-100 py-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Creating...
                  </>
                ) : (
                  "Create Interview Session"
                )}
              </button>
            </form>
          </div>

          <div className="card shadow-sm p-4 py-3 rounded-4">
            <h5 className="fw-bold mb-3 text-secondary">All Interview Sessions</h5>

            {bots.length === 0 ? (
              <p className="text-muted text-center mb-0">
                No interview sessions created yet. Create your first session to start practicing!
              </p>
            ) : (
              <>
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Session Name</th>
                        <th>Description</th>
                        <th>Created At</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBots.map((bot, index) => (
                        <tr key={bot._id["$oid"]}>
                          <td>{indexOfFirstBot + index + 1}</td>
                          <td className="fw-semibold">{bot?.bot_name}</td>
                          <td>{bot?.description}</td>
                          <td>{new Date(bot?.created_at["$date"]).toLocaleDateString()}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                onClick={() => {
                                  goToPage(
                                    "/default/doc-upload",
                                    bot._id["$oid"],
                                    bot.namespace_id
                                  );
                                }}
                                size="sm"
                                variant="outline-primary"
                              >
                                <FaUpload className="me-2" /> Upload Materials
                              </Button>
                              <Button
                                onClick={() => {
                                  goToPage(
                                    "/default/chat",
                                    bot._id["$oid"],
                                    bot.namespace_id
                                  );
                                }}
                                size="sm"
                                variant="outline-danger"
                              >
                                <FaMicrophone className="me-2" /> Start Interview
                              </Button>
                              <Button
                                onClick={() => handleDelete(bot._id["$oid"])}
                                size="sm"
                                variant="outline-danger"
                                disabled={loading}
                                title="Delete Session"
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 0 && (
                  <Pagination size="sm" className="justify-content-end mt-3">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotList;
