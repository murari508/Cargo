import React from 'react'

interface LocationIconProps {
  className?: string
  variant?: 'black' | 'white' | 'auto'
}

export default function LocationIcon({ className = 'w-4 h-4 inline-block', variant = 'auto' }: LocationIconProps) {
  const src = variant === 'black' ? '/location-icon.png' : '/location-icon-white.png'
  return (
    <img
      src={src}
      alt="Location"
      className={`inline-block object-contain ${className}`}
      loading="lazy"
    />
  )
}
