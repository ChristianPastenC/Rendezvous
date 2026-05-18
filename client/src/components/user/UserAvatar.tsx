// src/components/common/UserAvatar.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarColor = 'blue' | 'purple' | 'green' | 'red' | 'gray';

interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  size?: AvatarSize;
  className?: string;
  fallbackColor?: AvatarColor;
}

const UserAvatar = ({
  photoURL,
  displayName,
  size = "md",
  className = "",
  fallbackColor = "blue"
}: UserAvatarProps) => {
  const { t } = useTranslation();

  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  const sizeClasses: Record<AvatarSize, string> = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl"
  };

  const colorClasses: Record<AvatarColor, string> = {
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

    if (photoURL.startsWith('blob:')) {
      setImgSrc(photoURL);
      return;
    }

    if (photoURL.includes('googleusercontent.com')) {
      processedUrl = photoURL.split('=')[0];

      const sizeMap = { xs: 48, sm: 96, md: 128, lg: 192, xl: 256 };
      const pixelSize = sizeMap[size] || 96;

      processedUrl = `${processedUrl}=s${pixelSize}-c`;
    }

    if (!processedUrl.includes('?') && !processedUrl.includes('firebasestorage.googleapis.com')) {
      processedUrl = `${processedUrl}?t=${Date.now()}`;
    }

    setImgSrc(processedUrl);
  }, [photoURL, size]);

  const handleError = () => {
    setImgError(true);
  };

  const handleLoad = () => {};

  const getInitials = (name?: string | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const showFallback = !imgSrc || imgError;
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const colorClass = colorClasses[fallbackColor] || colorClasses.blue;

  const defaultTitle = t('common.avatar.defaultTitle', 'User');
  const defaultAlt = t('common.avatar.defaultAlt', 'Avatar');

  const isGoogleUrl = Boolean(imgSrc && imgSrc.includes('googleusercontent.com'));

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
      {...(isGoogleUrl && {
        crossOrigin: "anonymous",
        referrerPolicy: "no-referrer"
      })}
      title={displayName || defaultTitle}
    />
  );
};

export default UserAvatar;