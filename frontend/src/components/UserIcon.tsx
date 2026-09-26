import React from 'react'

interface UserIconProps {
  className?: string
  variant?: 'black' | 'white' | 'auto'
}

export default function UserIcon({ className = 'w-4 h-4 inline-block', variant = 'auto' }: UserIconProps) {
  const src = variant === 'black' ? '/user-icon.png' : '/user-icon-white.png'
  return (
    <img
      src={src}
      alt="User"
      className={`inline-block object-contain ${className}`}
      loading="lazy"
    />
  )
}
