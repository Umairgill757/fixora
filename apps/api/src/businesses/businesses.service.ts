import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Business, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { UpdateBusinessDto } from './dto/update-business.dto.js';
import { CreateServiceDto } from './dto/create-service.dto.js';

interface RequestUser {
  id: string;
  role: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${base}-${randomBytes(3).toString('hex')}`;
}

/** Parse JSON-array columns back into arrays for API consumers. */
function present(b: Business) {
  return {
    ...b,
    serviceAreas: JSON.parse(b.serviceAreas) as string[],
    categories: JSON.parse(b.categories) as string[],
  };
}

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBusinessDto, user: RequestUser) {
    const business = await this.prisma.business.create({
      data: {
        ownerId: user.id,
        name: dto.name,
        slug: slugify(dto.name),
        description: dto.description,
        city: dto.city,
        serviceAreas: JSON.stringify(dto.serviceAreas ?? []),
        categories: JSON.stringify(dto.categories),
      },
    });
    return present(business);
  }

  async list(filters: { city?: string; category?: string }) {
    const businesses = await this.prisma.business.findMany({
      where: {
        ...(filters.city ? { city: { contains: filters.city } } : {}),
        ...(filters.category ? { categories: { contains: filters.category } } : {}),
      },
      orderBy: [{ verified: 'desc' }, { rating: 'desc' }],
      include: { services: { where: { active: true }, take: 5 } },
    });
    return businesses.map(present);
  }

  async findBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        services: { where: { active: true } },
        technicians: {
          where: { verificationStatus: 'VERIFIED' },
          select: { id: true, rating: true, completedJobs: true, skills: true },
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found.');
    return {
      ...present(business),
      technicians: business.technicians.map((t) => ({
        ...t,
        skills: JSON.parse(t.skills) as string[],
      })),
    };
  }

  async update(id: string, dto: UpdateBusinessDto, user: RequestUser) {
    const business = await this.mustOwn(id, user);
    const { verified, serviceAreas, categories, ...rest } = dto;
    // Only admins can flip the verified badge.
    const data: Prisma.BusinessUpdateInput = { ...rest };
    if (serviceAreas) data.serviceAreas = JSON.stringify(serviceAreas);
    if (categories) data.categories = JSON.stringify(categories);
    if (user.role === 'ADMIN' && typeof verified === 'boolean') data.verified = verified;
    return present(await this.prisma.business.update({ where: { id }, data }));
  }

  async remove(id: string, user: RequestUser) {
    await this.mustOwn(id, user);
    await this.prisma.business.delete({ where: { id } });
    return { deleted: true };
  }

  // ---- services (rate cards) ----

  async listServices(businessId: string) {
    await this.exists(businessId);
    return this.prisma.service.findMany({ where: { businessId, active: true } });
  }

  async addService(businessId: string, dto: CreateServiceDto, user: RequestUser) {
    await this.mustOwn(businessId, user);
    return this.prisma.service.create({ data: { businessId, ...dto } });
  }

  async removeService(businessId: string, serviceId: string, user: RequestUser) {
    await this.mustOwn(businessId, user);
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, businessId } });
    if (!service) throw new NotFoundException('Service not found.');
    await this.prisma.service.update({ where: { id: serviceId }, data: { active: false } });
    return { deleted: true };
  }

  // ---- helpers ----

  private async exists(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found.');
    return business;
  }

  /** Throws unless the user owns the business or is an admin. */
  private async mustOwn(id: string, user: RequestUser) {
    const business = await this.exists(id);
    if (user.role !== 'ADMIN' && business.ownerId !== user.id) {
      throw new ForbiddenException('You do not own this business.');
    }
    return business;
  }
}
