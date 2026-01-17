import React, { useEffect, useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { getVariable, setVariable } from "../utils/localStorage";
import ApiService from "../services/Api.service";

const SettingsModal = ({ show, onClose }) => {
  const [voice, setVoice] = useState("female");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await ApiService.getUserSettings();
        const res = data?.result || {};
        if (res.voice) setVoice(res.voice);
      } catch (_) {
        const saved = getVariable("app_settings");
        if (saved && typeof saved === "object") {
          if (saved.voice) setVoice(saved.voice);
        }
      }
    };
    if (show) fetchSettings();
  }, [show]);

  const handleSave = async () => {
    // Always use dark theme, only save voice preference
    const payload = { theme: "dark", voice };
    setLoading(true);
    try {
      await ApiService.updateUserSettings(payload);
      setVariable("app_settings", payload);
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
          <Form.Group>
            <Form.Label>AI Voice</Form.Label>
            <Form.Select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
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
