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

    // 3. Seed Stations
    console.log('  → Seeding initial stations (bunks)...');
    const stations = [
      {
        id: 'st-101',
        name: 'Metro Central Forecourt',
        code: 'BUNK-000001',
        location: 'Connaught Place Outer Ring, New Delhi',
        managerId: 'emp-mgr-002',
        managerName: 'Rajesh Sharma',
        phone: '+91 98200 22345',
        operatingHours: '24_HOURS',
        status: 'ONLINE',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        eodCloseTime: '23:59',
      },
      {
        id: 'st-102',
        name: 'Highway Plaza Express',
        code: 'BUNK-000002',
        location: 'NH-48 KM 42, Gurugram',
        managerId: 'emp-mgr-002',
        managerName: 'Rajesh Sharma',
        phone: '+91 98200 22345',
        operatingHours: '24_HOURS',
        status: 'ONLINE',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        eodCloseTime: '23:59',
      },
      {
        id: 'st-103',
        name: 'Dubai Marina Forecourt',
        code: 'BUNK-000003',
        location: 'Al Marsa St, Dubai Marina, Dubai, UAE',
        managerId: 'emp-mgr-002',
        managerName: 'Rajesh Sharma',
        phone: '+971 4 399 1234',
        operatingHours: '24_HOURS',
        status: 'ONLINE',
        currency: 'AED',
        timezone: 'Asia/Dubai',
        eodCloseTime: '23:59',
      },
      {
        id: 'st-104',
        name: 'Abu Dhabi Corniche Plaza',
        code: 'BUNK-000004',
        location: 'Corniche Road West, Abu Dhabi, UAE',
        managerId: 'emp-mgr-002',
        managerName: 'Rajesh Sharma',
        phone: '+971 2 681 5678',
        operatingHours: '24_HOURS',
        status: 'ONLINE',
        currency: 'AED',
        timezone: 'Asia/Dubai',
        eodCloseTime: '23:59',
      },
    ];
    for (const st of stations) {
      await db.insert(schema.stations).values(st).onConflictDoNothing();
    }

    // 4. Seed Tanks
    console.log('  → Seeding underground storage tanks...');
    const tanks = [
      {
        id: 'TANK-000001',
        stationId: 'st-101',
        tankNumber: 1,
        name: 'Tank 1 - 95 Octane',
        fuelCode: 'OCTANE_95',
        capacityLiters: 25000,
        safeCapacityLiters: 23500,
        currentDipCm: 185,
        currentVolumeLiters: 18200,
        openingStockLiters: 18200,
        waterDipCm: 0.1,
        lowThresholdLiters: 4000,
        maxDipCm: 250,
        status: 'ACTIVE',
      },
      {
        id: 'TANK-000002',
        stationId: 'st-101',
        tankNumber: 2,
        name: 'Tank 2 - Diesel',
        fuelCode: 'DIESEL',
        capacityLiters: 30000,
        safeCapacityLiters: 28500,
        currentDipCm: 210,
        currentVolumeLiters: 24500,
        openingStockLiters: 24500,
        waterDipCm: 0.2,
        lowThresholdLiters: 5000,
        maxDipCm: 250,
        status: 'ACTIVE',
      },
      {
        id: 'TANK-000003',
        stationId: 'st-101',
        tankNumber: 3,
        name: 'Tank 3 - 98 Octane',
        fuelCode: 'OCTANE_98',
        capacityLiters: 20000,
        safeCapacityLiters: 19000,
        currentDipCm: 160,
        currentVolumeLiters: 14500,
        openingStockLiters: 14500,
        waterDipCm: 0.1,
        lowThresholdLiters: 3000,
        maxDipCm: 250,
        status: 'ACTIVE',
      },
    ];
    for (const t of tanks) {
      await db.insert(schema.tanks).values(t).onConflictDoNothing();
    }

    // 4.1 Seed Dispensers & Nozzles
    console.log('  → Seeding dispensers and nozzles...');
    const dispensers = [
      {
        id: 'disp-01',
        stationId: 'st-101',
        dispenserNumber: 1,
        islandNumber: 1,
        brand: 'Tokheim Quantium',
        status: 'ACTIVE',
      },
      {
        id: 'disp-02',
        stationId: 'st-101',
        dispenserNumber: 2,
        islandNumber: 2,
        brand: 'Gilbarco Veeder-Root',
        status: 'ACTIVE',
      },
    ];
    for (const d of dispensers) {
      await db.insert(schema.dispensers).values(d).onConflictDoNothing();
    }

    const nozzles = [
      {
        id: 'NOZZ-000001',
        dispenserId: 'disp-01',
        stationId: 'st-101',
        tankId: 'TANK-000001',
        fuelCode: 'OCTANE_95',
        nozzleNumber: 1,
        name: 'Island 1 - Bay A (95 Oct)',
        deviceIdentifier: 'NZ-PUMP1-NA',
        mechanicalTotalizer: 14500.0,
        electronicTotalizer: 14500.0,
        status: 'ACTIVE',
      },
      {
        id: 'NOZZ-000002',
        dispenserId: 'disp-01',
        stationId: 'st-101',
        tankId: 'TANK-000002',
        fuelCode: 'DIESEL',
        nozzleNumber: 2,
        name: 'Island 1 - Bay B (Diesel)',
        deviceIdentifier: 'NZ-PUMP1-NB',
        mechanicalTotalizer: 28400.0,
        electronicTotalizer: 28400.0,
        status: 'ACTIVE',
      },
    ];
    for (const nz of nozzles) {
      await db.insert(schema.nozzles).values(nz).onConflictDoNothing();
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
