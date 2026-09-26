import React from 'react'

interface BookingIconProps {
  className?: string
  variant?: 'black' | 'white' | 'auto'
}

export default function BookingIcon({ className = 'w-4 h-4 inline-block', variant = 'auto' }: BookingIconProps) {
  const src = variant === 'black' ? '/booking-icon.png' : '/booking-icon-white.png'
  return (
    <img
      src={src}
      alt="Bookings"
      className={`inline-block object-contain ${className}`}
      loading="lazy"
    />
  )
}
