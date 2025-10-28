// src/components/common/UserAvatar.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const UserAvatar = ({
  photoURL,
  displayName,
  size = "md",
  className = "",
  fallbackColor = "blue"
}) => {
  const { t } = useTranslation();

  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);

  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl"
  };

  const colorClasses = {
    blue: "bg-blue-600",
    purple: "bg-purple-500",
    green: "bg-green-500",
    red: "bg-red-500",
    gray: "bg-gray-500"
  };

  useEffect(() => {
    setImgError(false);

    if (!photoURL) {
      setImgSrc(null);
      return;
    }

    let processedUrl = photoURL;

    if (photoURL.includes('googleusercontent.com')) {
      processedUrl = photoURL.split('=')[0];

      const sizeMap = { xs: 48, sm: 96, md: 128, lg: 192, xl: 256 };
      const pixelSize = sizeMap[size] || 96;

      processedUrl = `${processedUrl}=s${pixelSize}-c`;
    }

    if (!processedUrl.includes('?')) {
      processedUrl = `${processedUrl}?t=${Date.now()}`;
    }

    setImgSrc(processedUrl);
  }, [photoURL, size]);

  /**
   * Handles the image loading error event.
   * Logs a warning and sets the component state to show the fallback avatar.
   * @param {React.SyntheticEvent<HTMLImageElement, Event>} e - The error event object.
   */
  const handleError = (e) => {
    setImgError(true);
  };

  /**
   * Handles the successful image loading event.
   * Logs a success message in development environments.
   */
  const handleLoad = () => {
    if (process.env.NODE_ENV === 'development') {
      return ('Avatar loaded:', displayName, imgSrc);
    }
  };

  /**
   * Generates initials from a display name.
   * It returns the first letter of the first two words, or just the first letter if only one word.
   * @param {string | undefined} name - The user's display name.
   * @returns {string} The calculated initials in uppercase.
   */
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const showFallback = !imgSrc || imgError;
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const colorClass = colorClasses[fallbackColor] || colorClasses.blue;

  const defaultTitle = t('common.avatar.defaultTitle', 'Usuario');
  const defaultAlt = t('common.avatar.defaultAlt', 'Avatar');

  if (showFallback) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white ${colorClass} ${className}`}
        title={displayName || defaultTitle}
      >
        {getInitials(displayName)}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={displayName || defaultAlt}
      className={`${sizeClass} rounded-full object-cover ${className}`}
      loading="lazy"
      onError={handleError}
      onLoad={handleLoad}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      title={displayName || defaultTitle}
    />
  );
};

export default UserAvatar;