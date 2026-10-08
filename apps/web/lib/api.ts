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
