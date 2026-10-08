const API_URL = process.env.API_URL ?? "http://localhost:3001";

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  unit: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  city: string;
  serviceAreas: string[];
  categories: string[];
  verified: boolean;
  rating: number;
  services?: Service[];
}

export async function getBusinesses(params?: { city?: string; category?: string }): Promise<Business[]> {
  const q = new URLSearchParams();
  if (params?.city) q.set("city", params.city);
  if (params?.category) q.set("category", params.category);
  const res = await fetch(`${API_URL}/v1/businesses?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load businesses");
  return res.json();
}

export interface BusinessDetail extends Business {
  services: Service[];
  technicians: { id: string; rating: number; completedJobs: number; skills: string[] }[];
}

export async function getBusiness(slug: string): Promise<BusinessDetail | null> {
  const res = await fetch(`${API_URL}/v1/businesses/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load business");
  return res.json();
}

export interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  address: string;
  notes?: string | null;
  totalPrice?: number | null;
  business: { id: string; name: string; slug: string; city: string };
  service?: { id: string; name: string; basePrice: number; unit: string } | null;
  payment?: { status: string; amount: number } | null;
}

export interface CreateBookingInput {
  businessId: string;
  serviceId?: string;
  scheduledAt: string;
  address: string;
  notes?: string;
}

export async function createBooking(token: string, input: CreateBookingInput): Promise<Booking> {
  const res = await fetch(`${API_URL}/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Booking failed');
  }
  return res.json();
}

export async function getMyBookings(token: string): Promise<Booking[]> {
  const res = await fetch(`${API_URL}/v1/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load bookings');
  return res.json();
}

export async function cancelBooking(token: string, id: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/v1/bookings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Cancellation failed');
  }
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function register(input: { name: string; email: string; password: string; role: string }) {
  const res = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Registration failed');
  }
  return res.json() as Promise<{ accessToken: string; refreshToken: string; user: AuthUser }>;
}

export async function login(input: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Login failed');
  }
  return res.json() as Promise<{ accessToken: string; refreshToken: string; user: AuthUser }>;
}

export interface PaymentCheckout {
  gatewayUrl: string;
  fields: Record<string, string>;
  txnRefNo: string;
  amount: number;
}

export async function initiatePayment(token: string, bookingId: string): Promise<PaymentCheckout> {
  const res = await fetch(`${API_URL}/v1/payments/bookings/${bookingId}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Payment initiation failed');
  }
  return res.json();
}
