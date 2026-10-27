import { test } from 'node:test';
import assert from 'node:assert';
import { validateBunkForm, validateNozzleForm, validateUserForm, validateTankForm } from '../src/utils/validation.js';
import { mockStore } from '../src/db/mockStore.ts';
import {
  STANDARD_FUELS,
  STANDARD_FUEL_MAP,
  normalizeFuelCode,
  isValidFuelCode,
  getFuelDefinition,
} from '../src/utils/fuelConfig.js';

test('validateBunkForm accepts bunk creation without code because backend generates it', () => {
  const result = validateBunkForm({
    name: 'South Express Station',
    phone: '+15550199333',
    email: 'station@petropulse.internal',
  });

  assert.strictEqual(result.isValid, true);
  assert.deepStrictEqual(result.errors, {});
});

test('validateBunkForm flags invalid formats when provided', () => {
  const result = validateBunkForm({
    name: 'A', // too short
    code: 'invalid lowercase',
    email: 'not-an-email',
  });

  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.code);
  assert.ok(result.errors.email);
});

test('validateNozzleForm validates nozzle number, station, and fuelCode', () => {
  const valid = validateNozzleForm({
    stationId: 'st_123',
    nozzleNumber: 1,
    fuelCode: 'OCTANE_95',
  });
  assert.strictEqual(valid.isValid, true);

  const invalid = validateNozzleForm({
    stationId: '',
    fuelCode: '',
    nozzleNumber: 0,
  });
  assert.strictEqual(invalid.isValid, false);
  assert.ok(invalid.errors.stationId);
  assert.ok(invalid.errors.fuelCode);
  assert.ok(invalid.errors.nozzleNumber);
});

test('Standard fuel catalog defines exactly 3 fuels with prescribed canonical names and colors', () => {
  assert.strictEqual(STANDARD_FUEL_MAP.OCTANE_98.name, '98 Octane');
  assert.strictEqual(STANDARD_FUEL_MAP.OCTANE_98.colorName, 'Red');
  assert.strictEqual(STANDARD_FUEL_MAP.OCTANE_98.color, '#DC2626');

  assert.strictEqual(STANDARD_FUEL_MAP.OCTANE_95.name, '95 Octane');
  assert.strictEqual(STANDARD_FUEL_MAP.OCTANE_95.colorName, 'Green');
  assert.strictEqual(STANDARD_FUEL_MAP.OCTANE_95.color, '#16A34A');

  assert.strictEqual(STANDARD_FUEL_MAP.DIESEL.name, 'Diesel');
  assert.strictEqual(STANDARD_FUEL_MAP.DIESEL.colorName, 'Yellow');
  assert.strictEqual(STANDARD_FUEL_MAP.DIESEL.color, '#EAB308');
});

test('Fuel normalization maps legacy aliases to standardized fuel codes safely', () => {
  assert.strictEqual(normalizeFuelCode('PETROL'), 'OCTANE_95');
  assert.strictEqual(normalizeFuelCode('MS'), 'OCTANE_95');
  assert.strictEqual(normalizeFuelCode('PREMIUM'), 'OCTANE_98');
  assert.strictEqual(normalizeFuelCode('XP95'), 'OCTANE_98');
  assert.strictEqual(normalizeFuelCode('HSD'), 'DIESEL');
  assert.strictEqual(normalizeFuelCode('DIESEL'), 'DIESEL');

  assert.strictEqual(isValidFuelCode('OCTANE_98'), true);
  assert.strictEqual(isValidFuelCode('OCTANE_95'), true);
  assert.strictEqual(isValidFuelCode('DIESEL'), true);
  assert.strictEqual(isValidFuelCode('KEROSENE'), false);
  assert.strictEqual(isValidFuelCode('LPG'), false);
});

test('validateNozzleForm rejects unsupported fuel types', () => {
  const result = validateNozzleForm({
    stationId: 'st_123',
    nozzleNumber: 2,
    fuelCode: 'KEROSENE',
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.fuelCode.includes('Unsupported fuel type'));
});

test('validateNozzleForm enforces feeder tank fuel compatibility', () => {
  // Compatible: nozzle 98 Octane with tank 98 Octane
  const comp = validateNozzleForm({
    stationId: 'st_123',
    nozzleNumber: 1,
    fuelCode: 'OCTANE_98',
    tankId: 'tk-1',
    tankFuelCode: 'OCTANE_98',
  });
  assert.strictEqual(comp.isValid, true);

  // Incompatible: nozzle Diesel with tank 95 Octane
  const incomp = validateNozzleForm({
    stationId: 'st_123',
    nozzleNumber: 2,
    fuelCode: 'DIESEL',
    tankId: 'tk-2',
    tankFuelCode: 'OCTANE_95',
  });
  assert.strictEqual(incomp.isValid, false);
  assert.ok(incomp.errors.fuelCode.toLowerCase().includes('incompatible'));
});

test('validateUserForm validates user identity and handles undefined fields safely', () => {
  // Valid user with email
  const validUser = validateUserForm({
    name: 'Rajesh Kumar',
    email: 'rajesh@petropulse.io',
    role: 'MANAGER',
    stationId: 'st-101',
    phone: '+91 98765 43210',
  });
  assert.strictEqual(validUser.isValid, true);

  // Missing name and role
  const invalidUser = validateUserForm({
    name: '',
    role: '',
    stationId: '',
  });
  assert.strictEqual(invalidUser.isValid, false);
  assert.ok(invalidUser.errors.name);
  assert.ok(invalidUser.errors.role);
});

test('mockStore.createUser safely creates user with undefined email or username without throwing trim error', () => {
  // Case 1: user with only username and undefined email
  const user1 = mockStore.createUser({
    name: 'Attendant User 1',
    username: 'attendant1',
    role: 'ATTENDANT',
    stationId: 'st-101',
  });
  assert.ok(user1.id);
  assert.strictEqual(user1.name, 'Attendant User 1');
  assert.strictEqual(user1.username, 'attendant1');
  assert.ok(user1.email.includes('attendant1'));

  // Case 2: user with only email and undefined username
  const user2 = mockStore.createUser({
    name: 'Manager User 2',
    email: 'manager2@test.com',
    role: 'MANAGER',
    stationId: 'st-101',
  });
  assert.ok(user2.id);
  assert.strictEqual(user2.name, 'Manager User 2');
  assert.strictEqual(user2.email, 'manager2@test.com');
  assert.strictEqual(user2.username, 'manager2');

  // Case 3: partial update with undefined fields
  const updated = mockStore.updateUser(user1.id, {
    name: 'Updated Attendant Name',
    phone: '+91 99999 88888',
  });
  assert.strictEqual(updated.name, 'Updated Attendant Name');
  assert.strictEqual(updated.phone, '+91 99999 88888');
});

test('validateTankForm ensures Tank number, Tank Identifier, and Tank Name are identical', () => {
  // Valid synchronized tank identity
  const valid = validateTankForm({
    tankNumber: '1',
    tankIdentifier: '1',
    name: '1',
    fuelCode: 'OCTANE_95',
    capacityLiters: 20000,
    openingStockLiters: 0,
    safeCapacityLiters: 19000,
    lowThresholdLiters: 3000,
  });
  assert.strictEqual(valid.isValid, true);

  // Mismatched tank identifier and name
  const mismatched = validateTankForm({
    tankNumber: '1',
    tankIdentifier: 'TANK-001',
    name: 'Different Name',
    fuelCode: 'OCTANE_95',
    capacityLiters: 20000,
    openingStockLiters: 0,
  });
  assert.strictEqual(mismatched.isValid, false);
  assert.ok(mismatched.errors.tankIdentifier);
  assert.ok(mismatched.errors.name);
});

test('validateTankForm and mockStore.createTank block safe filling when opening/current stock exceeds safe capacity', () => {
  // Opening stock (19500 L) exceeds safe filling capacity (19000 L)
  const overfillResult = validateTankForm({
    tankNumber: '5',
    tankIdentifier: '5',
    name: '5',
    fuelCode: 'DIESEL',
    capacityLiters: 20000,
    openingStockLiters: 19500,
    safeCapacityLiters: 19000,
    lowThresholdLiters: 3000,
  });
  assert.strictEqual(overfillResult.isValid, false);
  assert.ok(overfillResult.errors.safeCapacityLiters);

  // mockStore.createTank ensures Tank number, Identifier, and Name are same
  const tank = mockStore.createTank({
    stationId: 'st-101',
    tankNumber: 9,
    fuelCode: 'OCTANE_95',
    capacityLiters: 20000,
    openingStockLiters: 0,
  });
  assert.strictEqual(tank.id, '9');
  assert.strictEqual(tank.name, '9');
  assert.strictEqual(tank.tankNumber, 9);
  assert.strictEqual(tank.safeCapacityLiters, 19000);
  assert.strictEqual(tank.lowThresholdLiters, 3000);

  // mockStore.createTank blocks safe filling if opening stock > safe capacity
  assert.throws(() => {
    mockStore.createTank({
      stationId: 'st-101',
      tankNumber: 10,
      fuelCode: 'OCTANE_95',
      capacityLiters: 20000,
      openingStockLiters: 19500,
      safeCapacityLiters: 19000,
    });
  }, /Safe filling is blocked/);
});

test('mockStore.createTank with 0 opening stock sets volume to 0 (not 18000)', () => {
  const tank = mockStore.createTank({
    stationId: 'st-101',
    tankNumber: 42,
    fuelCode: 'OCTANE_95',
    capacityLiters: 25000,
    openingStockLiters: 0,
    currentVolumeLiters: 0,
  });
  assert.strictEqual(tank.currentVolumeLiters, 0, 'Volume must be 0, not 18000');
  assert.strictEqual(tank.openingStockLiters, 0);
  assert.strictEqual(tank.currentDipCm, 0);
});

test('deleteTank blocks deletion if linked nozzle is ACTIVE', () => {
  let activeTank = mockStore.tanks.find((t) => t.id === 'TANK-000001');
  if (!activeTank) {
    activeTank = mockStore.createTank({
      id: 'TANK-000001',
      stationId: 'st-101',
      tankNumber: 1,
      name: '1',
      fuelCode: 'OCTANE_95',
      capacityLiters: 20000,
      openingStockLiters: 10000,
    });
  }
  if (!mockStore.nozzles.some((n) => n.tankId === activeTank.id && n.status === 'ACTIVE')) {
    mockStore.createNozzle({
      stationId: 'st-101',
      tankId: activeTank.id,
      nozzleNumber: 101,
      fuelCode: 'OCTANE_95',
      status: 'ACTIVE',
    });
  }
  assert.throws(() => {
    mockStore.deleteTank(activeTank.id);
  }, /because it is linked to active nozzle/);
});

test('deleteTank blocks deletion if tank has decanting delivery history even with 0 active nozzles', () => {
  // Create an isolated tank with 0 nozzles
  const tank = mockStore.createTank({
    stationId: 'st-101',
    tankNumber: 77,
    fuelCode: 'OCTANE_95',
    capacityLiters: 20000,
    openingStockLiters: 5000,
  });

  // Record a decanting tanker load on this tank
  mockStore.decantTankerLoad({
    tankId: tank.id,
    invoiceNumber: 'INV-TEST-77',
    invoiceVolumeLiters: 5000,
    invoiceDensity: 745.0,
    observedDensity: 745.0,
    observedTemp: 15.0,
  });

  // Verify deletion is blocked because of decanting history
  assert.throws(() => {
    mockStore.deleteTank(tank.id);
  }, /historical decanting tanker delivery record/);
});

test('deactivateTank and updateTank block deactivation when linked nozzles are ACTIVE', () => {
  const activeTank = mockStore.tanks.find((t) => t.id === 'TANK-000001') || mockStore.tanks[0];
  assert.throws(() => {
    mockStore.deactivateTank(activeTank.id, 'INACTIVE');
  }, /Cannot deactivate tank.*linked to active nozzle/);

  assert.throws(() => {
    mockStore.updateTank(activeTank.id, { status: 'INACTIVE' });
  }, /Cannot deactivate tank.*linked to active nozzle/);
});

test('deleteNozzle blocks deletion when nozzle was dispensed, and allows deletion when un-dispensed', () => {
  // Create a nozzle and reading
  const nz = mockStore.createNozzle({
    stationId: 'st-101',
    nozzleNumber: 99,
    fuelCode: 'OCTANE_95',
  });
  // Record meter reading
  mockStore.recordMeterReading({
    stationId: 'st-101',
    nozzleId: nz.id,
    closingReading: 500,
    testingLiters: 5,
    grossDispensedLiters: 500,
    netSoldLiters: 495,
    meterPhotoUrl: 'https://storage.petropulse.io/readings/test_photo.jpg',
  });

  // Attempting to delete the dispensed nozzle must throw error per statutory regulations
  assert.throws(() => {
    mockStore.deleteNozzle(nz.id);
  }, /Cannot delete nozzle.*Fuel has already been dispensed/);

  // Now create an un-dispensed nozzle
  const cleanNz = mockStore.createNozzle({
    stationId: 'st-101',
    nozzleNumber: 100,
    fuelCode: 'OCTANE_95',
  });
  // Deleting un-dispensed nozzle should succeed
  const result = mockStore.deleteNozzle(cleanNz.id);
  assert.strictEqual(result.success, true);
  assert.strictEqual(mockStore.getNozzles('st-101').some((n) => n.id === cleanNz.id), false);
});

test('recordMeterReading blocks reading when net dispensed volume exceeds feeder tank stock', () => {
  // Create a tank with low stock
  const lowTank = mockStore.createTank({
    stationId: 'st-101',
    tankNumber: 88,
    fuelCode: 'OCTANE_98',
    capacityLiters: 10000,
    openingStockLiters: 50,
  });
  assert.strictEqual(lowTank.currentVolumeLiters, 50);

  // Create nozzle linked to this tank
  const lowNozzle = mockStore.createNozzle({
    stationId: 'st-101',
    tankId: lowTank.id,
    nozzleNumber: 88,
    fuelCode: 'OCTANE_98',
  });

  // Attempt to dispense 100 L (exceeds 50 L available stock)
  assert.throws(() => {
    mockStore.recordMeterReading({
      stationId: 'st-101',
      nozzleId: lowNozzle.id,
      closingReading: 100,
      testingLiters: 0,
      grossDispensedLiters: 100,
      netSoldLiters: 100,
      meterPhotoUrl: 'https://storage.petropulse.io/readings/test_photo.jpg',
    });
  }, /Stock limit exceeded/);

  // Dispensing 40 L (within 50 L stock) succeeds
  const reading = mockStore.recordMeterReading({
    stationId: 'st-101',
    nozzleId: lowNozzle.id,
    closingReading: 40,
    testingLiters: 0,
    grossDispensedLiters: 40,
    netSoldLiters: 40,
    meterPhotoUrl: 'https://storage.petropulse.io/readings/test_photo.jpg',
  });
  assert.ok(reading.id);
  const updatedTank = mockStore.getTank(lowTank.id);
  assert.strictEqual(updatedTank.currentVolumeLiters, 10);
});

test('recordMeterReading requires exception reason when closing meter is less than opening meter', () => {
  const nz = mockStore.createNozzle({
    stationId: 'st-101',
    nozzleNumber: 77,
    fuelCode: 'DIESEL',
  });

  // Initial reading to advance totalizer to 500
  mockStore.recordMeterReading({
    stationId: 'st-101',
    nozzleId: nz.id,
    closingReading: 500,
    testingLiters: 0,
    grossDispensedLiters: 500,
    netSoldLiters: 500,
    meterPhotoUrl: 'https://storage.petropulse.io/readings/test_photo.jpg',
  });

  // Attempt rollover reading to 10 without exception reason - should throw
  assert.throws(() => {
    mockStore.recordMeterReading({
      stationId: 'st-101',
      nozzleId: nz.id,
      closingReading: 10,
      testingLiters: 0,
      grossDispensedLiters: 0,
      netSoldLiters: 0,
      meterPhotoUrl: 'https://storage.petropulse.io/readings/test_photo.jpg',
    });
  }, /is lower than opening meter/);

  // With exception reason - succeeds
  const rollover = mockStore.recordMeterReading({
    stationId: 'st-101',
    nozzleId: nz.id,
    closingReading: 10,
    testingLiters: 0,
    grossDispensedLiters: 0,
    netSoldLiters: 0,
    isCorrection: true,
    exceptionReason: 'Totalizer unit replaced due to hardware upgrade',
    meterPhotoUrl: 'https://storage.petropulse.io/readings/test_photo.jpg',
  });
  assert.ok(rollover.id);
});

test('mockStore creates station with explicit currency and defaults to INR', () => {
  const inrStation = mockStore.createStation({
    name: 'Delhi Northern Forecourt',
    location: 'Delhi, India',
    operatingHours: '24_HOURS',
  });
  assert.strictEqual(inrStation.currency, 'INR');

  const aedStation = mockStore.createStation({
    name: 'Dubai Marina Forecourt',
    location: 'Dubai Marina, UAE',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    operatingHours: '24_HOURS',
  });
  assert.strictEqual(aedStation.currency, 'AED');
});

test('mockStore.closeShift synchronizes nozzle closing meters to nozzle totalizers', () => {
  const nozzle = mockStore.createNozzle({
    stationId: 'st-101',
    dispenserId: 'disp-01',
    fuelCode: 'OCTANE_95',
    nozzleNumber: 99,
  });
  const initialReading = nozzle.electronicTotalizer || 0;

  const shift = mockStore.createShift({
    stationId: 'st-101',
    attendantId: 'emp-att-001',
    islandNumber: 1,
    assignedNozzles: [nozzle.id],
  });

  const closingReading = initialReading + 325.5;
  const closed = mockStore.closeShift(shift.id, {
    totalFuelSoldLiters: 325.5,
    totalExpectedRevenue: 325.5 * 104.25,
    cashSubmitted: 20000,
    digitalSubmitted: 10000,
    creditSubmitted: 3933.12,
    nozzleReadings: [
      {
        nozzleId: nozzle.id,
        fuelCode: 'OCTANE_95',
        startMeter: initialReading,
        endMeter: closingReading,
        testingLiters: 0,
        rate: 104.25,
      },
    ],
  });

  assert.strictEqual(closed.status, 'SETTLED');
  const updatedNozzle = mockStore.getNozzle(nozzle.id);
  assert.strictEqual(updatedNozzle.electronicTotalizer, closingReading);
  assert.strictEqual(updatedNozzle.mechanicalTotalizer, closingReading);
});

test('mockStore.recordMeterReading enforces mandatory meter totalizer photo', () => {
  const nozzle = mockStore.nozzles[0];
  const opening = nozzle.electronicTotalizer || 1000;
  const closing = opening + 50;

  // Missing photoUrl/meterPhotoUrl must throw error
  assert.throws(
    () => {
      mockStore.recordMeterReading({
        nozzleId: nozzle.id,
        openingMeter: opening,
        closingMeter: closing,
        testingLiters: 0,
      });
    },
    /Meter totalizer photograph is strictly mandatory/
  );

  // Providing photo succeeds and defaults testingLiters to 0
  const reading = mockStore.recordMeterReading({
    nozzleId: nozzle.id,
    openingMeter: opening,
    closingMeter: closing,
    meterPhotoUrl: 'https://storage.petropulse.io/readings/test_totalizer.jpg',
  });

  assert.strictEqual(reading.testingLiters, 0);
  assert.strictEqual(reading.meterPhotoUrl, 'https://storage.petropulse.io/readings/test_totalizer.jpg');
  assert.strictEqual(reading.grossDispensedLiters, 50);
  assert.strictEqual(reading.netSoldLiters, 50);
});


