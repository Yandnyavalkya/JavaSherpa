import React, { useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./ChatPage.scss";
import ApiService, {
  startConversation,
} from "../../../../services/Api.service";
import { PulseLoader } from "react-spinners";
import { getVariable, removeVariable } from "../../../../utils/localStorage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "react-toastify";
import { 
  FaMicrophone, 
  FaDownload, 
  FaVolumeUp, 
  FaVolumeMute, 
  FaStop, 
  FaRedo,
  FaCopy,
  FaCheck,
  FaFileAlt,
  FaShare,
  FaTimes
} from "react-icons/fa";
import Logo from "../../../../components/Logo/Logo";

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

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [reportBlob, setReportBlob] = useState(null);
  const [reportError, setReportError] = useState(null);

  const navigate = useNavigate();
  const chatBodyRef = useRef(null);

  // Persist/restore chat history per namespace
  const storageKey = `chat_history_${namespaceId || "default"}`;

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // First try to load from backend
        if (namespaceId) {
          const { data: historyData } = await ApiService.getHistory(namespaceId);
          if (historyData && historyData.result && historyData.result.length > 0) {
            // Get the most recent history
            const latestHistory = historyData.result[0];
            if (latestHistory.messages_json) {
              try {
                const parsedMessages = JSON.parse(latestHistory.messages_json);
                if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                  setMessages(parsedMessages);
                  return;
                }
              } catch (e) {
                console.error('Error parsing backend history:', e);
              }
            }
          }
        }
        
        // Fallback to localStorage
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
          { question: "", Ai_response: "Hello! I'm JavaShepa — your AI interviewer for today. To get started, please tell me which Java topic you'd like to practice.\n\nYou can choose from our predefined topics: Polymorphism, Inheritance, Collections, Memory, Generics, Exceptions, Threads, Oop, Fundamentals\n\nOr you can specify any Java topic you'd like to practice (e.g., 'classes', 'interfaces', 'streams', 'lambda expressions', etc.)." },
        ]);
      } catch (error) {
        console.error('Error loading history:', error);
        // Fallback to greeting
        setMessages([
          { question: "", Ai_response: "Hello! I'm JavaShepa — your AI interviewer for today. To get started, please tell me which Java topic you'd like to practice.\n\nYou can choose from our predefined topics: Polymorphism, Inheritance, Collections, Memory, Generics, Exceptions, Threads, Oop, Fundamentals\n\nOr you can specify any Java topic you'd like to practice (e.g., 'classes', 'interfaces', 'streams', 'lambda expressions', etc.)." },
        ]);
      }
    };
    
    loadHistory();
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
    try {
      const response = await ApiService.saveHistoryPdf(namespaceId, messages);
      // The backend returns a FileResponse, so we need to handle it as a blob
      if (response?.data) {
        // Check if response is actually a blob (PDF file)
        if (response.data instanceof Blob) {
          const blob = response.data;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `JavaSherpa_Transcript_${namespaceId}_${new Date().getTime()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          // Handle error response (might be JSON string in blob)
          const text = await response.data.text();
          try {
            const errorData = JSON.parse(text);
            console.error('Error downloading PDF:', errorData);
          } catch {
            console.error('Error downloading PDF:', text);
          }
        }
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const downloadDetailedReport = async () => {
    if (!namespaceId || messages.length === 0) return;
    try {
      const response = await ApiService.generateDetailedReport(namespaceId, messages);
      if (response?.data) {
        if (response.data instanceof Blob) {
          const blob = response.data;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `JavaSherpa_Detailed_Report_${namespaceId}_${new Date().getTime()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const text = await response.data.text();
          try {
            const errorData = JSON.parse(text);
            console.error('Error downloading detailed report:', errorData);
          } catch {
            console.error('Error downloading detailed report:', text);
          }
        }
      }
    } catch (error) {
      console.error('Error downloading detailed report:', error);
    }
  };

  const viewDetailedReport = async () => {
    if (!namespaceId || messages.length === 0) {
      alert('No interview session found or messages are empty.');
      return;
    }
    try {
      setLoading(true);
      setReportError(null);
      const response = await ApiService.generateDetailedReport(namespaceId, messages);
      
      // Check for error response
      if (response?.error) {
        console.error('Error response:', response.error);
        const errorMessage = response.error.response?.data?.message || 
                           response.error.message || 
                           'Failed to load detailed report.';
        setReportError(errorMessage);
        alert(errorMessage);
        return;
      }
      
      if (response?.data) {
        // Check if response is a Blob (PDF)
        if (response.data instanceof Blob) {
          // Check if blob is actually an error JSON (sometimes errors come as blobs)
          if (response.data.type === 'application/json' || response.data.size < 1000) {
            const text = await response.data.text();
            try {
              const errorData = JSON.parse(text);
              console.error('Error in blob response:', errorData);
              setReportError(errorData.message || 'Failed to load detailed report.');
              alert(errorData.message || 'Failed to load detailed report.');
            } catch {
              // If it's not JSON, it might be a small PDF, proceed
              if (response.data.type === 'application/pdf') {
                const url = window.URL.createObjectURL(response.data);
                setReportBlob(response.data);
                setReportUrl(url);
                setShowReportModal(true);
                toast.info(
                  "An email will be sent shortly with the following attachments to your registered email address: Interview Transcript (PDF), Detailed Report (PDF), and Summary Audio (MP3).",
                  { autoClose: 6000 }
                );
              } else {
                setReportError('Unexpected response format.');
                alert('Unexpected response format from server.');
              }
            }
          } else if (response.data.type === 'application/pdf') {
            // Valid PDF blob
            const url = window.URL.createObjectURL(response.data);
            setReportBlob(response.data);
            setReportUrl(url);
            setShowReportModal(true);
            toast.info(
              "An email will be sent shortly with the following attachments to your registered email address: Interview Transcript (PDF), Detailed Report (PDF), and Summary Audio (MP3).",
              { autoClose: 6000 }
            );
          } else {
            setReportError('Response is not a PDF file.');
            alert('Response is not a PDF file.');
          }
        } else {
          // Response is not a blob, might be an error
          console.error('Unexpected response type:', typeof response.data);
          setReportError('Unexpected response format.');
          alert('Unexpected response format from server.');
        }
      } else {
        setReportError('No data received from server.');
        alert('No data received from server.');
      }
    } catch (error) {
      console.error('Error viewing detailed report:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load detailed report. Please try again.';
      setReportError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    if (reportUrl) {
      window.URL.revokeObjectURL(reportUrl);
      setReportUrl(null);
      setReportBlob(null);
    }
  };

  const handleDownloadFromModal = () => {
    if (reportBlob) {
      const url = window.URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `JavaSherpa_Detailed_Report_${namespaceId}_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const handleShareReport = async () => {
    if (reportBlob) {
      try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([reportBlob], `JavaSherpa_Detailed_Report_${namespaceId}.pdf`, { type: 'application/pdf' })] })) {
          const file = new File([reportBlob], `JavaSherpa_Detailed_Report_${namespaceId}.pdf`, { type: 'application/pdf' });
          await navigator.share({
            title: 'JavaSherpa Interview Report',
            text: 'Check out my Java interview detailed report!',
            files: [file]
          });
        } else {
          // Fallback: copy link or show share options
          if (reportUrl) {
            await navigator.clipboard.writeText(window.location.href);
            alert('Report link copied to clipboard! You can share this page.');
          } else {
            alert('Sharing is not supported on this device. Please use the download option.');
          }
        }
      } catch (error) {
        console.error('Error sharing report:', error);
        // Fallback to download
        handleDownloadFromModal();
      }
    }
  };

  // Copy code to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
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

  // Clean text for TTS - remove markdown, formatting, equals signs, and blank spaces
  const cleanTextForTTS = (text) => {
    if (!text) return "";
    
    // Remove equals signs and separators
    let cleaned = text
      // Remove equals signs and separators (===== Next Question =====)
      .replace(/=+/g, "")
      // Remove markdown code blocks (triple backticks with optional language)
      .replace(/```[\w]*\n[\s\S]*?```/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      // Remove markdown links
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      // Remove markdown bold/italic
      .replace(/\*\*([^\*]+)\*\*/g, "$1")
      .replace(/\*([^\*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove "Follow-up Question:" markers and separators
      .replace(/\*\*Follow-up Question:\*\*/gi, "")
      .replace(/Follow-up Question:\s*/gi, "")
      .replace(/---+/g, "")
      // Remove emojis and special characters
      .replace(/🧠/g, "")
      .replace(/✅/g, "")
      .replace(/⚠️/g, "warning")
      .replace(/🎯/g, "")
      .replace(/🛠/g, "")
      .replace(/💬/g, "")
      // Remove "Next Question" markers
      .replace(/\n?=+\s*Next Question\s*\([^)]+\)\s*=+\n?/gi, "")
      .replace(/\bNext Question\s*\([^)]+\)\s*:/gi, "")
      // Remove multiple consecutive newlines, spaces, and formatting symbols
      .replace(/\n{3,}/g, ". ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[=\-_\*]{3,}/g, "") // Remove separator lines
      // Remove leading/trailing whitespace from each line
      .split("\n")
      .map(line => line.trim())
      .filter(line => {
        // Remove empty lines and lines that are only separators/formatting
        if (line.length === 0) return false;
        if (line.match(/^[=\-_\*\s]+$/)) return false;
        if (line.match(/^```/)) return false; // Code block markers
        return true;
      })
      .join(". ")
      // Clean up any remaining formatting
      .replace(/\.{2,}/g, ".")
      .replace(/\s{2,}/g, " ") // Multiple spaces
      .replace(/[^\w\s.,!?;:'"()-]/g, " ") // Remove special symbols except punctuation
      .replace(/\s+/g, " ") // Single spaces only
      .trim();
    
    return cleaned;
  };

  // TTS helpers
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis || !text) return;
    
    // Clean the text before speaking
    const cleanedText = cleanTextForTTS(text);
    if (!cleanedText || cleanedText.trim().length === 0) return;
    
    // De-dup guard: avoid speaking identical chunk twice
    if (cleanedText === lastSpokenChunkRef.current) return;
    lastSpokenChunkRef.current = cleanedText;

    const voice = getPreferredVoice();

    // Split into manageable chunks to avoid very long utterances
    const sentences = cleanedText.split(/(?<=[.!?])\s+/).filter(Boolean);
    sentences.forEach((segment) => {
      if (segment.trim().length === 0) return;
      const utter = new SpeechSynthesisUtterance(segment.trim());
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

  // Stop speaking when TTS is disabled
  useEffect(() => {
    if (!ttsEnabled && window.speechSynthesis) {
      cancelSpeech();
    }
  }, [ttsEnabled]);

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
            // Stream TTS as chunks arrive (cleaned and deduped)
            const cleanedChunk = cleanTextForTTS(chunkText);
            if (cleanedChunk && cleanedChunk.trim().length > 0) {
              speakText(cleanedChunk);
            }
            return updated;
          }

          // First bot chunk after user's question
          // Clean and speak only once for the new chunk
          const cleanedChunk = cleanTextForTTS(chunkText);
          if (cleanedChunk && cleanedChunk.trim().length > 0) {
            speakText(cleanedChunk);
          }
          return [...prev, { question: "", Ai_response: chunkText }];
        });
      });
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) => [
        ...prev,
        { question: "", Ai_response: "Error receiving response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const emphasizeNextQuestion = (text) => {
    let t = text;
    // Support backend separators like "===== Next Question (n) =====" or inline "Next Question (n):"
    t = t.replace(/\n?=+\s*Next Question\s*\((\d+)\)\s*=+\n?/gi, "\n\nNext Question ($1)\n");
    t = t.replace(/\bNext Question\s*\((\d+)\)\s*:/gi, "\n\nNext Question ($1)\n");
    return t;
  };

  const formatSummarySections = (text) => {
    let t = emphasizeNextQuestion(text);
    // Ensure a visible separator if backend inserted it or model produced 'Summary'
    t = t.replace(/\n?-{3,}\s*Interview Summary\s*-{0,}\n?/i, "\n\n———— Interview Summary ————\n");
    t = t.replace(/\bSummary of Interview:?/i, "\n\n———— Interview Summary ————\n");

    // Insert line breaks and emojis before key labels
    t = t.replace(/\bScore\s*:/i, "\n\nScore: ");
    t = t.replace(/\bStrengths\s*:/i, "\n\nStrengths: ");
    t = t.replace(/\bWeak Areas\s*:/i, "\n\nWeak Areas: ");
    t = t.replace(/\bLevel\s*:/i, "\n\nLevel: ");
    t = t.replace(/\bSuggestions\s*:/i, "\n\nSuggestions: ");
    t = t.replace(/\bEncouraging Remark\s*:/i, "\n\nEncouraging Remark: ");

    // Normalize bullets
    t = t.replace(/\n-\s+/g, "\n• ");

    return t;
  };

  const formatResponse = (text) => {
    let formatted = text;
    
    // First, protect code blocks from modification by temporarily replacing them
    const codeBlockPlaceholders = [];
    let placeholderIndex = 0;
    
    // Extract and protect code blocks (handle both with and without newline after language)
    // Match code blocks more carefully - handle cases where language identifier might be malformed
    formatted = formatted.replace(/```[\w]*[\s\S]*?```/g, (match) => {
      // Fix common malformed patterns before storing
      let fixedMatch = match;
      
      // Fix: ```java followed immediately by text (no newline) - like ```javae or ```javaVehicle
      fixedMatch = fixedMatch.replace(/```(\w+)([A-Za-z])/g, "```$1\n$2");
      
      // Fix: Remove language identifier text that appears in code (like JAVAVEHIC)
      // Pattern: ```java\nJAVAVEHIC\n1\ne vehicle...
      fixedMatch = fixedMatch.replace(/```(\w+)\n([A-Z]{3,})\s*\n?(\d+\.?\s*\n?)?/g, "```$1\n");
      
      // Fix: Remove line numbers at start
      fixedMatch = fixedMatch.replace(/```(\w+)\n(\d+\.?\s*\n?)/g, "```$1\n");
      
      const placeholder = `__CODE_BLOCK_${placeholderIndex}__`;
      codeBlockPlaceholders.push(fixedMatch);
      placeholderIndex++;
      return placeholder;
    });
    
    // Ensure questions are properly separated - detect question patterns and add paragraph breaks
    // Pattern: text ending with ? followed by more text should have a break
    formatted = formatted
      // Add paragraph break after questions (ending with ?) if followed by text (not code block)
      .replace(/([^.\n])\?([^\n])(?!__CODE_BLOCK)/g, "$1?\n\n$2")
      // Add paragraph break before questions that start with common question words
      .replace(/([^.\n])(\b(Can you|What|How|Why|When|Where|Which|Who|Do you|Are you|Is there|Would you|Could you|Tell me|Explain|Describe)\b[^\n]*\?)/gi, "$1\n\n$2")
      // Ensure questions after periods have proper spacing
      .replace(/(\.)(\s*)(\b(Can you|What|How|Why|When|Where|Which|Who|Do you|Are you|Is there|Would you|Could you|Tell me|Explain|Describe)\b[^\n]*\?)/gi, "$1\n\n$3")
      // Add break after sentences ending with period if followed by a question
      .replace(/([.!])(\s+)(\b(Can you|What|How|Why|When|Where|Which|Who|Do you|Are you|Is there|Would you|Could you|Tell me|Explain|Describe)\b[^\n]*\?)/gi, "$1\n\n$3")
      // Fix code blocks that appear right after text (no newline before ```)
      .replace(/([^\n])(__CODE_BLOCK_\d+__)/g, "$1\n\n$2")
      // Fix code blocks that appear right after colon or period
      .replace(/([:.])(__CODE_BLOCK_\d+__)/g, "$1\n\n$2")
      // Ensure code blocks have proper spacing after closing
      .replace(/(__CODE_BLOCK_\d+__)([^\n])/g, "$1\n\n$2")
      // Ensure follow-up questions are highlighted with proper markdown
      .replace(/(\*\*Follow-up Question:\*\*)/gi, "\n\n**Follow-up Question:**\n\n")
      .replace(/(Follow-up Question:)/gi, "\n\n**Follow-up Question:**\n\n")
      // Ensure proper paragraph spacing (but not inside code blocks)
      .replace(/\n{3,}/g, "\n\n")
      // Format summary sections
      .replace(/\n?-{3,}\s*Interview Summary\s*-{0,}\n?/i, "\n\n--- Interview Summary ---\n\n")
      .replace(/\bSummary of Interview:?/i, "\n\n--- Interview Summary ---\n\n")
      // Format section headers
      .replace(/\bScore\s*:/i, "\n\n**Score:** ")
      .replace(/\bStrengths\s*:/i, "\n\n**Strengths:** ")
      .replace(/\bWeak Areas\s*:/i, "\n\n**Weak Areas:** ")
      .replace(/\bLevel\s*:/i, "\n\n**Level:** ")
      .replace(/\bSuggestions\s*:/i, "\n\n**Suggestions:** ")
      .replace(/\bEncouraging Remark\s*:/i, "\n\n**Encouraging Remark:** ")
      // Format next question markers
      .replace(/\n?=+\s*Next Question\s*\((\d+)\)\s*=+\n?/gi, "\n\n--- **Next Question ($1)** ---\n\n")
      .replace(/\bNext Question\s*\((\d+)\)\s*:/gi, "\n\n--- **Next Question ($1)** ---\n\n")
      // Normalize bullets
      .replace(/\n-\s+/g, "\n- ")
      .trim();
    
    // Restore code blocks with their original formatting
    codeBlockPlaceholders.forEach((codeBlock, index) => {
      // Fix malformed code blocks where language is concatenated with code
      let fixedCodeBlock = codeBlock;
      
      // Fix: ```java followed by text without newline (e.g., ```javae or ```javaVehicle)
      // This handles cases like ```javae vehicle = ... or ```javaJAVAVEHIC
      fixedCodeBlock = fixedCodeBlock.replace(/```(\w+)([A-Za-z])/g, "```$1\n$2");
      
      // Fix: ```java followed by any non-whitespace character (should have newline)
      fixedCodeBlock = fixedCodeBlock.replace(/(```[\w]+)([^\n\s])/g, "$1\n$2");
      
      // Fix: Remove language identifier text that leaked into code content
      // This handles cases where backend sends: ```java\njavae vehicle = ...
      fixedCodeBlock = fixedCodeBlock.replace(/```(\w+)\n\1([a-z])/gi, "```$1\n$2");
      
      // Fix: Remove uppercase language identifiers at start of code (like JAVAVEHIC, JAVA, etc.)
      // Match patterns like: ```java\nJAVAVEHIC\n1\ne vehicle = ...
      fixedCodeBlock = fixedCodeBlock.replace(/```(\w+)\n([A-Z]{2,})\s*\n?(\d+\.?\s*\n?)?/g, "```$1\n");
      
      // Fix: Remove line numbers at start of code (standalone or after language identifier)
      fixedCodeBlock = fixedCodeBlock.replace(/```(\w+)\n(\d+\.?\s*\n?)/g, "```$1\n");
      
      // Fix: Remove any remaining uppercase words at the very start (like JAVAVEHIC)
      fixedCodeBlock = fixedCodeBlock.replace(/```(\w+)\n([A-Z]{3,})\s*/g, "```$1\n");
      
      // Ensure proper spacing before closing backticks
      fixedCodeBlock = fixedCodeBlock.replace(/([^\n])(```\s*$)/gm, "$1\n$2");
      
      formatted = formatted.replace(`__CODE_BLOCK_${index}__`, fixedCodeBlock);
    });
    
    return formatted;
  };

  return (
    <div className="chat-page container-fluid">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-11 col-lg-12">
          <div className="card chat-card shadow-sm rounded-4">
            <div className="chat-header border-bottom px-4 py-3">
              <div className="chat-header-top d-flex justify-content-between align-items-center">
                <div className="chat-header-title-section d-flex align-items-center">
                  <h5 className="fw-bold text-primary mb-0 d-flex align-items-center">
                    <Logo size="small" showText={false} className="me-2" />
                    JavaSherpa Interview Session
                  </h5>
                </div>
                <div className="chat-header-buttons d-flex gap-2">
                  <Button
                    variant="outline-warning"
                    className="rounded-pill px-3"
                    onClick={clearChat}
                    title="Clear chat and restart interview"
                  >
                    <FaRedo className="me-2" /> Restart Interview
                  </Button>
                  <Button
                    variant="outline-info"
                    className="rounded-pill px-3"
                    onClick={downloadPdf}
                    disabled={messages.length === 0}
                    title="Download interview transcript as PDF"
                  >
                    <FaDownload className="me-2" /> Download Transcript
                  </Button>
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-3"
                    onClick={downloadDetailedReport}
                    disabled={messages.length === 0}
                    title="Download detailed report with per-question scoring and analysis"
                  >
                    <FaDownload className="me-2" /> Download Detailed Report
                  </Button>
                  <Button
                    variant={ttsEnabled ? "outline-success" : "outline-secondary"}
                    className="rounded-pill px-3"
                    onClick={() => setTtsEnabled((v) => !v)}
                    title={ttsEnabled ? "Disable voice replies" : "Enable voice replies"}
                  >
                    {ttsEnabled ? (
                      <>
                        <FaVolumeUp className="me-2" /> Voice On
                      </>
                    ) : (
                      <>
                        <FaVolumeMute className="me-2" /> Voice Off
                      </>
                    )}
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
            </div>

            <div className="chat-body px-3 py-4" ref={chatBodyRef}>
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
                      <div className="ai-response-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre: ({ children, ...props }) => {
                              const codeProps = children?.props || {};
                              const match = /language-(\w+)/.exec(codeProps.className || "");
                              
                              // Extract code string - handle both string and array children
                              let codeString = "";
                              if (typeof codeProps.children === 'string') {
                                codeString = codeProps.children;
                              } else if (Array.isArray(codeProps.children)) {
                                codeString = codeProps.children.map(c => {
                                  if (typeof c === 'string') return c;
                                  if (c?.props?.children) return String(c.props.children);
                                  return String(c || '');
                                }).join('');
                              } else if (codeProps.children?.props?.children) {
                                codeString = String(codeProps.children.props.children);
                              } else {
                                codeString = String(codeProps.children || "");
                              }
                              
                              // Remove trailing newline
                              codeString = codeString.replace(/\n$/, "");
                              
                              // Clean up: Remove any language identifier text that might have leaked into code
                              if (codeString) {
                                // Remove language identifiers at the start (case insensitive) - more aggressive
                                codeString = codeString.replace(/^(java|javascript|js|python|py|html|css|json|xml|sql|bash|sh|yaml|yml|md|markdown|text|plain)\s*/i, '');
                                
                                // Remove any uppercase language identifiers (like "JAVAVEHIC", "JAVA", etc.)
                                // Match patterns like "JAVAVEHIC", "JAVA", "JAVACODE", etc.
                                codeString = codeString.replace(/^[A-Z]{2,}[A-Z]*\s*/g, '');
                                
                                // Remove line numbers at the start (like "1", "1.", etc.)
                                codeString = codeString.replace(/^\d+\.?\s*\n?/g, '');
                                
                                // Remove any remaining uppercase words at the very start that look like language identifiers
                                codeString = codeString.replace(/^([A-Z]{3,})\s*\n?/g, '');
                                
                                // If code is Java and appears to be on a single line, format it
                                if (match && match[1].toLowerCase() === 'java' && codeString) {
                                  // Check if code has very few line breaks (likely single-line)
                                  const lines = codeString.split('\n').filter(l => l.trim().length > 0);
                                  const isSingleLine = lines.length <= 3 && codeString.length > 30;
                                  
                                  if (isSingleLine) {
                                    // Format Java code by adding line breaks
                                    let formatted = codeString.trim();
                                    
                                    // Fix patterns where text runs into code (like "a//" or "aclass")
                                    formatted = formatted.replace(/([a-zA-Z0-9])(\/\/)/g, '$1\n$2');
                                    formatted = formatted.replace(/([a-zA-Z0-9])(class|interface|enum|public|private|protected|static|final|abstract|@Override)/g, '$1\n$2');
                                    
                                    // Add line breaks after semicolons (but not inside strings)
                                    formatted = formatted.replace(/;(?![^"]*"[^"]*;)/g, ';\n');
                                    
                                    // Add line breaks after opening braces
                                    formatted = formatted.replace(/\{/g, '{\n');
                                    
                                    // Add line breaks before closing braces
                                    formatted = formatted.replace(/\}/g, '\n}');
                                    
                                    // Add line breaks after class/interface/enum declarations
                                    formatted = formatted.replace(/(class|interface|enum)\s+(\w+)([^{]*)\{/g, '$1 $2$3 {\n');
                                    
                                    // Add line breaks after method declarations
                                    formatted = formatted.replace(/(\))\s*\{/g, '$1 {\n');
                                    
                                    // Add line breaks after @Override
                                    formatted = formatted.replace(/(@Override)\s*/g, '$1\n');
                                    
                                    // Add line breaks before comments
                                    formatted = formatted.replace(/([^\/\n])\/\//g, '$1\n//');
                                    
                                    // Clean up multiple consecutive newlines
                                    formatted = formatted.replace(/\n{3,}/g, '\n\n');
                                    
                                    // Split and add indentation
                                    const formattedLines = formatted.split('\n');
                                    let indentLevel = 0;
                                    const indentSize = 4;
                                    
                                    codeString = formattedLines.map(line => {
                                      const trimmed = line.trim();
                                      if (!trimmed) return '';
                                      
                                      // Decrease indent before closing braces
                                      if (trimmed.startsWith('}')) {
                                        indentLevel = Math.max(0, indentLevel - 1);
                                      }
                                      
                                      const indented = ' '.repeat(indentLevel * indentSize) + trimmed;
                                      
                                      // Increase indent after opening braces
                                      if (trimmed.includes('{') && !trimmed.startsWith('}')) {
                                        indentLevel++;
                                      }
                                      
                                      return indented;
                                    }).filter(l => l.length > 0).join('\n');
                                  }
                                }
                                
                                // Trim whitespace but preserve internal formatting
                                codeString = codeString.trim();
                              }
                              
                              if (match && codeString) {
                                return (
                                  <div className="code-block-wrapper">
                                    <div className="code-block-header">
                                      <span className="code-language">{match[1]}</span>
                                      <button
                                        className="code-copy-btn"
                                        onClick={() => {
                                          copyToClipboard(codeString);
                                        }}
                                        title="Copy code"
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                        Copy code
                                      </button>
                                    </div>
                                    <pre {...props}>
                                      <code>{codeString}</code>
                                    </pre>
                                  </div>
                                );
                              }
                              return <pre {...props}>{children}</pre>;
                            },
                            code: ({ node, inline, className, children, ...props }) => {
                              if (inline) {
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p: ({ children, ...props }) => {
                              // Check if this paragraph contains a follow-up question or any question
                              let text = '';
                              if (typeof children === 'string') {
                                text = children;
                              } else if (Array.isArray(children)) {
                                text = children.map(child => {
                                  if (typeof child === 'string') return child;
                                  if (typeof child === 'object' && child?.props?.children) {
                                    return String(child.props.children);
                                  }
                                  return '';
                                }).join('');
                              }
                              const isFollowUp = /follow-up question/i.test(text);
                              // Detect questions more broadly - ending with ? or starting with question words
                              const hasQuestion = text.trim().endsWith('?') || 
                                /^(Can you|What|How|Why|When|Where|Which|Who|Do you|Are you|Is there|Would you|Could you|Tell me|Explain|Describe)/i.test(text.trim());
                              const shouldHighlight = isFollowUp || (hasQuestion && text.length > 10);
                              const isQuestion = hasQuestion && !isFollowUp;
                              
                              return (
                                <p className={`markdown-paragraph ${shouldHighlight ? 'follow-up-question' : ''} ${isQuestion ? 'question-paragraph' : ''}`} {...props}>
                                  {children}
                                </p>
                              );
                            },
                            strong: ({ children }) => <strong className="markdown-bold">{children}</strong>,
                            h1: ({ children }) => <h1 className="markdown-heading">{children}</h1>,
                            h2: ({ children }) => <h2 className="markdown-heading">{children}</h2>,
                            h3: ({ children }) => <h3 className="markdown-heading">{children}</h3>,
                            ul: ({ children }) => <ul className="markdown-list">{children}</ul>,
                            ol: ({ children }) => <ol className="markdown-list">{children}</ol>,
                            li: ({ children }) => <li className="markdown-list-item">{children}</li>,
                            blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
                            hr: () => <hr className="markdown-hr" />,
                          }}
                        >
                          {formatResponse(msg.Ai_response)}
                        </ReactMarkdown>
                            {/* Check if interview is completed (last message after all questions) and show View Detailed Report button */}
                            {(() => {
                              // Show button only on the last message that contains the final summary with score
                              const isLastMessage = index === messages.length - 1;
                              const hasScore = msg.Ai_response && (
                                /\d+\/\d+/.test(msg.Ai_response) || // Contains pattern like "4/5"
                                /overall score/i.test(msg.Ai_response) || // Contains "overall score"
                                /score.*\d+/i.test(msg.Ai_response) || // Contains "score" followed by number
                                /detailed report/i.test(msg.Ai_response) // Mentions detailed report
                              );
                              const isSummaryMessage = msg.Ai_response && !msg.question && hasScore;
                              return isLastMessage && isSummaryMessage ? (
                            <div className="report-action-button-container">
                              <Button
                                variant="success"
                                className="rounded-pill px-4 py-2"
                                onClick={viewDetailedReport}
                                style={{
                                  background: 'linear-gradient(to right, #22c55e, #16a34a)',
                                  border: 'none',
                                  fontWeight: 600,
                                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                                  transition: 'all 0.3s ease',
                                  color: '#fff'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                                }}
                              >
                                <FaFileAlt className="me-2" /> View Detailed Report
                              </Button>
                            </div>
                          ) : null;
                        })()}
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
                      <FaStop />
                    </Button>
                  ) : (
                    <Button
                      variant="outline-primary"
                      className="rounded-pill px-3"
                      onClick={startListening}
                      title="Start microphone for voice input"
                      type="button"
                    >
                      <FaMicrophone />
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

      {/* Detailed Report Modal */}
      <Modal
        show={showReportModal}
        onHide={handleCloseReportModal}
        size="xl"
        centered
        className="report-modal"
      >
        <Modal.Header className="report-modal-header">
          <Modal.Title className="d-flex align-items-center">
            <FaFileAlt className="me-2" /> Detailed Interview Report
          </Modal.Title>
          <Button
            variant="link"
            onClick={handleCloseReportModal}
            className="close-button"
            style={{ color: '#fff', padding: 0, border: 'none' }}
          >
            <FaTimes size={20} />
          </Button>
        </Modal.Header>
        <Modal.Body className="report-modal-body">
          {reportError ? (
            <div className="alert alert-danger" role="alert">
              <strong>Error:</strong> {reportError}
              <br />
              <small className="text-muted">Please try again or contact support if the issue persists.</small>
            </div>
          ) : reportUrl ? (
            <iframe
              src={reportUrl}
              title="Detailed Interview Report"
              style={{
                width: '100%',
                height: '70vh',
                border: 'none',
                borderRadius: '0.5rem',
                background: '#fff'
              }}
            />
          ) : (
            <div className="text-center py-5">
              <PulseLoader color="#409fffff" size={8} margin={3} speedMultiplier={0.7} />
              <p className="mt-3">Loading report...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="report-modal-footer">
          <Button
            variant="outline-secondary"
            onClick={handleCloseReportModal}
            className="rounded-pill px-4"
          >
            Close
          </Button>
          <Button
            variant="outline-primary"
            onClick={handleShareReport}
            className="rounded-pill px-4"
          >
            <FaShare className="me-2" /> Share
          </Button>
          <Button
            variant="success"
            onClick={handleDownloadFromModal}
            className="rounded-pill px-4"
            style={{
              background: 'linear-gradient(to right, #22c55e, #16a34a)',
              border: 'none',
              color: '#fff'
            }}
          >
            <FaDownload className="me-2" /> Download
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ChatPage;

