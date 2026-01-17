import AxiosClient from "./Axios.service.js";
import qs from "qs";
import { setVariable } from "../utils/localStorage.js";
import { apiBaseUrl } from '../constants/constant.js';  
import { getVariable } from '../utils/localStorage.js';

const ApiService = {
  login: async (payload) => {
    const { data, loading, error } = await AxiosClient({
      method: "POST",
      url: `user/login`,
      data: payload,
    });
    if (data ) {
      setVariable("km_user_token", data.result.token);
    }
    return { data, error, loading };
  },

  getUserSettings: async () => {
    const { data, loading, error } = await AxiosClient({
      method: 'GET',
      url: `user/settings`
    });
    return { data, error, loading };
  },

  updateUserSettings: async ({ theme, voice }) => {
    const { data, loading, error } = await AxiosClient({
      method: 'POST',
      url: `user/settings`,
      data: { theme, voice }
    });
    return { data, error, loading };
  },

   register: async (payload) => {
    const { data, loading, error } = await AxiosClient({
      method: "POST",
      url: `user/register`,
      data: payload,
    });
    
    return { data, error, loading };
  },

   getAllChatBots: async () => {
    const { data, loading, error } = await AxiosClient({
      method: "GET",
      url: `chat-bot/all`,
    });
    
    return { data, error, loading };
  },

   createChatBot: async (payload) => {
    const { data, loading, error } = await AxiosClient({
      method: "POST",
      url: `chat-bot/`,
      data:payload
    });
    
    return { data, error, loading };
  },

  saveHistory: async (namespace_id, messages) => {
    const { data, loading, error } = await AxiosClient({
      method: "POST",
      url: `chat-bot/history`,
      data: { namespace_id, messages }
    });
    return { data, error, loading };
  },

  getHistory: async (namespace_id) => {
    const { data, loading, error } = await AxiosClient({
      method: "GET",
      url: `chat-bot/history?namespace_id=${encodeURIComponent(namespace_id)}`,
    });
    return { data, error, loading };
  },

  saveHistoryPdf: async (namespace_id, messages) => {
    // Ensure messages are in the correct format for backend
    const formattedMessages = messages.map(msg => ({
      question: msg.question || "",
      Ai_response: msg.Ai_response || ""
    }));
    
    const { data, loading, error } = await AxiosClient({
      method: "POST",
      url: `chat-bot/history/pdf`,
      data: { namespace_id, messages: formattedMessages },
      responseType: 'blob' // Important: tell axios to expect binary data
    });
    return { data, error, loading };
  },

  generateDetailedReport: async (namespace_id, messages) => {
    try {
      // Ensure messages are in the correct format for backend
      const formattedMessages = messages.map(msg => ({
        question: String(msg.question || ""),
        Ai_response: String(msg.Ai_response || "")
      }));
      
      console.log('Sending detailed report request:', {
        namespace_id,
        messagesCount: formattedMessages.length,
        sample: formattedMessages[0]
      });
      
      const { data, loading, error } = await AxiosClient({
        method: "POST",
        url: `chat-bot/report/detailed`,
        data: { namespace_id, messages: formattedMessages },
        responseType: 'blob' // Important: tell axios to expect binary data
      });
      
      // If there's an error, check if the blob is actually an error JSON
      if (error || (data instanceof Blob && data.type === 'application/json')) {
        // Try to parse error from blob
        if (data instanceof Blob && data.type === 'application/json') {
          const text = await data.text();
          try {
            const errorData = JSON.parse(text);
            return { data: null, error: { response: { data: errorData }, message: errorData.message || 'Failed to generate report' }, loading };
          } catch (e) {
            // Not JSON, return original error
          }
        }
        return { data, error, loading };
      }
      
      // Check if blob is actually a PDF
      if (data instanceof Blob && data.type !== 'application/pdf' && data.size < 1000) {
        // Small blob might be an error, try to parse it
        const text = await data.text();
        try {
          const errorData = JSON.parse(text);
          return { data: null, error: { response: { data: errorData }, message: errorData.message || 'Failed to generate report' }, loading };
        } catch (e) {
          // Not JSON, might be a small PDF, return as is
        }
      }
      
      return { data, error, loading };
    } catch (err) {
      return { data: null, error: err, loading: false };
    }
  },

  //  startConversation: async (payload) => {
  //   const { data, loading, error } = await AxiosClient({
  //     method: "POST",
  //     url: `chat-bot/chat`,
  //     data:payload
  //   });
    
  //   return { data, error, loading };
  // },

   getAllFiles: async (chatBotId) => {
    const { data, loading, error } = await AxiosClient({
      method: "GET",
      url: `files?chatBotId=${chatBotId}`
    });
    
    return { data, error, loading };
  },

  uploadFile: async (payload) => {
    const { data, loading, error } = await AxiosClient({
      method: "POST",
      url: `files/fileUpload`,
      data:payload,
      contentType:'multipart/form-data'
    });
    
    return { data, error, loading };
  },
  deleteFile: async (payload) => {
    const { data, loading, error } = await AxiosClient({
      method: "DELETE",
      url: `files/file`,
      data:payload
    });
    
    return { data, error, loading };
  },

  resetInterview: async (namespace_id) => {
    const { data, loading, error } = await AxiosClient({
      method: 'POST',
      url: `chat-bot/reset`,
      data: { namespace_id }
    });
    return { data, error, loading };
  },

  deleteBot: async (id) => {
    const { data, loading, error } = await AxiosClient({
      method: 'DELETE',
      url: `chat-bot/${id}`
    });
    return { data, error, loading };
  },
  
};

/**
 * Streams conversation response and calls onChunk for each parsed chunk.
 * onChunk receives either a string or parsed object depending on server.
 */
export const startConversation = async (payload, onChunk) => {
  const token = getVariable('km_user_token');

  const response = await fetch(`${apiBaseUrl}chat-bot/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      buffer += chunkStr;
 
      const parts = buffer.split('\n');
      buffer = parts.pop();

      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;

 
        const jsonString = line.startsWith('data:') ? line.replace(/^data:\s*/, '') : line;

     
        try {
          const parsed = JSON.parse(jsonString);
          onChunk(parsed);
        } catch (err) {
          
          onChunk(jsonString);
        }
      }
    }

 
    if (buffer && buffer.trim()) {
      const remaining = buffer.trim();
      try {
        onChunk(JSON.parse(remaining));
      } catch {
        onChunk(remaining);
      }
    }
  } finally {
    try { reader.releaseLock(); } catch (e) {}
  }
};

export default ApiService;
