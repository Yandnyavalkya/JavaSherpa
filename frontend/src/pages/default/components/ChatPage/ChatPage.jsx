import React, { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./ChatPage.scss";
import ApiService, {
  startConversation,
} from "../../../../services/Api.service";
import { PulseLoader } from "react-spinners";
import { getVariable, removeVariable } from "../../../../utils/localStorage";

const ChatPage = () => {
  let [searchParams] = useSearchParams();
  const namespaceId = searchParams.get("namespace_id");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Voice: STT and TTS state
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef(null);
  const speakingRef = useRef(false);
  const lastSpokenChunkRef = useRef("");

  const navigate = useNavigate();

  // Persist/restore chat history per namespace
  const storageKey = `chat_history_${namespaceId || "default"}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          return;
        }
      }
      // If no stored history, start with a greeting
      setMessages([
        { question: "", Ai_response: "Hello! Welcome to JavaSherpa. I'm your AI-powered Java interview agent. I'll help you prepare for Java interviews through real-time interview simulation. You can use voice commands or type your responses. Let's begin! What Java topic would you like to practice today?" },
      ]);
    } catch (_) {
      setMessages([
        { question: "", Ai_response: "Hello! Welcome to JavaSherpa. I'm your AI-powered Java interview agent. I'll help you prepare for Java interviews through real-time interview simulation. You can use voice commands or type your responses. Let's begin! What Java topic would you like to practice today?" },
      ]);
    }
  // only when namespace changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (_) {}
    // Also persist to backend (debounced-ish)
    const save = async () => {
      if (!namespaceId || messages.length === 0) return;
      setSaving(true);
      await ApiService.saveHistory(namespaceId, messages);
      setSaving(false);
    };
    save();
  }, [messages, storageKey]);

  // Initialize SpeechRecognition (STT)
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.lang = "en-US";
      recog.interimResults = true;
      recog.continuous = true; // keep capturing across phrases

      recog.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recog.onstart = () => {
        setIsListening(true);
      };

      recog.onend = () => {
        // If user hasn't explicitly stopped, restart to avoid premature turn-off
        if (isListening) {
          try { recog.start(); } catch (_) {}
        }
      };

      recognitionRef.current = recog;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      setIsListening(true);
      recognitionRef.current.start();
    } catch (e) {
      // ignore repeated start
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      setIsListening(false);
      recognitionRef.current.stop();
    } catch (e) {
      // no-op
    }
  };

  const clearChat = async () => {
    try {
      stopListening();
      if (namespaceId) {
        await ApiService.resetInterview(namespaceId);
      }
    } catch (_) {}
    try { localStorage.removeItem(storageKey); } catch (_) {}
    setMessages([{ question: "", Ai_response: "Hello! Welcome to JavaSherpa. I'm your AI-powered Java interview agent. I'll help you prepare for Java interviews through real-time interview simulation. You can use voice commands or type your responses. Let's begin! What Java topic would you like to practice today?" }]);
    setInput("");
  };

  const downloadPdf = async () => {
    if (!namespaceId || messages.length === 0) return;
    const { data } = await ApiService.saveHistoryPdf(namespaceId, messages);
    if (data?.result?.pdf_path) {
      // simple download trigger
      const path = data.result.pdf_path;
      // If the server serves static files, we could open path; otherwise we can fetch and blob.
      try {
        window.open(path, '_blank');
      } catch (_) {}
    }
  };

  const getPreferredVoice = () => {
    if (!window.speechSynthesis) return null;
    const settings = getVariable("app_settings") || {};
    const preferred = (settings.voice || "female").toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const isMale = preferred === "male";
    const match = voices.find((v) => {
      const name = `${v.name} ${v.voiceURI}`.toLowerCase();
      // Heuristic keywords for male/female
      const maleHints = ["male", "daniel", "george", "guy", "david", "microsoft arthur", "microsoft guy"];
      const femaleHints = ["female", "samantha", "victoria", "karen", "zira", "microsoft aria", "jenny", "linda"];
      const hints = isMale ? maleHints : femaleHints;
      return hints.some((h) => name.includes(h));
    });
    return match || voices[0];
  };

  // TTS helpers
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis || !text) return;
    // De-dup guard: avoid speaking identical chunk twice
    if (text === lastSpokenChunkRef.current) return;
    lastSpokenChunkRef.current = text;

    const voice = getPreferredVoice();

    // Split into manageable chunks to avoid very long utterances
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    sentences.forEach((segment) => {
      const utter = new SpeechSynthesisUtterance(segment);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      if (voice) utter.voice = voice;
      utter.onstart = () => (speakingRef.current = true);
      utter.onend = () => (speakingRef.current = false);
      window.speechSynthesis.speak(utter);
    });
  };

  const cancelSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
    }
    // reset last chunk for next reply
    lastSpokenChunkRef.current = "";
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);

    // Stop speaking when user asks a new question
    cancelSpeech();

    setMessages((prev) => [...prev, { question: input, Ai_response: "" }]);

    try {
      let payload = {
        question: input,
        namespace_id: namespaceId,
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
            // Stream TTS as chunks arrive (deduped)
            speakText(chunkText);
            return updated;
          }

          // First bot chunk after user's question
          // Speak only once for the new chunk
          speakText(chunkText);
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

  const emphasizeNextQuestion = (text) => {
    let t = text;
    // Support backend separators like "===== Next Question (n) =====" or inline "Next Question (n):"
    t = t.replace(/\n?=+\s*Next Question\s*\((\d+)\)\s*=+\n?/gi, "\n\n🧠 Next Question ($1)\n");
    t = t.replace(/\bNext Question\s*\((\d+)\)\s*:/gi, "\n\n🧠 Next Question ($1)\n");
    return t;
  };

  const formatSummarySections = (text) => {
    let t = emphasizeNextQuestion(text);
    // Ensure a visible separator if backend inserted it or model produced 'Summary'
    t = t.replace(/\n?-{3,}\s*Interview Summary\s*-{0,}\n?/i, "\n\n———— Interview Summary ————\n");
    t = t.replace(/\bSummary of Interview:?/i, "\n\n———— Interview Summary ————\n");

    // Insert line breaks and emojis before key labels
    t = t.replace(/\bScore\s*:/i, "\n\nScore: ");
    t = t.replace(/\bStrengths\s*:/i, "\n\n✅ Strengths: ");
    t = t.replace(/\bWeak Areas\s*:/i, "\n\n⚠️ Weak Areas: ");
    t = t.replace(/\bLevel\s*:/i, "\n\n🎯 Level: ");
    t = t.replace(/\bSuggestions\s*:/i, "\n\n🛠 Suggestions: ");
    t = t.replace(/\bEncouraging Remark\s*:/i, "\n\n💬 Encouraging Remark: ");

    // Normalize bullets
    t = t.replace(/\n-\s+/g, "\n• ");

    return t;
  };

  const formatResponse = (text) => {
    const withSections = formatSummarySections(text);
    return withSections
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
              <div>
                <h5 className="fw-bold text-primary mb-0">☕ JavaSherpa Interview Session</h5>
                <small className="text-muted">AI-Powered Java Interview Practice with Voice Commands</small>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-warning"
                  className="rounded-pill px-3"
                  onClick={clearChat}
                  title="Clear chat and restart interview"
                >
                  ⟲ Restart Interview
                </Button>
                <Button
                  variant="outline-info"
                  className="rounded-pill px-3"
                  onClick={downloadPdf}
                  disabled={messages.length === 0}
                  title="Download interview transcript as PDF"
                >
                  ⬇️ Download Transcript
                </Button>
                <Button
                  variant={ttsEnabled ? "outline-success" : "outline-secondary"}
                  className="rounded-pill px-3"
                  onClick={() => setTtsEnabled((v) => !v)}
                  title={ttsEnabled ? "Disable voice replies" : "Enable voice replies"}
                >
                  {ttsEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
                </Button>
                <Button
                  variant="outline-secondary"
                  className="rounded-pill px-4"
                  onClick={() => navigate(-1)}
                >
                  ← Back
                </Button>
              </div>
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
              <form className="d-flex gap-2 align-items-center">
                <input
                  type="text"
                  placeholder={saving ? "Saving..." : isListening ? "Listening... Speak your answer" : "Type your answer or use voice..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="form-control rounded-pill px-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !loading && input.trim()) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                {recognitionRef.current && (
                  isListening ? (
                    <Button
                      variant="outline-danger"
                      className="rounded-pill px-3"
                      onClick={stopListening}
                      title="Stop microphone"
                      type="button"
                    >
                      ⏹
                    </Button>
                  ) : (
                    <Button
                      variant="outline-primary"
                      className="rounded-pill px-3"
                      onClick={startListening}
                      title="Start microphone for voice input"
                      type="button"
                    >
                      🎤
                    </Button>
                  )
                )}
                <button
                  className="btn btn-primary rounded-pill px-4"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  type="submit"
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

