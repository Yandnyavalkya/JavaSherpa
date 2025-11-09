import React from "react";
import "./FeaturesSection.scss";

const FeaturesSection = () => {
  const features = [
    {
      icon: "🎤",
      title: "Voice-Powered Interviews",
      description: "Practice Java interviews using voice commands for real-time interview simulation.",
    },
    {
      icon: "🤖",
      title: "AI Interview Agent",
      description: "Get personalized feedback and guidance tailored to your Java interview preparation.",
    },
    {
      icon: "📚",
      title: "Comprehensive Preparation",
      description: "Access Java interview questions, examples, and best practices to ace your interviews.",
    },
  ];

  return (
    <div className="features-section">
      <h1 className="features-title">JavaSherpa</h1>
      <p className="features-subtitle">
        Your AI-Powered Java Interview Agent
      </p>
      <div className="features-list">
        {features.map((feature, index) => (
          <div key={index} className="feature-item">
            <div className="feature-icon">{feature.icon}</div>
            <div className="feature-content">
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturesSection;

