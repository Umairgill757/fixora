import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiQuoteDto } from './dto/ai-quote.dto.js';

interface RequestUser {
  id: string;
  role: string;
}

/**
 * AI agents — rule-based today, structured for LLM/queue upgrade tomorrow.
 *
 * Each agent is a pure, testable method. When we add Redis/BullMQ, these
 * become job handlers without changing their logic; when we add an LLM,
 * only the private `estimate*` helpers get swapped for model calls.
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------- Quote agent ----------

  /**
   * Given a problem description, suggest a price range and next slots.
   * Today: keyword-matched against the business's rate card. Tomorrow: LLM.
   */
  async quote(dto: AiQuoteDto, user: RequestUser) {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      include: { services: { where: { active: true } } },
    });
    if (!business) throw new NotFoundException('Business not found.');

    const problem = dto.problem.toLowerCase();
    const words = problem.split(/[^a-z]+/).filter((w) => w.length > 3);

    // Pick the rate-card service with the best keyword overlap; fall back
    // to the explicit serviceId or the cheapest service.
    let service = dto.serviceId
      ? business.services.find((s) => s.id === dto.serviceId) ?? null
      : null;
    if (!service && business.services.length > 0) {
      let best = 0;
      for (const s of business.services) {
        const hay = `${s.name} ${s.description ?? ''}`.toLowerCase();
        const score = words.filter((w) => hay.includes(w)).length;
        if (score > best) {
          best = score;
          service = s;
        }
      }
      service ??= business.services.reduce((a, b) => (a.basePrice <= b.basePrice ? a : b));
    }

    const base = service?.basePrice ?? null;
    // Heuristic band: urgent words push toward the high end.
    const urgent = /urgent|emergency|asap|immediately|leak|no power|spark/.test(problem);
    const estimatedLow = base !== null ? Math.round(base * (urgent ? 1 : 0.9)) : null;
    const estimatedHi = base !== null ? Math.round(base * (urgent ? 1.5 : 1.2)) : null;

    // Next 3 weekday 10:00 slots as suggestions.
    const slots: string[] = [];
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (slots.length < 3) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        const slot = new Date(d);
        slot.setHours(10, 0, 0, 0);
        slots.push(slot.toISOString());
      }
      d.setDate(d.getDate() + 1);
    }

    const quote = await this.prisma.quote.create({
      data: {
        customerId: user.id,
        description: dto.problem,
        estimatedLow,
        estimatedHi,
      },
    });

    this.logger.log(`quote for business ${dto.businessId}: ${estimatedLow}-${estimatedHi}`);
    return {
      quoteId: quote.id,
      service: service ? { id: service.id, name: service.name, basePrice: service.basePrice } : null,
      estimatedLow,
      estimatedHi,
      currency: 'PKR',
      suggestedSlots: slots,
      note: urgent ? 'Sounds urgent — flagged for priority dispatch.' : undefined,
    };
  }

  // ---------- Dispatch agent ----------

  /**
   * Auto-assign the best verified technician to a DISPATCHED booking.
   * Scores: +3 skill match, +2 area match, −1 per active job (workload).
   * Owner/admin only. Tomorrow: this becomes a BullMQ job handler.
   */
  async autoDispatch(bookingId: string, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { business: { select: { ownerId: true, city: true } }, service: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (user.role === 'CUSTOMER') throw new ForbiddenException('Only the business can dispatch.');
    if (user.role === 'BUSINESS_OWNER' && booking.business.ownerId !== user.id) {
      throw new ForbiddenException('Not your business booking.');
    }
    if (booking.status !== BookingStatus.DISPATCHED) {
      throw new BadRequestException(`Booking is ${booking.status}; only DISPATCHED bookings can be auto-dispatched.`);
    }

    const techs = await this.prisma.technician.findMany({
      where: { verificationStatus: VerificationStatus.VERIFIED },
      include: { bookings: { where: { status: { in: [BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS] } } } },
    });
    if (techs.length === 0) throw new BadRequestException('No verified technicians available.');

    const serviceName = (booking.service?.name ?? '').toLowerCase();
    const city = booking.business.city.toLowerCase();

    const scored = techs.map((t) => {
      const skills: string[] = JSON.parse(t.skills || '[]');
      const areas: string[] = JSON.parse(t.serviceAreas || '[]');
      let score = 0;
      if (skills.some((s) => serviceName.includes(s.toLowerCase()) || s.toLowerCase().split(' ').some((w) => w.length > 3 && serviceName.includes(w)))) score += 3;
      if (areas.some((a) => a.toLowerCase() === city)) score += 2;
      score += t.rating; // up to +5 for top-rated
      score -= t.bookings.length; // workload penalty
      return { t, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];

    this.logger.log(`dispatch: booking ${bookingId} -> tech ${winner.t.id} (score ${winner.score.toFixed(1)})`);
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { technicianId: winner.t.id, status: BookingStatus.ASSIGNED },
    });
  }
}
