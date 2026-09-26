export type Role = 'customer' | 'admin'
export type LangCode = 'en' | 'te' | 'hi' | 'auto'

export interface User {
  id: number
  full_name: string
  email: string
  phone: string
  role: Role
  preferred_language: LangCode
  voice_response: boolean
  voice_speed: 'slow' | 'normal' | 'fast'
  created_at: string
}

export interface Car {
  id: number
  brand: string
  model: string
  year: number
  category: string
  price_per_day: number
  seats: number
  fuel_type: string
  transmission: string
  mileage: string
  location: string
  image_url: string
  description: string
  feature_list: string[]
  status: 'available' | 'maintenance' | 'retired'
  created_at: string
  is_available: boolean | null
}

export interface PriceQuote {
  car_id: number
  price_per_day: number
  rental_days: number
  base_price: number
  taxes: number
  tax_rate: number
  service_fee: number
  security_deposit: number
  total_amount: number
  payable_now: number
  currency: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed'

export interface Booking {
  id: number
  user_id: number
  car_id: number
  pickup_location: string
  return_location: string
  pickup_date: string
  return_date: string
  pickup_time: string
  return_time: string
  rental_days: number
  base_price: number
  taxes: number
  service_fee: number
  security_deposit: number
  total_amount: number
  payment_status: PaymentStatus
  booking_status: BookingStatus
  booking_reference: string
  created_at: string
  car?: Car
  destination?: string
  current_location?: string
  current_lat?: number
  current_lng?: number
  distance_travelled_km?: number
  trip_route?: string
  speed_kmh?: number
  fuel_or_battery_level?: number
  customer_name?: string
  customer_email?: string
}

export interface FleetTrip {
  booking_id: number
  booking_reference: string
  booking_status: BookingStatus
  payment_status: PaymentStatus
  customer: {
    id: number
    name: string
    email: string
    phone: string
  }
  car: {
    id: number
    brand: string
    model: string
    category: string
    fuel_type: string
    transmission: string
    image_url: string
    location: string
  }
  pickup_location: string
  return_location: string
  destination: string
  current_location: string
  current_lat: number
  current_lng: number
  distance_travelled_km: number
  speed_kmh: number
  fuel_or_battery_level: number
  trip_route: string
  route_stops: string[]
  pickup_date: string
  return_date: string
  pickup_time: string
  return_time: string
  rental_days: number
  created_at: string
}

export interface FleetTrackingResponse {
  trips: FleetTrip[]
  summary: {
    total_trips: number
    active_on_road: number
    total_distance_km: number
    unique_destinations: number
  }
}

export interface Availability {
  car_id: number
  pickup_date: string
  return_date: string
  available: boolean
  reason: string
  conflicting_dates: { pickup_date: string; return_date: string }[]
}

export interface AssistantReply {
  reply: string
  language: 'en' | 'te' | 'hi'
  speech_lang: string
  intent: string
  filters: Record<string, string | number | null>
  cars: Car[]
  missing: string[]
  trip_plan: TripPlan | null
  action: string | null
}

export interface TripPlan {
  id?: number
  origin: string
  destination: string
  duration: number
  language: string
  itinerary: { day: number; title: string; items: string[] }[]
  stops: string[]
  distance_km: number | null
  suggested_cars?: Car[]
  estimated_rental_cost?: number | null
  notes?: string[]
}

export interface AdminStats {
  total_cars: number
  available_cars: number
  cars_on_road: number
  total_users: number
  active_bookings: number
  pending_bookings: number
  confirmed_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  total_bookings: number
  total_revenue: number
  revenue_trend: { date: string; bookings: number; revenue: number }[]
}

export interface FilterOptions {
  locations: string[]
  categories: string[]
  brands: string[]
  fuel_types: string[]
  transmissions: string[]
  seats: number[]
  min_price: number
  max_price: number
}
