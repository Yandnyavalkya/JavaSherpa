import React, { useState, useEffect } from "react";
import "./BotList.scss";
import { Table, Pagination, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import ApiService from "../../../../services/Api.service";
import { toast } from "react-toastify";

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
      toast.error("Please fill in all fields.");
      setLoading(false);

      return;
    }

    let { data, error } = await ApiService.createChatBot(formData);
    setLoading(false);

    if (error) {
      toast.error(error.response.data.message);
      return;
    }

    if (data) {
      fetchAllChatBots();
      toast.success(data.message);
    }

    setFormData({ bot_name: "", description: "" });
  };

  const fetchAllChatBots = async (e) => {
    let { data, error } = await ApiService.getAllChatBots({});

    if (error) {
      toast.error(error.response.data.message);
      return;
    }

    if (data) {
      setBots(data.result);
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
    <div className="bot-list-container container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm p-4  rounded-4 mb-3">
            <h4 className="fw-bold mb-3 text-center text-primary">
              🤖 Create a New Chatbot
            </h4>

            <form>
              <div className="mb-3">
                <label className="form-label fw-semibold">Bot Name</label>
                <input
                  type="text"
                  name="bot_name"
                  className="form-control form-control-lg"
                  placeholder="Enter bot name"
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
                  placeholder="Enter bot description"
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
                    Saving...
                  </>
                ) : (
                  "Create Bot"
                )}
              </button>
            </form>
          </div>

          <div className="card shadow-sm p-4 py-3 rounded-4">
            <h5 className="fw-bold mb-3 text-secondary">All Chatbots</h5>

            {bots.length === 0 ? (
              <p className="text-muted text-center mb-0">
                No bots created yet.
              </p>
            ) : (
              <>
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Name</th>
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
                          <td>{bot?.created_at["$date"]}</td>
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
                                Upload Doc
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
                                Chat
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
