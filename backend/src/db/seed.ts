import { db } from './index.ts';
import * as schema from './schema.ts';
import { DEFAULT_DEMO_USERS, hashPassword } from './service.ts';

async function seed() {
  console.log('🌱 Starting PetroPulse Database Seeding...');
  
  try {
    // 1. Seed Number Sequences
    console.log('  → Initializing atomic number sequences...');
    const sequences = [
      { prefix: 'BUNK', currentValue: 1 },
      { prefix: 'TANK', currentValue: 1 },
      { prefix: 'NOZZ', currentValue: 1 },
      { prefix: 'READ', currentValue: 1 },
    ];
    for (const seq of sequences) {
      await db.insert(schema.numberSequences).values(seq).onConflictDoNothing();
    }

    // 2. Seed Fuels
    console.log('  → Seeding fuel master catalog...');
    const fuels = [
      {
        code: 'OCTANE_98',
        name: '98 Octane',
        shortName: '98 Oct',
        ratePerLiter: 112.50,
        densityStd15c: 752.0,
        densityTolerance: 3.0,
        color: '#DC2626',
      },
      {
        code: 'OCTANE_95',
        name: '95 Octane',
        shortName: '95 Oct',
        ratePerLiter: 104.25,
        densityStd15c: 745.0,
        densityTolerance: 3.0,
        color: '#16A34A',
      },
      {
        code: 'DIESEL',
        name: 'Diesel',
        shortName: 'Diesel',
        ratePerLiter: 92.80,
        densityStd15c: 830.0,
        densityTolerance: 3.0,
        color: '#EAB308',
      },
    ];
    for (const f of fuels) {
      await db.insert(schema.fuels).values(f).onConflictDoNothing();
    }



    // 5. Seed Employees
    console.log('  → Seeding default staff & demo credentials...');
    const hashedDefault = hashPassword('PetroPulse@123');
    for (const emp of DEFAULT_DEMO_USERS) {
      await db.insert(schema.employees).values({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        username: emp.username,
        role: emp.role,
        phone: emp.phone,
        stationId: emp.stationId,
        assignedBunks: emp.assignedBunks,
        status: emp.status,
        isActive: emp.isActive,
        shiftSchedule: emp.shiftSchedule,
        passwordHash: hashedDefault,
      }).onConflictDoNothing();
    }

    console.log('✅ PetroPulse Database seeded successfully!');
  } catch (err: any) {
    console.error('❌ Error seeding database:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();
