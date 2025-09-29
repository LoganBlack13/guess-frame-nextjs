'use client';

import { useEffect, useState } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
  show?: boolean;
}

export default function Notification({
  type,
  message,
  duration = 5000,
  onClose,
  show = true,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setIsVisible(true);

      if (duration > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300); // Wait for animation
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [show, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  if (!isVisible) return null;

  const typeClasses = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`alert ${typeClasses[type]} fixed top-4 right-4 z-50 max-w-sm shadow-lg transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <span className="text-lg">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={handleClose}
        className="btn btn-ghost btn-xs"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
