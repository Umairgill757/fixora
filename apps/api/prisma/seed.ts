/**
 * Dev seed: demo businesses + services + a technician.
 * Run: npx tsx prisma/seed.ts   (from apps/api)
 * Safe to re-run: wipes demo data first (DEV ONLY).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const hash = (p: string) => bcrypt.hash(p, 12);

async function main() {
  console.log('Seeding demo data…');

  // wipe (dev only)
  await prisma.review.deleteMany();
  await prisma.service.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const owner = await prisma.user.create({
    data: {
      name: 'Demo Owner',
      email: 'owner@fixora.test',
      passwordHash: await hash('password123'),
      role: 'BUSINESS_OWNER',
    },
  });

  const techUser = await prisma.user.create({
    data: {
      name: 'Ahmed Khan',
      email: 'ahmed.tech@fixora.test',
      passwordHash: await hash('password123'),
      role: 'TECHNICIAN',
      phone: '0300-1234567',
    },
  });

  const biz1 = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'CityFix Electricians',
      slug: 'cityfix-electricians-demo',
      description:
        'Certified electricians for homes and offices. Wiring, switchboards, fans, lighting and emergency repairs — same-day service across Lahore.',
      city: 'Lahore',
      serviceAreas: JSON.stringify(['DHA', 'Gulberg', 'Model Town', 'Johar Town']),
      categories: JSON.stringify(['electrician']),
      verified: true,
      rating: 4.8,
      services: {
        create: [
          { name: 'Ceiling fan installation', basePrice: 800, unit: 'job' },
          { name: 'Full house wiring inspection', basePrice: 2500, unit: 'visit' },
          { name: 'Switchboard repair', basePrice: 600, unit: 'job' },
        ],
      },
    },
  });

  await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'AquaFlow Plumbing',
      slug: 'aquaflow-plumbing-demo',
      description:
        'Leak detection, pipe fitting, bathroom fittings and water tank installs. Upfront fixed quotes, no hidden charges.',
      city: 'Lahore',
      serviceAreas: JSON.stringify(['DHA', 'Cantt', 'Gulberg']),
      categories: JSON.stringify(['plumber']),
      verified: true,
      rating: 4.9,
      services: {
        create: [
          { name: 'Tap / mixer replacement', basePrice: 700, unit: 'job' },
          { name: 'Leak detection & repair', basePrice: 1200, unit: 'job' },
          { name: 'Water tank installation', basePrice: 3500, unit: 'job' },
        ],
      },
    },
  });

  await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: 'SparkleClean Home Services',
      slug: 'sparkleclean-demo',
      description:
        'Deep cleaning, sofa & carpet shampoo, kitchen degreasing. Trained teams with professional equipment.',
      city: 'Karachi',
      serviceAreas: JSON.stringify(['Clifton', 'DHA', 'Gulshan']),
      categories: JSON.stringify(['cleaner']),
      verified: false,
      rating: 4.6,
      services: {
        create: [
          { name: '2BHK deep cleaning', basePrice: 6000, unit: 'job' },
          { name: 'Sofa shampoo (5-seater)', basePrice: 2500, unit: 'job' },
        ],
      },
    },
  });

  await prisma.technician.create({
    data: {
      userId: techUser.id,
      businessId: biz1.id,
      skills: JSON.stringify(['wiring', 'fan-installation', 'switchboard']),
      serviceAreas: JSON.stringify(['DHA', 'Gulberg']),
      verificationStatus: 'VERIFIED',
      rating: 4.8,
      completedJobs: 132,
      availability: JSON.stringify({ mon: [['09:00', '18:00']], tue: [['09:00', '18:00']] }),
    },
  });

  console.log('Done. Demo logins: owner@fixora.test / ahmed.tech@fixora.test (password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
