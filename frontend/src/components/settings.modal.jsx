import React, { useEffect, useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { getVariable, setVariable } from "../utils/localStorage";
import ApiService from "../services/Api.service";
import { useTheme } from "../contexts/ThemeContext";

const SettingsModal = ({ show, onClose }) => {
  const { theme, toggleTheme } = useTheme();
  const [voice, setVoice] = useState("female");
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  useEffect(() => {
    const fetchSettings = async () => {
      // Check if user is authenticated
      const token = getVariable("km_user_token");
      
      if (token) {
        try {
          const { data, error } = await ApiService.getUserSettings();
          if (!error && data?.result) {
            const res = data.result;
            if (res.voice) setVoice(res.voice);
            if (res.theme) setSelectedTheme(res.theme);
            return;
          }
        } catch (error) {
          // Silently fail - will use localStorage
        }
      }
      
      // Fallback to localStorage
      const saved = getVariable("app_settings");
      if (saved && typeof saved === "object") {
        if (saved.voice) setVoice(saved.voice);
        if (saved.theme) setSelectedTheme(saved.theme);
      }
    };
    if (show) fetchSettings();
  }, [show]);

  const handleSave = async () => {
    const payload = { theme: selectedTheme, voice };
    setLoading(true);
    try {
      await ApiService.updateUserSettings(payload);
      setVariable("app_settings", payload);
      toggleTheme(selectedTheme);
    } finally {
      setLoading(false);
      onClose?.();
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Display Theme</Form.Label>
            <Form.Select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Choose your preferred color theme
            </Form.Text>
          </Form.Group>
          <Form.Group>
            <Form.Label>AI Voice</Form.Label>
            <Form.Select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <option value="female">Female</option>
              <option value="female2">Female 2</option>
              <option value="male">Male</option>
              <option value="male2">Male 2</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SettingsModal;
