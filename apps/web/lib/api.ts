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

// ---------- Owner dashboard ----------
export async function updateBookingStatus(token: string, id: string, status: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/v1/bookings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Status update failed');
  return res.json();
}

export async function assignTechnician(token: string, bookingId: string, technicianId: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/v1/bookings/${bookingId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ technicianId }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Assign failed');
  return res.json();
}

export async function generateInvoice(token: string, bookingId: string) {
  const res = await fetch(`${API_URL}/v1/bookings/${bookingId}/invoice`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Invoice failed');
  return res.json();
}

export interface TechProfile {
  id: string;
  skills: string;
  serviceAreas: string;
  availability: string;
  verificationStatus: string;
  rating: number;
  completedJobs: number;
  user?: { name: string; email: string };
}

export async function getVerifiedTechnicians(token: string): Promise<TechProfile[]> {
  const res = await fetch(`${API_URL}/v1/technicians?status=VERIFIED`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// ---------- Services management ----------
export async function addService(token: string, businessId: string, input: { name: string; description?: string; basePrice: number; unit: string }) {
  const res = await fetch(`${API_URL}/v1/businesses/${businessId}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Add service failed');
  return res.json();
}

export async function removeService(token: string, businessId: string, serviceId: string) {
  const res = await fetch(`${API_URL}/v1/businesses/${businessId}/services/${serviceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Remove failed');
}

export async function getMyBusinesses(token: string): Promise<Business[]> {
  const res = await fetch(`${API_URL}/v1/businesses/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

// ---------- Technician portal ----------
export async function applyAsTechnician(token: string, input: { skills: string[]; serviceAreas: string[] }) {
  const res = await fetch(`${API_URL}/v1/technicians/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Application failed');
  return res.json();
}

export async function getMyTechProfile(token: string): Promise<TechProfile | null> {
  const res = await fetch(`${API_URL}/v1/technicians/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function getTechJobs(token: string): Promise<Booking[]> {
  const res = await fetch(`${API_URL}/v1/technicians/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function techJobAction(token: string, jobId: string, action: 'accept' | 'decline' | 'complete') {
  const res = await fetch(`${API_URL}/v1/technicians/jobs/${jobId}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Action failed');
  return res.json();
}

export async function getTechEarnings(token: string) {
  const res = await fetch(`${API_URL}/v1/payouts/earnings`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}

// ---------- Reviews & disputes (customer) ----------
export async function submitReview(token: string, bookingId: string, rating: number, comment?: string) {
  const res = await fetch(`${API_URL}/v1/bookings/${bookingId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Review failed');
  return res.json();
}

export async function openDispute(token: string, bookingId: string, reason: string) {
  const res = await fetch(`${API_URL}/v1/bookings/${bookingId}/disputes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Dispute failed');
  return res.json();
}

// ---------- Admin ----------
export async function adminOverview(token: string) {
  const res = await fetch(`${API_URL}/v1/admin/overview`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) throw new Error('Not authorized');
  return res.json();
}

export async function adminList(token: string, path: 'users' | 'bookings' | 'disputes' | 'payouts', query = '') {  const res = await fetch(`${API_URL}/v1/${path === 'disputes' || path === 'payouts' ? path : 'admin/' + path}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function adminVerifyTechnician(token: string, id: string, status: 'VERIFIED' | 'REJECTED') {
  const res = await fetch(`${API_URL}/v1/technicians/${id}/verify`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Verification failed');
  return res.json();
}

export async function adminResolveDispute(token: string, id: string, outcome: 'resolved' | 'refunded') {
  const res = await fetch(`${API_URL}/v1/disputes/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ outcome }),
  });
  if (!res.ok) throw new Error('Resolve failed');
  return res.json();
}

export async function adminCreatePayout(token: string, technicianId: string, amount: number) {
  const res = await fetch(`${API_URL}/v1/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ technicianId, amount }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Payout failed');
  return res.json();
}

export async function adminMarkPayoutPaid(token: string, id: string) {
  const res = await fetch(`${API_URL}/v1/payouts/${id}/paid`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

export async function adminPendingTechnicians(token: string): Promise<TechProfile[]> {
  const res = await fetch(`${API_URL}/v1/technicians?status=PENDING`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}
