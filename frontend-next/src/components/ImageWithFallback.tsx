"use client";
import React, { useState } from 'react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function ImageWithFallback({ fallbackSrc, ...props }: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const { src, alt, className = '', ...rest } = props;

  return didError ? (
    <div className={`inline-block bg-gray-100 text-center align-middle w-full h-full ${className}`}>
      <div className="flex items-center justify-center w-full h-full">
        <img src={fallbackSrc || ERROR_IMG_SRC} alt="Error loading image" className="object-cover w-16 h-16" {...rest} />
      </div>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      {...rest}
      onError={handleError}
      loading="lazy"
    />
  );
}
