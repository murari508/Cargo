import type {
  AdminStats, AssistantReply, Availability, Booking, Car, FilterOptions,
  FleetTrackingResponse, PriceQuote, TripPlan, User,
} from '../types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const TOKEN_KEY = 'cargo.token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  detail: unknown
  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = body?.error
    if (res.status === 401) tokenStore.clear()
    throw new ApiError(res.status, err?.message ?? 'Something went wrong', err?.detail)
  }
  return body as T
}

const qs = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) sp.append(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

const get = <T,>(p: string) => request<T>(p)
const post = <T,>(p: string, body?: unknown) =>
  request<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) })
const put = <T,>(p: string, body?: unknown) =>
  request<T>(p, { method: 'PUT', body: JSON.stringify(body ?? {}) })
const del = <T,>(p: string) => request<T>(p, { method: 'DELETE' })

interface AuthPayload { access_token: string; expires_in: number; user: User }
interface Paged<T> { items: T[]; total: number; page?: number; page_size?: number }

export interface UserDashboard {
  total_bookings: number
  upcoming_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  total_spend: number
  saved_cars: number
  next_trip: {
    booking_reference: string; car: string; pickup_date: string; pickup_location: string
  } | null
}

export const api = {
  auth: {
    register: (b: Record<string, unknown>) => post<AuthPayload>('/api/auth/register', b),
    login: (email: string, password: string) =>
      post<AuthPayload>('/api/auth/login', { email, password }),
    me: () => get<User>('/api/auth/me'),
    forgotPassword: (email: string) =>
      post<{ message: string; reset_token?: string }>('/api/auth/forgot-password', { email }),
    resetPassword: (token: string, new_password: string) =>
      post<{ message: string }>('/api/auth/reset-password', { token, new_password }),
  },
  cars: {
    list: (params: Record<string, unknown>) => get<Paged<Car>>(`/api/cars${qs(params)}`),
    filters: () => get<FilterOptions>('/api/cars/filters'),
    one: (id: number, params: Record<string, unknown> = {}) =>
      get<Car>(`/api/cars/${id}${qs(params)}`),
    availability: (id: number, pickup_date: string, return_date: string) =>
      get<Availability>(`/api/cars/${id}/availability${qs({ pickup_date, return_date })}`),
    create: (b: unknown) => post<Car>('/api/cars', b),
    update: (id: number, b: unknown) => put<Car>(`/api/cars/${id}`, b),
    remove: (id: number) => del<{ message: string }>(`/api/cars/${id}`),
  },
  bookings: {
    quote: (car_id: number, pickup_date: string, return_date: string) =>
      post<PriceQuote>('/api/bookings/quote', { car_id, pickup_date, return_date }),
    create: (b: unknown) => post<Booking>('/api/bookings', b),
    mine: (booking_status?: string) =>
      get<Paged<Booking>>(`/api/bookings${qs({ booking_status })}`),
    one: (id: number) => get<Booking>(`/api/bookings/${id}`),
    cancel: (id: number) => put<Booking>(`/api/bookings/${id}/cancel`),
  },
  payments: {
    methods: () => get<{ provider: string; methods: { id: string; label: string }[]; note: string }>(
      '/api/payments/methods'),
    create: (booking_id: number, method: string) =>
      post<{ order_id: string; checkout_token: string; amount: number; provider: string;
             booking_reference: string }>('/api/payments/create', { booking_id, method }),
    mockCheckout: (order_id: string, checkout_token: string) =>
      post<{ status: string; signature: string }>(
        `/api/payments/mock/checkout${qs({ order_id, checkout_token })}`),
    verify: (b: { order_id: string; checkout_token: string; signature: string }) =>
      post<{ success: boolean; message: string; booking_reference: string }>(
        '/api/payments/verify', b),
  },
  users: {
    me: () => get<User>('/api/users/me'),
    update: (b: unknown) => put<User>('/api/users/me', b),
    dashboard: () => get<UserDashboard>('/api/users/me/dashboard'),
    savedCars: () => get<Car[]>('/api/users/me/saved-cars'),
    saveCar: (id: number) => post<{ saved: boolean }>(`/api/users/me/saved-cars/${id}`),
    unsaveCar: (id: number) => del<{ saved: boolean }>(`/api/users/me/saved-cars/${id}`),
  },
  admin: {
    dashboard: () => get<AdminStats>('/api/admin/dashboard'),
    cars: () => get<Car[]>('/api/admin/cars'),
    bookings: (params: Record<string, unknown> = {}) =>
      get<Paged<Booking>>(`/api/admin/bookings${qs(params)}`),
    setBookingStatus: (id: number, booking_status: string) =>
      put<Booking>(`/api/admin/bookings/${id}/status`, { booking_status }),
    users: () => get<(User & { bookings: number })[]>('/api/admin/users'),
    setRole: (id: number, role: string) => put<User>(`/api/admin/users/${id}/role${qs({ role })}`),
    tracking: () => get<FleetTrackingResponse>('/api/admin/tracking'),
    updateLocation: (id: number, data: Record<string, unknown>) =>
      put<{ status: string; current_location: string }>(`/api/admin/tracking/${id}/location`, data),
  },
  ai: {
    ask: (b: { message: string; language: string; input_type?: string;
               context?: Record<string, unknown> }) =>
      post<AssistantReply>('/api/ai/car-assistant', b),
    voice: (b: { message: string; language: string; context?: Record<string, unknown> }) =>
      post<AssistantReply>('/api/voice/process', b),
    planTrip: (b: { origin: string; destination: string; duration: number; language: string
                    passengers?: number }) => post<TripPlan>('/api/ai/trip-planner', b),
    saveTrip: (b: { origin: string; destination: string; duration: number; language: string }) =>
      post<TripPlan>('/api/ai/trip-plans', b),
    savedTrips: () => get<TripPlan[]>('/api/ai/trip-plans'),
    languages: () => get<{ code: string; label: string; native_label: string
                           speech_code: string }[]>('/api/voice/languages'),
  },
}

export const rupees = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN')
