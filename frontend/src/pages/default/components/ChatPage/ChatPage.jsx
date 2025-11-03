import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./ChatPage.scss";
import ApiService, {
  startConversation,
} from "../../../../services/Api.service";
import { PulseLoader } from "react-spinners";

const ChatPage = () => {
  let [searchParams] = useSearchParams();

  const [messages, setMessages] = useState([
    {
      question: "",
      Ai_response: "Hello, How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
 
    setMessages((prev) => [...prev, { question: input, Ai_response: "" }]);

    try {
      let payload = {
        question: input,
        namespace_id: searchParams.get("namespace_id"),
        chatHistory: messages,
      };
      setInput("");

      await startConversation(payload, (chunk) => {
        const chunkText =
          typeof chunk === "string"
            ? chunk
            : chunk?.text ??
              chunk?.Ai_response ??
              chunk?.data ??
              JSON.stringify(chunk);

        setMessages((prev) => {
          const lastIdx = prev.length - 1;

          if (lastIdx < 0) return prev;

          const updated = [...prev];
          const last = { ...updated[lastIdx] };

          if (last.question === "") {
            last.Ai_response = (last.Ai_response || "") + chunkText;
            updated[lastIdx] = last;

            return updated;
          }

          return [...prev, { question: "", Ai_response: chunkText }];
        });
      });
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) => [
        ...prev,
        { question: "", Ai_response: "⚠️ Error receiving response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatResponse = (text) => {
    return text
      .replace(/For More Reference:/g, "\n\nFor More Reference:\n")
      .replace(/•/g, "\n•")
      .replace(/\. /g, ".\n")
      .replace(/- /g, "\n -")
      .trim();
  };

  return (
    <div className="chat-page container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-9 col-md-10">
          <div className="card chat-card shadow-sm rounded-4">
            <div className="chat-header border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold text-primary mb-0">🤖</h5>
              <Button
                variant="outline-secondary"
                className="rounded-pill px-4"
                onClick={() => navigate(-1)}
              >
                ← Back
              </Button>
            </div>

            <div className="chat-body px-3 py-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message-row ${
                    msg.question ? "text-end" : "text-start"
                  }`}
                >
                  <div
                    className={`message-bubble ${
                      msg.question ? "user-msg" : "bot-msg"
                    }`}
                  >
                    {msg.question && (
                      <div className="font-semibold">{msg.question}</div>
                    )}

                    {msg.Ai_response && (
                      <div
                        className="whitespace-pre-line text-left"
                        style={{
                          whiteSpace: "pre-wrap",
                          lineHeight: "1.6",
                        }}
                      >
                        {formatResponse(msg.Ai_response)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-start mt-2">
                  <div className="bot-msg d-inline-block px-3 py-1 rounded-4 bg-light">
                    <PulseLoader
                      color="#409fffff"
                      size={8}
                      margin={3}
                      speedMultiplier={0.7}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="chat-input border-top px-3 py-3">
              <form className="d-flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="form-control rounded-pill px-3"
                />
                <button
                  className="btn btn-primary rounded-pill px-4"
                  onClick={handleSend}
                  disabled={loading}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
