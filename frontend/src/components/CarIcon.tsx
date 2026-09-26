import React from 'react'

interface CarIconProps {
  className?: string
  variant?: 'black' | 'white' | 'auto'
}

export default function CarIcon({ className = 'w-5 h-5 inline-block', variant = 'auto' }: CarIconProps) {
  const src = variant === 'white' ? '/car-icon-white.png' : '/car-icon.png'
  return (
    <img
      src={src}
      alt="Car Fleet"
      className={`inline-block object-contain ${className}`}
      loading="lazy"
    />
  )
}
