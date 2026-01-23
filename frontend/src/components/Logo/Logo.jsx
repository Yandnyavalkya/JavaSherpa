import React from 'react';
import './Logo.scss';

const Logo = ({ className = '', size = 'medium', showText = true }) => {
  const logoUrl = 'https://res.cloudinary.com/dty4b2yj1/image/upload/v1769151495/ChatGPT_Image_Jan_23__2026__12_08_59_PM-removebg-preview_jfvx27.png';
  
  const sizeClasses = {
    small: 'logo-small',
    medium: 'logo-medium',
    large: 'logo-large'
  };

  return (
    <div className={`logo-container ${className} ${sizeClasses[size]}`}>
      <img 
        src={logoUrl} 
        alt="JavaSherpa Logo" 
        className="logo-image"
        loading="lazy"
      />
      {showText && (
        <span className="logo-text">JavaSherpa</span>
      )}
    </div>
  );
};

export default Logo;
