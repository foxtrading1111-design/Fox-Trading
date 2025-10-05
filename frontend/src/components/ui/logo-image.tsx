import React from 'react';

interface LogoImageProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  onClick?: () => void;
}

const LogoImage: React.FC<LogoImageProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  onClick
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div 
      className={`flex items-center justify-center ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Fox Logo Image */}
      <div className={`${sizeClasses[size]} ${showText ? 'flex-shrink-0' : 'w-full'} flex items-center justify-center p-2`}>
        <img
          src="/logo.png"
          alt="Fox Trading Logo"
          className="w-full h-full object-contain max-w-none"
          style={{ aspectRatio: 'auto' }}
          onError={(e) => {
            // Fallback to text if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        {/* Fallback text */}
        <div className="hidden w-full h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-black font-bold text-xs">
          FT
        </div>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <span className={`font-bold ${textSizeClasses[size]} text-yellow-500 select-none`}>
          FOX TRADING
        </span>
      )}
    </div>
  );
};

export default LogoImage;