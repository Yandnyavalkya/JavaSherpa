import { useEffect } from 'react';
import './StarBackground.scss';

export default function StarBackground() {
  useEffect(() => {
    const starsContainer = document.querySelector('.stars-background');
    if (!starsContainer) return;

    starsContainer.innerHTML = '';
    const numberOfStars = 200;

    for (let i = 0; i < numberOfStars; i += 1) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty('--twinkle-duration', `${Math.random() * 3 + 2}s`);
      starsContainer.appendChild(star);
    }
  }, []);

  return <div className="stars-background" />;
}
