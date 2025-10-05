import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Fox Logo SVG - Replace this with your actual logo */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Fox silhouette - this is a placeholder, you'll replace with your actual logo */}
          <path
            d="M20 80 C20 60, 25 45, 35 35 C40 30, 45 28, 50 30 C55 28, 60 30, 65 35 C75 45, 80 60, 80 80 C75 75, 65 70, 50 72 C35 70, 25 75, 20 80 Z"
            fill="currentColor"
            className="text-yellow-500"
          />
          <path
            d="M35 35 C40 25, 45 20, 50 22 C55 20, 60 25, 65 35 C60 30, 55 28, 50 30 C45 28, 40 30, 35 35 Z"
            fill="currentColor"
            className="text-yellow-600"
          />
          {/* Fox ears */}
          <path
            d="M35 35 L25 15 L40 25 Z"
            fill="currentColor"
            className="text-yellow-500"
          />
          <path
            d="M65 35 L75 15 L60 25 Z"
            fill="currentColor"
            className="text-yellow-500"
          />
          {/* Fox tail */}
          <path
            d="M50 72 C60 75, 70 78, 85 70 C80 85, 65 88, 50 82"
            fill="currentColor"
            className="text-yellow-500"
          />
        </svg>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <span className={`font-bold ${textSizeClasses[size]} text-yellow-500`}>
          FOX TRADING
        </span>
      )}
    </div>
  );
};

export default Logo;