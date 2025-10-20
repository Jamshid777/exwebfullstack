import React from 'react';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  // FIX: Add `title` prop to allow passing the native HTML title attribute for tooltips. This resolves errors in App.tsx.
  title?: string;
};

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
  title,
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-light focus:ring-primary',
    secondary: 'bg-secondary text-primary-dark hover:bg-yellow-500 focus:ring-secondary',
    danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger',
    success: 'bg-success text-white hover:bg-green-700 focus:ring-success',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed';

  const classes = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    disabled ? disabledStyles : '',
    className
  ].join(' ');

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled} title={title}>
      {children}
    </button>
  );
};

export default Button;
