import React from 'react'

interface OverviewIconProps {
  className?: string
  variant?: 'black' | 'white' | 'auto'
}

export default function OverviewIcon({ className = 'w-4 h-4 inline-block', variant = 'auto' }: OverviewIconProps) {
  const src = variant === 'black' ? '/overview-icon.png' : '/overview-icon-white.png'
  return (
    <img
      src={src}
      alt="Overview"
      className={`inline-block object-contain ${className}`}
      loading="lazy"
    />
  )
}
