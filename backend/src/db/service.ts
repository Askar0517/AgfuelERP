import crypto from 'crypto';
import { db } from './index.ts';
import * as schema from './schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { normalizeFuelCode, STANDARD_FUELS, getFuelDefinition } from '../utils/fuelConfig.ts';
import {
  mockStore,
  hashPassword,
  verifyPassword,
  calculateDipVolume,
  calculateVolumeToDip,
  correctDensity15C,
  DEFAULT_DEMO_USERS,
  DEFAULT_STATIONS,
  DEFAULT_FUELS,
  DEFAULT_TANKS,
  DEFAULT_DISPENSERS,
  DEFAULT_NOZZLES,
} from './mockStore.ts';

export {
  mockStore,
  hashPassword,
  verifyPassword,
  calculateDipVolume,
  calculateVolumeToDip,
  correctDensity15C,
  DEFAULT_DEMO_USERS,
  DEFAULT_STATIONS,
  DEFAULT_FUELS,
  DEFAULT_TANKS,
  DEFAULT_DISPENSERS,
  DEFAULT_NOZZLES,
};

export const dbService = {
  // 1. Stations (Bunks)
  async getStations() {
    try {
      const allStations = await db.select().from(schema.stations);
      const allNozzles = await db.select().from(schema.nozzles).catch(() => []);
      const allTanks = await db.select().from(schema.tanks).catch(() => []);

      return allStations.map((st) => ({
        ...st,
        nozzleCount: allNozzles.filter((n) => n.stationId === st.id).length,
        tankCount: allTanks.filter((t) => t.stationId === st.id).length,
      }));
    } catch (err: any) {
      console.warn('[DB getStations offline fallback]:', err.message);
      return mockStore.getStations();
    }
  },

  async getStation(id: string) {
    try {
      const rows = await db.select().from(schema.stations).where(eq(schema.stations.id, id));
      if (rows[0]) {
        const st = rows[0];
        const nozs = await db.select().from(schema.nozzles).where(eq(schema.nozzles.stationId, id)).catch(() => []);
        const tnks = await db.select().from(schema.tanks).where(eq(schema.tanks.stationId, id)).catch(() => []);
        return {
          ...st,
          nozzleCount: nozs.length,
          tankCount: tnks.length,
        };
      }
    } catch (err: any) {
      console.warn('[DB getStation offline fallback]:', err.message);
    }
    return mockStore.getStation(id);
  },

  async generateUniqueEntityCode(
    prefix: 'BUNK' | 'TANK' | 'NOZZ' | 'READ',
    checkExists: (code: string) => Promise<boolean>,
    maxRetries = 10,
    padLength = 6
  ): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const candidateCode = await this.getNextSequenceNumber(prefix, padLength);
      const exists = await checkExists(candidateCode);
      if (!exists) {
        return candidateCode;
      }
      console.warn(`[CodeGeneration] Collision detected for sequence ${candidateCode} (attempt ${attempt}/${maxRetries}). Retrying with next sequence...`);
    }
    const errMsg = `[CodeGeneration] Exhausted all ${maxRetries} retry attempts generating unique authoritative code for ${prefix}.`;
    console.error(errMsg);
    throw new Error(`Failed to assign unique ${prefix} code due to persistent sequence collisions after ${maxRetries} attempts. Please contact administrator.`);
  },

  async getNextSequenceNumber(prefix: 'BUNK' | 'TANK' | 'NOZZ' | 'READ', padLength = 6): Promise<string> {
    const result = await db.transaction(async (tx) => {
      const res = await tx.insert(schema.numberSequences)
        .values({ prefix, currentValue: 1, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.numberSequences.prefix,
          set: {
            currentValue: sql`${schema.numberSequences.currentValue} + 1`,
            updatedAt: new Date(),
          },
        })
        .returning({ currentValue: schema.numberSequences.currentValue });
      return res[0]?.currentValue || 1;
    });
    return `${prefix}-${String(result).padStart(padLength, '0')}`;
  },

  async peekNextBunkCode(): Promise<string> {
    try {
      const existing = await db.select().from(schema.numberSequences).where(eq(schema.numberSequences.prefix, 'BUNK'));
      const val = (existing[0]?.currentValue || 0) + 1;
      return `BUNK-${String(val).padStart(6, '0')}`;
    } catch {
      return 'BUNK-000001';
    }
  },

  async getNextBunkCode(): Promise<string> {
    try {
      return await this.generateUniqueEntityCode('BUNK', async (code) => {
        const rows = await db.select().from(schema.stations).where(eq(schema.stations.code, code));
        return rows.length > 0;
      });
    } catch {
      return 'BUNK-000001';
    }
  },

  async getNextTankCode(): Promise<string> {
    try {
      return await this.generateUniqueEntityCode('TANK', async (code) => {
        const rows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, code));
        return rows.length > 0;
      });
    } catch {
      return mockStore.nextSeq('TANK');
    }
  },

  async getNextNozzleCode(): Promise<string> {
    try {
      return await this.generateUniqueEntityCode('NOZZ', async (code) => {
        const rows = await db.select().from(schema.nozzles).where(eq(schema.nozzles.id, code));
        return rows.length > 0;
      });
    } catch {
      return mockStore.nextSeq('NOZZ');
    }
  },

  async getNextReadingCode(): Promise<string> {
    try {
      return await this.generateUniqueEntityCode('READ', async (code) => {
        const rows = await db.select().from(schema.manualMeterReadings).where(eq(schema.manualMeterReadings.id, code));
        return rows.length > 0;
      });
    } catch {
      return mockStore.nextSeq('READ');
    }
  },

  async createAuditLog(
    entity: string,
    entityId: string,
    action: string,
    actorId = 'system',
    actorName = 'System User',
    details?: any,
    ipAddress?: string
  ) {
    try {
      const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(schema.auditLogs).values({
        id,
        entity,
        entityId,
        action,
        actorId,
        actorName,
        detailsJson: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        timestamp: new Date(),
      });
    } catch (err) {
      console.warn('Failed to record audit log:', err);
    }
  },

  async getAuditLogs(entity?: string, entityId?: string) {
    try {
      let logs = await db.select().from(schema.auditLogs);
      if (entity) {
        logs = logs.filter((l) => l.entity.toUpperCase() === entity.toUpperCase());
      }
      if (entityId) {
        logs = logs.filter((l) => l.entityId === entityId);
      }
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  },

  async createStation(
    payload: {
      name: string;
      code?: string;
      location?: string;
      address?: string;
      cityState?: string;
      postalCode?: string;
      phone?: string;
      email?: string;
      latitude?: number;
      longitude?: number;
      managerId?: string;
      managerName?: string;
      operatingHours?: string;
      timezone?: string;
      eodCloseTime?: string;
      status?: string;
      currency?: string;
      notes?: string;
    },
    actorId = 'system',
    actorName = 'Administrator'
  ) {
    try {
      if (!payload.name?.trim()) throw new Error('Bunk name is required.');
      if (payload.name.trim().length < 3) throw new Error('Bunk name must be at least 3 characters.');

      // Entity codes are exclusively generated and assigned on the backend, unless explicitly specified
      const cleanCode = payload.code?.trim().toUpperCase() || (await this.getNextBunkCode());

      let managerName = payload.managerName?.trim() || 'Unassigned';
      let managerId = payload.managerId?.trim() || null;

      if (managerId) {
        const empRows = await db.select().from(schema.employees).where(eq(schema.employees.id, managerId));
        const emp = empRows[0];
        if (!emp) {
          throw new Error('Assigned manager does not exist in User Master.');
        }
        if (!emp.isActive || emp.status === 'INACTIVE') {
          throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
        }
        if (emp.role !== 'MANAGER' && emp.role !== 'OWNER') {
          throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
        }
        managerName = emp.name;
      }

      const id = cleanCode;
      const newStation = {
        id,
        name: payload.name.trim(),
        code: cleanCode,
        location: payload.location?.trim() || payload.cityState?.trim() || payload.address?.trim() || 'Highway Corridor',
        managerId,
        managerName,
        phone: payload.phone?.trim() || '+91 90000 00000',
        address: payload.address?.trim() || '',
        cityState: payload.cityState?.trim() || '',
        postalCode: payload.postalCode?.trim() || '',
        email: payload.email?.trim() || '',
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        notes: payload.notes?.trim() || '',
        timezone: payload.timezone?.trim() || 'Asia/Kolkata',
        operatingHours: payload.operatingHours?.trim() || '24_HOURS',
        eodCloseTime: payload.eodCloseTime?.trim() || '23:59',
        status: payload.status?.trim() || 'ONLINE',
        currency: payload.currency?.trim() || (payload.timezone === 'Asia/Dubai' ? 'AED' : 'INR'),
        createdAt: new Date(),
        createdBy: actorName,
        updatedAt: new Date(),
        updatedBy: actorName,
      };

      await db.insert(schema.stations).values(newStation);

      // Auto-create a default dispenser for this station
      const dispId = `dsp-${id}-1`;
      await db.insert(schema.dispensers).values({
        id: dispId,
        stationId: id,
        dispenserNumber: 1,
        islandNumber: 1,
        brand: 'Gilbarco Multi-Product Dispenser',
        status: 'ACTIVE',
      });

      await this.createAuditLog('BUNK', id, 'CREATE', actorId, actorName, {
        name: newStation.name,
        code: cleanCode,
      });

      return await this.getStation(id);
    } catch (err: any) {
      console.error('[DB createStation error]:', err.message);
      throw err;
    }
  },

  async updateStation(
    id: string,
    payload: Partial<{
      name: string;
      code: string;
      location: string;
      address: string;
      cityState: string;
      postalCode: string;
      phone: string;
      email: string;
      latitude: number;
      longitude: number;
      managerId: string;
      managerName: string;
      operatingHours: string;
      timezone: string;
      eodCloseTime: string;
      status: string;
      currency: string;
      notes: string;
    }>,
    actorId = 'system',
    actorName = 'Administrator'
  ) {
    try {
      const existingRows = await db.select().from(schema.stations).where(eq(schema.stations.id, id));
      if (existingRows.length === 0) throw new Error('Bunk not found.');

      if (payload.name !== undefined) {
        if (!payload.name?.trim()) throw new Error('Bunk name is required.');
        if (payload.name.trim().length < 3) throw new Error('Bunk name must be at least 3 characters.');
      }

      if (payload.code) {
        const cleanCode = payload.code.trim().toUpperCase();
        const allStations = await db.select().from(schema.stations);
        if (allStations.some((s) => s.id !== id && s.code.toUpperCase() === cleanCode)) {
          throw new Error(`Another bunk with code "${cleanCode}" already exists.`);
        }
        payload.code = cleanCode;
      }

      if (payload.managerId !== undefined) {
        if (payload.managerId) {
          const empRows = await db.select().from(schema.employees).where(eq(schema.employees.id, payload.managerId));
          const emp = empRows[0];
          if (!emp) {
            throw new Error('Assigned manager does not exist in User Master.');
          }
          if (!emp.isActive || emp.status === 'INACTIVE') {
            throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
          }
          if (emp.role !== 'MANAGER' && emp.role !== 'OWNER') {
            throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
          }
          payload.managerName = emp.name;
        } else {
          payload.managerId = undefined;
          payload.managerName = 'Unassigned';
        }
      }

      await db.update(schema.stations)
        .set({
          ...payload,
          updatedAt: new Date(),
          updatedBy: actorName,
        })
        .where(eq(schema.stations.id, id));

      await this.createAuditLog('BUNK', id, 'UPDATE', actorId, actorName, {
        changes: payload,
      });

      return await this.getStation(id);
    } catch (err: any) {
      console.error('[DB updateStation error]:', err.message);
      throw err;
    }
  },

  async deactivateStation(id: string, actorId = 'system', actorName = 'Administrator') {
    try {
      const stRows = await db.select().from(schema.stations).where(eq(schema.stations.id, id));
      const station = stRows[0];
      if (!station) throw new Error('Bunk not found.');

      const newStatus = station.status === 'INACTIVE' ? 'ONLINE' : 'INACTIVE';
      await db.update(schema.stations)
        .set({ status: newStatus, updatedAt: new Date(), updatedBy: actorName })
        .where(eq(schema.stations.id, id));

      await this.createAuditLog('BUNK', id, newStatus === 'INACTIVE' ? 'DEACTIVATE' : 'ACTIVATE', actorId, actorName, {
        previousStatus: station.status,
        newStatus,
      });

      return await this.getStation(id);
    } catch (err: any) {
      console.error('[DB deactivateStation error]:', err.message);
      throw err;
    }
  },

  async deleteStation(id: string, actorId = 'system', actorName = 'Administrator') {
    try {
      const stRows = await db.select().from(schema.stations).where(eq(schema.stations.id, id));
      const station = stRows[0];
      if (!station) throw new Error('Bunk not found.');

      const [tankRows, nozzleRows, readingRows, employeeRows, shiftRows] = await Promise.all([
        db.select().from(schema.tanks).where(eq(schema.tanks.stationId, id)),
        db.select().from(schema.nozzles).where(eq(schema.nozzles.stationId, id)),
        db.select().from(schema.manualMeterReadings).where(eq(schema.manualMeterReadings.stationId, id)),
        db.select().from(schema.employees).where(eq(schema.employees.stationId, id)),
        db.select().from(schema.shifts).where(eq(schema.shifts.stationId, id)),
      ]);

      const activeTanks = tankRows.filter((t) => t.status === 'ACTIVE');
      const activeNozzles = nozzleRows.filter((n) => n.status === 'ACTIVE');
      const activeEmployees = employeeRows.filter((e) => e.status === 'ACTIVE' || e.isActive);
      const activeShifts = shiftRows.filter((s) => s.status === 'ACTIVE');
      const dispensedReadings = readingRows.filter(
        (r) => (r.grossDispensedLiters && r.grossDispensedLiters > 0) || (r.netSoldLiters && r.netSoldLiters > 0)
      );

      const blockReasons: string[] = [];
      if (activeTanks.length > 0) blockReasons.push(`${activeTanks.length} active tank(s)`);
      if (activeNozzles.length > 0) blockReasons.push(`${activeNozzles.length} active nozzle(s)`);
      if (activeEmployees.length > 0) blockReasons.push(`${activeEmployees.length} assigned employee(s)`);
      if (activeShifts.length > 0) blockReasons.push(`${activeShifts.length} active shift(s)`);
      if (dispensedReadings.length > 0) blockReasons.push(`${dispensedReadings.length} dispensed fuel transaction(s)`);

      if (blockReasons.length > 0) {
        throw new Error(
          `Cannot permanently delete bunk "${station.name}" (${station.code}) because it has active assets or recorded dispensing: ${blockReasons.join(', ')}. Please deactivate all tanks and nozzles, and reassign staff before deleting.`
        );
      }

      await db.transaction(async (tx) => {
        await tx.delete(schema.manualMeterReadings).where(eq(schema.manualMeterReadings.stationId, id));
        await tx.delete(schema.nozzles).where(eq(schema.nozzles.stationId, id));
        await tx.delete(schema.tanks).where(eq(schema.tanks.stationId, id));
        await tx.delete(schema.dispensers).where(eq(schema.dispensers.stationId, id));
        await tx.delete(schema.stations).where(eq(schema.stations.id, id));
      });

      await this.createAuditLog('BUNK', id, 'DELETE', actorId, actorName, {
        stationName: station.name,
        stationCode: station.code,
      });

      return { success: true, deletedStationId: id };
    } catch (err: any) {
      console.error('[DB deleteStation error]:', err.message);
      throw err;
    }
  },

  // 2. Fuels
  async getFuels(stationId?: string) {
    try {
      const fuels = await db.select().from(schema.fuels);
      const stationOverrides = new Map<string, number>();

      if (stationId && stationId !== 'ALL') {
        try {
          const historyRows = await db
            .select()
            .from(schema.fuelPriceHistory)
            .where(eq(schema.fuelPriceHistory.stationId, stationId))
            .orderBy(desc(schema.fuelPriceHistory.effectiveFrom), desc(schema.fuelPriceHistory.createdAt));

          for (const row of historyRows) {
            const norm = normalizeFuelCode(row.fuelCode);
            if (!stationOverrides.has(norm)) {
              stationOverrides.set(norm, row.ratePerLiter);
            }
          }
        } catch (e: any) {
          console.warn('[DB fuelPriceHistory error]:', e.message);
        }
      }

      if (fuels && fuels.length > 0) {
        const map = new Map<string, any>();
        for (const f of fuels) {
          const norm = normalizeFuelCode(f.code);
          const def = getFuelDefinition(norm);
          const hasStationRate = stationOverrides.has(norm);
          const effectiveRate = hasStationRate ? stationOverrides.get(norm)! : f.ratePerLiter;

          if (!map.has(norm)) {
            map.set(norm, {
              ...f,
              code: norm,
              name: def.displayName,
              shortName: def.shortName,
              color: def.colorHex,
              colorName: def.colorName,
              densityStd15c: def.densityStd15c,
              densityTolerance: def.densityTolerance,
              ratePerLiter: effectiveRate,
              globalRatePerLiter: f.ratePerLiter,
              stationRatePerLiter: hasStationRate ? stationOverrides.get(norm)! : null,
              isStationCustom: hasStationRate,
              stationId: stationId || null,
            });
          }
        }
        for (const s of STANDARD_FUELS) {
          if (!map.has(s.code)) {
            const defaultGlobalRate = s.code === 'OCTANE_98' ? 111.5 : s.code === 'OCTANE_95' ? 104.25 : 92.8;
            const hasStationRate = stationOverrides.has(s.code);
            const effectiveRate = hasStationRate ? stationOverrides.get(s.code)! : defaultGlobalRate;

            map.set(s.code, {
              code: s.code,
              name: s.name,
              shortName: s.shortName,
              ratePerLiter: effectiveRate,
              globalRatePerLiter: defaultGlobalRate,
              stationRatePerLiter: hasStationRate ? stationOverrides.get(s.code)! : null,
              isStationCustom: hasStationRate,
              stationId: stationId || null,
              densityStd15c: s.densityStd15c,
              densityTolerance: s.densityTolerance,
              color: s.color,
              colorName: s.colorName,
              updatedAt: new Date(),
            });
          }
        }
        return ['OCTANE_98', 'OCTANE_95', 'DIESEL'].map((c) => map.get(c)).filter(Boolean);
      }
    } catch (err: any) {
      console.warn('[DB getFuels offline fallback]:', err.message);
    }
    return mockStore.getFuels(stationId);
  },

  async updateFuelRate(
    code: string,
    newRate: number,
    stationId?: string | null,
    actorId: string = 'SYSTEM',
    actorName: string = 'Forecourt Manager',
    remarks?: string
  ) {
    const norm = normalizeFuelCode(code);
    const targetStation = stationId && stationId !== 'ALL' ? stationId : null;

    try {
      if (targetStation) {
        // Station-specific price change -> record in fuelPriceHistory
        const historyId = `PRC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await db.insert(schema.fuelPriceHistory).values({
          id: historyId,
          fuelCode: norm,
          stationId: targetStation,
          ratePerLiter: newRate,
          effectiveFrom: new Date(),
          remarks: remarks || `Station-specific retail price revision for bunk ${targetStation}`,
          createdAt: new Date(),
          createdBy: actorId,
          createdByName: actorName,
        });

        await this.createAuditLog(
          'PRICING',
          `${targetStation}:${norm}`,
          'PRICE_CHANGE',
          actorId,
          actorName,
          {
            stationId: targetStation,
            fuelCode: norm,
            ratePerLiter: newRate,
            type: 'STATION_SPECIFIC',
          }
        );
      } else {
        // Global price change -> update base fuels table AND insert global history record
        await db.update(schema.fuels)
          .set({ ratePerLiter: newRate, updatedAt: new Date() })
          .where(eq(schema.fuels.code, norm));
        await db.update(schema.fuels)
          .set({ ratePerLiter: newRate, updatedAt: new Date() })
          .where(eq(schema.fuels.code, code));

        const historyId = `PRC-GLB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await db.insert(schema.fuelPriceHistory).values({
          id: historyId,
          fuelCode: norm,
          stationId: null,
          ratePerLiter: newRate,
          effectiveFrom: new Date(),
          remarks: remarks || 'Global base retail price revision across all stations',
          createdAt: new Date(),
          createdBy: actorId,
          createdByName: actorName,
        }).catch(() => {});

        await this.createAuditLog(
          'PRICING',
          norm,
          'PRICE_CHANGE',
          actorId,
          actorName,
          {
            fuelCode: norm,
            ratePerLiter: newRate,
            type: 'GLOBAL',
          }
        );
      }
    } catch (err: any) {
      console.warn('[DB updateFuelRate error, falling back to mockStore]:', err.message);
      mockStore.updateFuelRate(code, newRate, targetStation);
    }
    return await this.getFuels(targetStation || undefined);
  },

  async resetStationFuelRate(
    code: string,
    stationId: string,
    actorId: string = 'SYSTEM',
    actorName: string = 'Forecourt Manager'
  ) {
    const norm = normalizeFuelCode(code);
    try {
      await db.delete(schema.fuelPriceHistory)
        .where(and(eq(schema.fuelPriceHistory.stationId, stationId), eq(schema.fuelPriceHistory.fuelCode, norm)));

      await this.createAuditLog(
        'PRICING',
        `${stationId}:${norm}`,
        'PRICE_CHANGE',
        actorId,
        actorName,
        {
          stationId,
          fuelCode: norm,
          action: 'RESET_TO_GLOBAL',
        }
      );
    } catch (err: any) {
      console.warn('[DB resetStationFuelRate error]:', err.message);
      mockStore.resetStationFuelRate(code, stationId);
    }
    return await this.getFuels(stationId);
  },

  // 3. Tanks
  async getTanks(stationId?: string) {
    try {
      let allTanks = await db.select().from(schema.tanks);
      if (stationId) {
        allTanks = allTanks.filter((t) => t.stationId === stationId);
      }
      const allStations = await db.select().from(schema.stations).catch(() => []);
      const allNozzles = await db.select().from(schema.nozzles).catch(() => []);
      return allTanks.map((t) => {
        const st = allStations.find((s) => s.id === t.stationId);
        const linkedNozzles = allNozzles.filter((n) => n.tankId === t.id || (n.stationId === t.stationId && n.fuelCode === t.fuelCode));
        return {
          ...t,
          stationName: st ? st.name : t.stationId,
          stationCode: st ? st.code : '',
          associatedNozzleCount: linkedNozzles.length,
        };
      }).sort((a, b) => a.tankNumber - b.tankNumber);
    } catch (err: any) {
      console.warn('[DB getTanks offline fallback]:', err.message);
      return mockStore.getTanks(stationId);
    }
  },

  async getTank(id: string) {
    try {
      const tankRows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, id));
      const tank = tankRows[0];
      if (!tank) return null;

      const station = await this.getStation(tank.stationId);
      const allNozzles = await db.select().from(schema.nozzles).where(eq(schema.nozzles.stationId, tank.stationId));
      const associatedNozzles = allNozzles.filter((n) => n.tankId === tank.id || n.fuelCode === tank.fuelCode);
      const recentLoads = await db.select().from(schema.tankLoads)
        .where(eq(schema.tankLoads.tankId, id))
        .orderBy(desc(schema.tankLoads.timestamp))
        .limit(10);
      const auditEvents = await this.getAuditLogs('TANK', id);

      return {
        ...tank,
        parentStation: station,
        associatedNozzles,
        recentLoads,
        auditEvents,
      };
    } catch (err: any) {
      console.warn('[DB getTank offline fallback]:', err.message);
      return mockStore.getTank(id);
    }
  },

  async createTank(payload: {
    id?: string;
    tankIdentifier?: string;
    stationId: string;
    tankNumber?: number;
    name?: string;
    fuelCode: string;
    capacityLiters: number;
    safeCapacityLiters?: number;
    currentVolumeLiters?: number;
    openingStockLiters?: number;
    lowThresholdLiters?: number;
    status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
    location?: string;
    description?: string;
    createdBy?: string;
  }) {
    try {
      if (!payload.stationId) throw new Error('Parent bunk is required for tank.');
      if (!payload.fuelCode) throw new Error('Fuel type is required.');
      if (typeof payload.capacityLiters !== 'number' || payload.capacityLiters <= 0) {
        throw new Error('Capacity must be a positive number greater than zero.');
      }

      const station = await this.getStation(payload.stationId);
      if (!station) throw new Error('Selected parent bunk does not exist.');

      const existingStationTanks = await db.select().from(schema.tanks).where(eq(schema.tanks.stationId, payload.stationId));

      // 1. Tank number, Tank Identifier, and Tank Name must be the same
      const uniformIdentity = String(
        payload.id ?? payload.tankNumber ?? payload.name ?? (existingStationTanks.length + 1)
      ).trim();

      const parsedNum = parseInt(uniformIdentity, 10);
      const tankNumber = !isNaN(parsedNum) && parsedNum > 0
        ? parsedNum
        : (typeof payload.tankNumber === 'number' && payload.tankNumber > 0
            ? payload.tankNumber
            : (existingStationTanks.reduce((max, t) => Math.max(max, t.tankNumber), 0) + 1));

      const tankId = uniformIdentity;
      const displayName = uniformIdentity;

      if (existingStationTanks.some((t) => t.id === tankId || t.tankNumber === tankNumber)) {
        throw new Error(`Tank "${tankId}" (Number #${tankNumber}) already exists in bunk "${station.name}". Duplicate tanks are not allowed.`);
      }

      // 2. Capacity and Safe Filling Validation
      const capacity = Number(payload.capacityLiters);
      if (isNaN(capacity) || capacity <= 0) {
        throw new Error('Capacity must be a positive number greater than zero.');
      }

      const safeCapacity = payload.safeCapacityLiters ?? Number((capacity * 0.95).toFixed(0));
      const lowThreshold = payload.lowThresholdLiters ?? Number((capacity * 0.15).toFixed(0));
      const currentVolume = Math.max(0, Number(payload.currentVolumeLiters ?? payload.openingStockLiters ?? 0));

      if (currentVolume > capacity) {
        throw new Error(`Current stock (${currentVolume} L) cannot exceed tank capacity (${capacity} L).`);
      }
      if (currentVolume > safeCapacity) {
        throw new Error(`Current stock (${currentVolume} L) exceeds safe filling capacity (${safeCapacity} L). Safe filling is blocked.`);
      }

      const maxDip = 250;
      const currentDip = calculateVolumeToDip(capacity, currentVolume, maxDip);
      const fuelCode = normalizeFuelCode(payload.fuelCode);

      const newTank = {
        id: tankId,
        stationId: payload.stationId,
        tankNumber,
        name: displayName,
        fuelCode,
        capacityLiters: capacity,
        safeCapacityLiters: safeCapacity,
        currentDipCm: currentDip,
        currentVolumeLiters: currentVolume,
        openingStockLiters: currentVolume,
        waterDipCm: 0.2,
        lowThresholdLiters: lowThreshold,
        maxDipCm: maxDip,
        status: payload.status || 'ACTIVE',
        location: payload.location?.trim() || null,
        description: payload.description?.trim() || null,
        lastDipTimestamp: new Date(),
        createdAt: new Date(),
        createdBy: payload.createdBy || 'Administrator',
        updatedAt: new Date(),
        updatedBy: payload.createdBy || 'Administrator',
      };

      await db.insert(schema.tanks).values(newTank);

      await this.createAuditLog('TANK', tankId, 'CREATE', payload.createdBy || 'system', payload.createdBy || 'Administrator', {
        tankNumber,
        name: displayName,
        tankId,
        fuelCode: payload.fuelCode,
        capacityLiters: capacity,
        safeCapacityLiters: safeCapacity,
        lowThresholdLiters: lowThreshold,
        stationId: payload.stationId,
      });

      return await this.getTank(tankId);
    } catch (err: any) {
      if (
        err.message?.includes('already exists') ||
        err.message?.includes('cannot exceed') ||
        err.message?.includes('exceeds safe filling') ||
        err.message?.includes('greater than zero') ||
        err.message?.includes('required') ||
        err.message?.includes('does not exist')
      ) {
        throw err;
      }
      console.warn('[DB createTank offline fallback]:', err.message);
      return mockStore.createTank(payload);
    }
  },

  async updateTank(id: string, payload: Partial<{
    name: string;
    tankNumber: number;
    capacityLiters: number;
    safeCapacityLiters: number;
    lowThresholdLiters: number;
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
    location: string;
    description: string;
    updatedBy: string;
  }>) {
    try {
      const existingRows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, id));
      const curr = existingRows[0];
      if (!curr) throw new Error('Tank not found.');

      if (payload.capacityLiters !== undefined) {
        if (typeof payload.capacityLiters !== 'number' || payload.capacityLiters <= 0) {
          throw new Error('Capacity must be greater than zero.');
        }
        const safeCap = payload.safeCapacityLiters ?? Number((payload.capacityLiters * 0.95).toFixed(0));
        if (curr.currentVolumeLiters > payload.capacityLiters) {
          throw new Error(`Current stock (${curr.currentVolumeLiters} L) exceeds proposed capacity (${payload.capacityLiters} L).`);
        }
        if (curr.currentVolumeLiters > safeCap) {
          throw new Error(`Current stock (${curr.currentVolumeLiters} L) exceeds safe filling limit (${safeCap} L). Safe filling is blocked.`);
        }
      }

      // Synchronize tank number and name if either is updated
      let targetTankNumber = payload.tankNumber;
      let targetName = payload.name;
      if (payload.name && !payload.tankNumber) {
        const parsed = parseInt(payload.name, 10);
        if (!isNaN(parsed) && parsed > 0) targetTankNumber = parsed;
      } else if (payload.tankNumber && !payload.name) {
        targetName = String(payload.tankNumber);
      }

      if (targetTankNumber && targetTankNumber !== curr.tankNumber) {
        const dup = await db.select().from(schema.tanks)
          .where(and(eq(schema.tanks.stationId, curr.stationId), eq(schema.tanks.tankNumber, targetTankNumber)));
        if (dup.some((t) => t.id !== id)) {
          throw new Error(`Tank #${targetTankNumber} already exists in this bunk.`);
        }
      }

      const updateFields: any = {
        ...payload,
        ...(targetTankNumber !== undefined ? { tankNumber: targetTankNumber } : {}),
        ...(targetName !== undefined ? { name: targetName } : {}),
        updatedAt: new Date(),
      };

      await db.update(schema.tanks).set(updateFields).where(eq(schema.tanks.id, id));

      await this.createAuditLog('TANK', id, 'UPDATE', payload.updatedBy || 'system', payload.updatedBy || 'Administrator', {
        changes: payload,
      });

      return await this.getTank(id);
    } catch (err: any) {
      console.warn('[DB updateTank offline fallback]:', err.message);
      return mockStore.updateTank(id, payload);
    }
  },

  async deactivateTank(id: string, targetStatus?: 'INACTIVE' | 'MAINTENANCE', actorId = 'system', actorName = 'Administrator') {
    try {
      const existing = await db.select().from(schema.tanks).where(eq(schema.tanks.id, id));
      const curr = existing[0];
      if (!curr) throw new Error('Tank not found.');

      const newStatus = targetStatus || (curr.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

      // Edit flow flag check: cannot deactivate tank if active nozzles are attached
      if (newStatus === 'INACTIVE') {
        const nozzleRows = await db.select().from(schema.nozzles).where(eq(schema.nozzles.tankId, id)).catch(() => []);
        const activeNozzles = nozzleRows.filter((n) => n.status === 'ACTIVE');
        if (activeNozzles.length > 0) {
          throw new Error(
            `Cannot deactivate tank "${curr.name || curr.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}). Please deactivate or reassign the nozzles first.`
          );
        }
      }

      await db.update(schema.tanks)
        .set({ status: newStatus, updatedAt: new Date(), updatedBy: actorName })
        .where(eq(schema.tanks.id, id));

      await this.createAuditLog('TANK', id, newStatus === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE', actorId, actorName, {
        previousStatus: curr.status,
        newStatus,
      });

      return await this.getTank(id);
    } catch (err: any) {
      if (err.message && err.message.startsWith('Cannot deactivate tank')) {
        throw err;
      }
      console.warn('[DB deactivateTank offline fallback]:', err.message);
      return mockStore.deactivateTank(id, targetStatus);
    }
  },

  async deleteTank(id: string, actorId = 'system', actorName = 'Administrator') {
    try {
      const existing = await db.select().from(schema.tanks).where(eq(schema.tanks.id, id));
      const tank = existing[0];
      if (!tank) throw new Error('Tank not found.');

      // Check linked nozzles: don't allow to delete a tank when nozzle was active
      const nozzleRows = await db.select().from(schema.nozzles).where(eq(schema.nozzles.tankId, id));
      const activeNozzles = nozzleRows.filter((n) => n.status === 'ACTIVE');

      if (activeNozzles.length > 0) {
        throw new Error(
          `Cannot delete tank "${tank.name || tank.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}). Please deactivate or reassign the nozzles before deleting this tank.`
        );
      }

      // Check decanting history (tank loads): cannot delete if tanker delivery records exist
      const loadRows = await db.select().from(schema.tankLoads).where(eq(schema.tankLoads.tankId, id)).catch(() => []);
      if (loadRows.length > 0) {
        throw new Error(
          `Cannot delete tank "${tank.name || tank.id}" because it has ${loadRows.length} historical decanting tanker delivery record(s). Deletion is blocked to preserve inventory audit history. Please deactivate the tank instead.`
        );
      }

      // If inactive nozzles exist, unlink their tankId
      if (nozzleRows.length > 0) {
        await db.update(schema.nozzles).set({ tankId: null }).where(eq(schema.nozzles.tankId, id)).catch(() => {});
      }

      await db.delete(schema.tanks).where(eq(schema.tanks.id, id));

      await this.createAuditLog('TANK', id, 'DELETE', actorId, actorName, {
        tankName: tank.name,
        tankNumber: tank.tankNumber,
        stationId: tank.stationId,
      });

      return { success: true, deletedTankId: id };
    } catch (err: any) {
      if (err.message && (err.message.startsWith('Cannot delete tank') || err.message.startsWith('Cannot deactivate tank'))) {
        throw err;
      }
      console.warn('[DB deleteTank offline fallback]:', err.message);
      return mockStore.deleteTank(id);
    }
  },

  async recordTankDip(tankId: string, dipCm: number, waterDipCm: number) {
    try {
      const tankRows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, tankId));
      const tank = tankRows[0];
      if (!tank) throw new Error('Tank not found');

      const newVolume = calculateDipVolume(tank.capacityLiters, dipCm, tank.maxDipCm);
      await db.update(schema.tanks)
        .set({
          currentDipCm: Number(dipCm.toFixed(1)),
          currentVolumeLiters: newVolume,
          waterDipCm: Number(waterDipCm.toFixed(1)),
          lastDipTimestamp: new Date(),
        })
        .where(eq(schema.tanks.id, tankId));

      const updated = await db.select().from(schema.tanks).where(eq(schema.tanks.id, tankId));
      return updated[0];
    } catch (err: any) {
      console.warn('[DB recordTankDip offline fallback]:', err.message);
      return mockStore.recordDip(tankId, dipCm, waterDipCm);
    }
  },

  async decantTankerLoad(payload: {
    stationId?: string;
    tankId: string;
    invoiceNo: string;
    tankerNumber: string;
    invoiceVolumeLiters: number;
    invoiceDensity?: number;
    observedDensity?: number;
    observedTemp?: number;
    temperatureC?: number;
    operatorName?: string;
    remarks?: string;
    invoiceImageUrl?: string;
  }) {
    try {
      const tankRows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, payload.tankId));
      let tank: typeof schema.tanks.$inferSelect | undefined = tankRows[0];
      if (!tank) {
        const allTanks = await db.select().from(schema.tanks).catch(() => []);
        tank = allTanks.find(
          (t) =>
            String(t.id) === String(payload.tankId) ||
            String(t.tankNumber) === String(payload.tankId) ||
            t.name === payload.tankId
        );
      }
      if (!tank) throw new Error('Tank not found.');

      const fuelRows = await db.select().from(schema.fuels).where(eq(schema.fuels.code, tank.fuelCode)).catch(() => []);
      const fuel = fuelRows[0];

      const observedDensity = Number(payload.observedDensity ?? (tank.fuelCode === 'DIESEL' ? 828.5 : 742.0));
      const observedTemp = Number(payload.observedTemp ?? payload.temperatureC ?? 15);
      const invoiceDensity = Number(
        payload.invoiceDensity ??
        fuel?.densityStd15c ??
        observedDensity
      );
      const operatorName = payload.operatorName || 'Administrator';
      const invoiceVolumeLiters = Number(payload.invoiceVolumeLiters) || 0;

      const corrected = correctDensity15C(observedDensity, observedTemp, tank.fuelCode);
      const densityDiff = Math.abs(corrected - invoiceDensity);
      let densityStatus = 'PASSED';
      if (fuel && densityDiff > fuel.densityTolerance * 2) {
        densityStatus = 'REJECTED';
      } else if (fuel && densityDiff > fuel.densityTolerance) {
        densityStatus = 'TOLERANCE_WARNING';
      }

      const volumeBefore = tank.currentVolumeLiters;
      const dipBefore = tank.currentDipCm;

      // Safe ullage room check
      const safeRoom = tank.safeCapacityLiters - volumeBefore;
      if (invoiceVolumeLiters > safeRoom + 300) {
        throw new Error(`Overfill hazard! Safe ullage space is ${safeRoom}L, cannot decant ${invoiceVolumeLiters}L.`);
      }

      const newVolume = Math.min(tank.capacityLiters, volumeBefore + invoiceVolumeLiters);
      const newDip = calculateVolumeToDip(tank.capacityLiters, newVolume, tank.maxDipCm);
      const receivedVolume = newVolume - volumeBefore;
      const varianceL = receivedVolume - invoiceVolumeLiters;
      const variancePct = invoiceVolumeLiters > 0 ? Number(((varianceL / invoiceVolumeLiters) * 100).toFixed(2)) : 0;

      // Update tank
      await db.update(schema.tanks)
        .set({
          currentVolumeLiters: newVolume,
          currentDipCm: newDip,
          lastDipTimestamp: new Date(),
        })
        .where(eq(schema.tanks.id, tank.id));

      // Create load record
      const loadId = `load-${Date.now()}`;
      await db.insert(schema.tankLoads).values({
        id: loadId,
        stationId: payload.stationId || tank.stationId,
        tankId: tank.id,
        fuelCode: tank.fuelCode,
        timestamp: new Date(),
        invoiceNo: payload.invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
        tankerNumber: payload.tankerNumber || 'TN-00-XX-0000',
        invoiceVolumeLiters: invoiceVolumeLiters,
        invoiceDensity: invoiceDensity,
        observedDensity: observedDensity,
        observedTemp: observedTemp,
        correctedDensity15c: corrected,
        densityStatus,
        dipBeforeCm: dipBefore,
        volumeBeforeLiters: volumeBefore,
        dipAfterCm: newDip,
        volumeAfterLiters: newVolume,
        receivedVolumeLiters: receivedVolume,
        varianceLiters: varianceL,
        variancePct,
        operatorName: operatorName,
        remarks: payload.remarks || 'Standard verified tanker unload',
        invoiceImageUrl: payload.invoiceImageUrl || (payload as any).imageUrl || null,
      });

      const insertedLoad = await db.select().from(schema.tankLoads).where(eq(schema.tankLoads.id, loadId));
      const updatedTank = await db.select().from(schema.tanks).where(eq(schema.tanks.id, tank.id));

      return { tank: updatedTank[0], loadRecord: insertedLoad[0] };
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('Overfill') ||
          err.message.includes('hazard') ||
          err.message.includes('Tank not found'))
      ) {
        throw err;
      }
      console.warn('[DB decantTankerLoad offline fallback]:', err.message);
      return mockStore.decantTankerLoad(payload);
    }
  },

  async getTankLoads(stationId?: string) {
    try {
      if (stationId) {
        return await db.select().from(schema.tankLoads)
          .where(eq(schema.tankLoads.stationId, stationId))
          .orderBy(desc(schema.tankLoads.timestamp));
      }
      return await db.select().from(schema.tankLoads).orderBy(desc(schema.tankLoads.timestamp));
    } catch (err: any) {
      console.warn('[DB getTankLoads offline fallback]:', err.message);
      return mockStore.getTankLoads(stationId);
    }
  },

  // 4. Dispensers & Nozzles
  async getDispensers(stationId?: string) {
    try {
      const disps = stationId
        ? await db.select().from(schema.dispensers).where(eq(schema.dispensers.stationId, stationId))
        : await db.select().from(schema.dispensers);

      const nozs = stationId
        ? await db.select().from(schema.nozzles).where(eq(schema.nozzles.stationId, stationId))
        : await db.select().from(schema.nozzles);

      return disps.map((d) => ({
        ...d,
        nozzles: nozs.filter((n) => n.dispenserId === d.id),
      }));
    } catch (err: any) {
      console.warn('[DB getDispensers offline fallback]:', err.message);
      return mockStore.getDispensers(stationId);
    }
  },

  async getNozzles(filter?: { stationId?: string; fuelCode?: string; status?: string }) {
    try {
      let allNozzles = await db.select().from(schema.nozzles);
      if (filter?.stationId) {
        allNozzles = allNozzles.filter((n) => n.stationId === filter.stationId);
      }
      if (filter?.fuelCode) {
        allNozzles = allNozzles.filter((n) => n.fuelCode === filter.fuelCode);
      }
      if (filter?.status) {
        allNozzles = allNozzles.filter((n) => n.status === filter.status);
      }

      const stationsList = await db.select().from(schema.stations).catch(() => []);
      const dispensersList = await db.select().from(schema.dispensers).catch(() => []);

      return allNozzles.map((n) => {
        const st = stationsList.find((s) => s.id === n.stationId);
        const dp = dispensersList.find((d) => d.id === n.dispenserId);
        return {
          ...n,
          stationName: st ? st.name : n.stationId,
          stationCode: st ? st.code : '',
          dispenserNumber: dp ? dp.dispenserNumber : 1,
          dispenserBrand: dp ? dp.brand : '',
        };
      });
    } catch (err: any) {
      console.warn('[DB getNozzles offline fallback]:', err.message);
      return mockStore.getNozzles(filter);
    }
  },

  async getNozzle(id: string) {
    try {
      const rows = await db.select().from(schema.nozzles).where(eq(schema.nozzles.id, id));
      if (!rows[0]) return null;
      const n = rows[0];
      const st = await this.getStation(n.stationId);
      const disps = await db.select().from(schema.dispensers).where(eq(schema.dispensers.id, n.dispenserId));
      const recentReadings = await db.select().from(schema.manualMeterReadings)
        .where(eq(schema.manualMeterReadings.nozzleId, id))
        .orderBy(desc(schema.manualMeterReadings.readingTimestamp))
        .limit(10);

      return {
        ...n,
        stationName: st ? st.name : n.stationId,
        stationCode: st ? st.code : '',
        dispenserNumber: disps[0] ? disps[0].dispenserNumber : 1,
        dispenserBrand: disps[0] ? disps[0].brand : '',
        recentReadings,
      };
    } catch (err: any) {
      console.warn('[DB getNozzle offline fallback]:', err.message);
      return mockStore.getNozzle(id);
    }
  },

  async createNozzle(payload: {
    stationId: string;
    nozzleNumber: number;
    fuelCode: string;
    name?: string;
    dispenserId?: string;
    deviceIdentifier?: string;
    status?: string;
    notes?: string;
    mechanicalTotalizer?: number;
    electronicTotalizer?: number;
  }) {
    try {
      if (!payload.stationId) throw new Error('Parent bunk is required.');
      if (!payload.nozzleNumber || payload.nozzleNumber < 1) throw new Error('Valid positive nozzle number is required.');
      if (!payload.fuelCode) throw new Error('Fuel type is required.');

      const st = await this.getStation(payload.stationId);
      if (!st) throw new Error('Selected parent bunk does not exist.');

      // Duplicate nozzle check strictly within this bunk
      const existingSameStation = await db.select().from(schema.nozzles)
        .where(and(eq(schema.nozzles.stationId, payload.stationId), eq(schema.nozzles.nozzleNumber, payload.nozzleNumber)));
      if (existingSameStation.length > 0) {
        throw new Error(`Nozzle #${payload.nozzleNumber} already exists in bunk "${st.name}". Duplicate nozzle numbers within the same bunk are not allowed.`);
      }

      const fuelCode = normalizeFuelCode(payload.fuelCode);
      let dispenserId = payload.dispenserId;
      if ((payload as any).tankId) {
        const tankRows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, (payload as any).tankId));
        const tank = tankRows[0];
        if (!tank) throw new Error('Selected underground tank does not exist.');
        if (tank.stationId !== payload.stationId) {
          throw new Error('Selected tank does not belong to the chosen bunk station.');
        }
        if (normalizeFuelCode(tank.fuelCode) !== fuelCode) {
          throw new Error(`Incompatible fuel type: Tank is configured for ${tank.fuelCode}, but nozzle was specified as ${payload.fuelCode}.`);
        }
      }

      if (!dispenserId) {
        const stationDisps = await db.select().from(schema.dispensers).where(eq(schema.dispensers.stationId, payload.stationId));
        if (stationDisps.length > 0) {
          dispenserId = stationDisps[0].id;
        } else {
          dispenserId = `dsp-${payload.stationId}-1`;
          await db.insert(schema.dispensers).values({
            id: dispenserId,
            stationId: payload.stationId,
            dispenserNumber: 1,
            islandNumber: 1,
            brand: 'Standard Dispenser Unit',
            status: 'ACTIVE',
          });
        }
      }

      const id = await this.getNextNozzleCode();
      const newNozzle = {
        id,
        stationId: payload.stationId,
        dispenserId,
        tankId: (payload as any).tankId || null,
        fuelCode,
        nozzleNumber: payload.nozzleNumber,
        name: payload.name?.trim() || `Nozzle ${payload.nozzleNumber} (${fuelCode})`,
        deviceIdentifier: payload.deviceIdentifier?.trim() || `NZ-${payload.nozzleNumber}`,
        notes: payload.notes?.trim() || '',
        mechanicalTotalizer: payload.mechanicalTotalizer || 0,
        electronicTotalizer: payload.electronicTotalizer || 0,
        status: payload.status?.trim() || 'ACTIVE',
        createdAt: new Date(),
        createdBy: 'Administrator',
        updatedAt: new Date(),
        updatedBy: 'Administrator',
      };

      await db.insert(schema.nozzles).values(newNozzle);

      await this.createAuditLog('NOZZLE', id, 'CREATE', 'system', 'Administrator', {
        nozzleNumber: payload.nozzleNumber,
        fuelCode: payload.fuelCode,
        stationId: payload.stationId,
      });

      return await this.getNozzle(id);
    } catch (err: any) {
      if (
        err.message?.includes('already exists') ||
        err.message?.includes('Incompatible fuel') ||
        err.message?.includes('does not exist') ||
        err.message?.includes('does not belong') ||
        err.message?.includes('required')
      ) {
        throw err;
      }
      console.warn('[DB createNozzle offline fallback]:', err.message);
      return mockStore.createNozzle(payload);
    }
  },

  async updateNozzle(id: string, payload: Partial<{
    nozzleNumber: number;
    fuelCode: string;
    tankId: string;
    name: string;
    dispenserId: string;
    deviceIdentifier: string;
    status: string;
    notes: string;
    mechanicalTotalizer: number;
    electronicTotalizer: number;
    updatedBy: string;
  }>) {
    try {
      const existing = await db.select().from(schema.nozzles).where(eq(schema.nozzles.id, id));
      if (existing.length === 0) throw new Error('Nozzle not found.');

      const curr = existing[0];
      if (payload.nozzleNumber && payload.nozzleNumber !== curr.nozzleNumber) {
        const dup = await db.select().from(schema.nozzles)
          .where(and(eq(schema.nozzles.stationId, curr.stationId), eq(schema.nozzles.nozzleNumber, payload.nozzleNumber)));
        if (dup.some((n) => n.id !== id)) {
          throw new Error(`Nozzle #${payload.nozzleNumber} already exists in this bunk.`);
        }
      }

      if (payload.fuelCode) {
        payload.fuelCode = normalizeFuelCode(payload.fuelCode);
      }
      const targetTankId = payload.tankId !== undefined ? payload.tankId : curr.tankId;
      const targetFuel = payload.fuelCode || curr.fuelCode;
      if (targetTankId) {
        const tankRows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, targetTankId));
        const tank = tankRows[0];
        if (!tank) throw new Error('Selected underground tank does not exist.');
        if (tank.stationId !== curr.stationId) {
          throw new Error('Selected tank does not belong to the chosen bunk station.');
        }
        if (normalizeFuelCode(tank.fuelCode) !== normalizeFuelCode(targetFuel)) {
          throw new Error(`Incompatible fuel type: Tank is configured for ${tank.fuelCode}, but nozzle fuel is ${targetFuel}.`);
        }
      }

      const updateFields: any = {
        ...payload,
        updatedAt: new Date(),
      };

      await db.update(schema.nozzles).set(updateFields).where(eq(schema.nozzles.id, id));

      await this.createAuditLog('NOZZLE', id, 'UPDATE', payload.updatedBy || 'system', payload.updatedBy || 'Administrator', {
        changes: payload,
      });

      return await this.getNozzle(id);
    } catch (err: any) {
      console.warn('[DB updateNozzle offline fallback]:', err.message);
      return mockStore.updateNozzle(id, payload);
    }
  },

  async updateNozzleStatus(id: string, status: string, actorId = 'system', actorName = 'Administrator') {
    try {
      const existing = await db.select().from(schema.nozzles).where(eq(schema.nozzles.id, id));
      const curr = existing[0];
      if (!curr) throw new Error('Nozzle not found.');

      await db.update(schema.nozzles)
        .set({ status, updatedAt: new Date(), updatedBy: actorName })
        .where(eq(schema.nozzles.id, id));

      await this.createAuditLog('NOZZLE', id, status === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE', actorId, actorName, {
        previousStatus: curr.status,
        newStatus: status,
      });

      return await this.getNozzle(id);
    } catch (err: any) {
      console.warn('[DB updateNozzleStatus offline fallback]:', err.message);
      return mockStore.updateNozzleStatus(id, status);
    }
  },

  async deleteNozzle(id: string, actorId = 'system', actorName = 'Administrator') {
    try {
      const existing = await db.select().from(schema.nozzles).where(eq(schema.nozzles.id, id));
      const nozzle = existing[0];
      if (!nozzle) throw new Error('Nozzle not found.');

      // Check if meter readings exist or if dispensed
      const linkedReadings = await db.select().from(schema.manualMeterReadings).where(eq(schema.manualMeterReadings.nozzleId, id));
      const totalizer = Number(nozzle.electronicTotalizer || 0);
      const initial = Number(nozzle.mechanicalTotalizer || 0);
      if (linkedReadings.length > 0 || totalizer > initial) {
        throw new Error(
          `Cannot delete nozzle #${nozzle.nozzleNumber}: Fuel has already been dispensed (${totalizer} L) or meter readings exist. Deactivate nozzle instead to maintain compliance records.`
        );
      }

      await db.delete(schema.nozzles).where(eq(schema.nozzles.id, id));

      await this.createAuditLog('NOZZLE', id, 'DELETE', actorId, actorName, {
        nozzleNumber: nozzle.nozzleNumber,
        stationId: nozzle.stationId,
      });

      return { success: true, deletedNozzleId: id };
    } catch (err: any) {
      if (err.message.includes('Cannot delete nozzle')) {
        throw err;
      }
      console.warn('[DB deleteNozzle offline fallback]:', err.message);
      return mockStore.deleteNozzle(id);
    }
  },

  // 5. Operations & Nozzle Meter Readings
  async recordManualMeterReading(payload: {
    stationId: string;
    nozzleId: string;
    openingMeter: number;
    closingMeter: number;
    testingLiters?: number;
    readingType?: 'REGULAR_SHIFT' | 'PERIODIC_CHECK' | 'CALIBRATION' | 'RESET_CORRECTION';
    isCorrection?: boolean;
    correctionReason?: string;
    remarks?: string;
    enteredBy: string;
    shiftCode?: string;
    recordedBy?: string;
    recordedByName?: string;
  }) {
    return await this.recordNozzleReading(payload);
  },

  async recordNozzleReading(payload: {
    stationId: string;
    nozzleId: string;
    openingMeter: number;
    closingMeter: number;
    testingLiters?: number;
    readingType?: 'REGULAR_SHIFT' | 'PERIODIC_CHECK' | 'CALIBRATION' | 'RESET_CORRECTION';
    isCorrection?: boolean;
    correctionReason?: string;
    remarks?: string;
    enteredBy: string;
    shiftCode?: string;
    recordedBy?: string;
    recordedByName?: string;
    meterPhotoUrl?: string;
  }) {
    try {
      if (!payload.stationId) throw new Error('Parent bunk is required.');
      if (!payload.nozzleId) throw new Error('Nozzle is required.');
      if (typeof payload.openingMeter !== 'number' || payload.openingMeter < 0) {
        throw new Error('Opening meter reading must be a non-negative number.');
      }
      if (typeof payload.closingMeter !== 'number' || payload.closingMeter < 0) {
        throw new Error('Closing meter reading must be a non-negative number.');
      }

      const photo = payload.meterPhotoUrl || (payload as any).photoUrl;
      if (!photo || typeof photo !== 'string' || !photo.trim()) {
        throw new Error('Meter totalizer photograph is strictly mandatory for legal metrology and audit compliance.');
      }

      const nozzleRows = await db.select().from(schema.nozzles).where(eq(schema.nozzles.id, payload.nozzleId));
      const nozzle = nozzleRows[0];
      if (!nozzle) throw new Error('Nozzle not found.');
      if (nozzle.stationId !== payload.stationId) {
        throw new Error('Nozzle does not belong to the selected bunk.');
      }

      // Meter rollover / replacement / correction exception workflow
      const isDecreasing = payload.closingMeter < payload.openingMeter;
      const isCorrection = Boolean(
        payload.isCorrection ||
        isDecreasing ||
        payload.readingType === 'RESET_CORRECTION' ||
        payload.readingType === 'CALIBRATION'
      );

      // Authoritative backend meter reading check (enforced for regular shift readings)
      const authoritativeMeter = nozzle.electronicTotalizer || nozzle.mechanicalTotalizer || 0;
      // Allow small epsilon tolerance (0.1) for floating point representation
      if (!isCorrection && Math.abs(payload.openingMeter - authoritativeMeter) > 0.1) {
        throw new Error(
          `Concurrency conflict: The authoritative recorded meter reading is ${authoritativeMeter.toFixed(2)}, but received opening reading is ${payload.openingMeter.toFixed(2)}. Please refresh to get the latest reading.`
        );
      }

      if (isDecreasing && (!isCorrection || !payload.correctionReason?.trim())) {
        throw new Error(
          `Invalid meter reading: Closing meter (${payload.closingMeter.toFixed(2)}) is lower than opening meter (${payload.openingMeter.toFixed(2)}). An authorized correction reason (e.g. mechanical replacement, rollover, recalibration) is required.`
        );
      }

      const stationFuels = await this.getFuels(payload.stationId);
      const fuel = stationFuels.find((f: any) => normalizeFuelCode(f.code) === normalizeFuelCode(nozzle.fuelCode));
      const fuelRate = fuel ? fuel.ratePerLiter : 100;

      const grossLiters = isDecreasing
        ? 0 // Meter replacement or rollover reset
        : Number((payload.closingMeter - payload.openingMeter).toFixed(2));

      const testing = Number(payload.testingLiters || 0);
      const netSold = Number(Math.max(0, grossLiters - testing).toFixed(2));
      const netAmount = Number((netSold * fuelRate).toFixed(2));

      const logId = await this.getNextReadingCode();

      // Deduct net fuel dispensed from corresponding underground tank
      if (netSold > 0) {
        let tank: any = null;
        if (nozzle.tankId) {
          const tankRows = await db.select().from(schema.tanks).where(eq(schema.tanks.id, nozzle.tankId));
          tank = tankRows[0];
        }
        if (!tank) {
          const tankRows = await db.select().from(schema.tanks)
            .where(and(eq(schema.tanks.stationId, payload.stationId), eq(schema.tanks.fuelCode, nozzle.fuelCode)));
          tank = tankRows[0];
        }
        if (tank) {
          if (netSold > tank.currentVolumeLiters) {
            throw new Error(
              `Stock limit exceeded: Net dispensed volume (${netSold} L) exceeds available stock in feeder tank "${tank.name || tank.id}" (${tank.currentVolumeLiters} L). Maximum permitted consumption is ${tank.currentVolumeLiters} L.`
            );
          }
          const remainingVolume = Math.max(0, tank.currentVolumeLiters - Math.round(netSold));
          const newDip = calculateVolumeToDip(tank.capacityLiters, remainingVolume, tank.maxDipCm);
          await db.update(schema.tanks)
            .set({
              currentVolumeLiters: remainingVolume,
              currentDipCm: newDip,
              lastDipTimestamp: new Date(),
            })
            .where(eq(schema.tanks.id, tank.id));
        }
      }

      // Update nozzle totalizers
      await db.update(schema.nozzles)
        .set({
          electronicTotalizer: payload.closingMeter,
          mechanicalTotalizer: payload.closingMeter,
          updatedAt: new Date(),
          updatedBy: payload.recordedByName || payload.enteredBy,
        })
        .where(eq(schema.nozzles.id, payload.nozzleId));

      // Insert immutable reading record
      const readingRecord = {
        id: logId,
        stationId: payload.stationId,
        nozzleId: payload.nozzleId,
        fuelCode: nozzle.fuelCode,
        openingMeter: payload.openingMeter,
        closingMeter: payload.closingMeter,
        grossDispensedLiters: grossLiters,
        testingLiters: testing,
        netSoldLiters: netSold,
        fuelRate,
        netSalesAmount: netAmount,
        readingType: payload.readingType || (isCorrection ? 'RESET_CORRECTION' : 'REGULAR_SHIFT'),
        isCorrection,
        correctionReason: payload.correctionReason?.trim() || null,
        remarks: payload.remarks?.trim() || null,
        enteredBy: payload.enteredBy,
        readingTimestamp: new Date(),
        shiftCode: payload.shiftCode || 'GENERAL',
        recordedBy: payload.recordedBy || null,
        recordedByName: payload.recordedByName || payload.enteredBy,
        meterPhotoUrl: payload.meterPhotoUrl || (payload as any).photoUrl || null,
      };

      await db.insert(schema.manualMeterReadings).values(readingRecord);

      // Synchronize active shift sales volume and expected revenue
      try {
        const activeShifts = await db.select().from(schema.shifts)
          .where(and(eq(schema.shifts.stationId, payload.stationId), eq(schema.shifts.status, 'ACTIVE')));
        if (activeShifts && activeShifts.length > 0) {
          const targetShift = (payload.shiftCode && activeShifts.find((s) => s.shiftCode === payload.shiftCode)) || activeShifts[0];
          await db.update(schema.shifts)
            .set({
              totalFuelSoldLiters: Number(((targetShift.totalFuelSoldLiters || 0) + netSold).toFixed(2)),
              totalExpectedRevenue: Number(((targetShift.totalExpectedRevenue || 0) + netAmount).toFixed(2)),
            })
            .where(eq(schema.shifts.id, targetShift.id));
        }
      } catch (shiftErr) {
        console.warn('[recordNozzleReading active shift update error]:', shiftErr);
      }

      await this.createAuditLog(
        'METER',
        logId,
        isCorrection ? 'METER_CORRECT' : 'METER_RECORD',
        payload.recordedBy || 'system',
        payload.recordedByName || payload.enteredBy,
        {
          nozzleId: payload.nozzleId,
          stationId: payload.stationId,
          openingMeter: payload.openingMeter,
          closingMeter: payload.closingMeter,
          netSoldLiters: netSold,
          isCorrection,
          correctionReason: payload.correctionReason,
        }
      );

      const inserted = await db.select().from(schema.manualMeterReadings).where(eq(schema.manualMeterReadings.id, logId));
      return inserted[0];
    } catch (err: any) {
      if (
        err.message.includes('Stock limit exceeded') ||
        err.message.includes('Concurrency conflict') ||
        err.message.includes('Invalid meter reading') ||
        err.message.includes('Nozzle not found') ||
        err.message.includes('Nozzle does not belong')
      ) {
        throw err;
      }
      console.warn('[DB recordNozzleReading offline fallback]:', err.message);
      return mockStore.recordMeterReading({
        stationId: payload.stationId,
        nozzleId: payload.nozzleId,
        openingElectronic: payload.openingMeter,
        closingElectronic: payload.closingMeter,
        testFuelVolumeLiters: payload.testingLiters,
        recordedBy: payload.recordedByName || payload.enteredBy,
        notes: payload.remarks,
        isCorrection: payload.isCorrection,
        correctionReason: payload.correctionReason,
        shiftCode: payload.shiftCode,
      });
    }
  },

  async getManualMeterReadings(stationId?: string, nozzleId?: string) {
    try {
      let readings = await db.select().from(schema.manualMeterReadings);
      if (stationId) {
        readings = readings.filter((r) => r.stationId === stationId);
      }
      if (nozzleId) {
        readings = readings.filter((r) => r.nozzleId === nozzleId);
      }
      return readings.sort((a, b) => new Date(b.readingTimestamp).getTime() - new Date(a.readingTimestamp).getTime());
    } catch (err: any) {
      console.warn('[DB getManualMeterReadings offline fallback]:', err.message);
      return mockStore.getMeterReadings({ stationId, nozzleId });
    }
  },

  // 6. QR Code Resolver
  async resolveQRCode(identifier: string) {
    try {
      if (!identifier?.trim()) throw new Error('QR code identifier cannot be empty.');
      const clean = identifier.trim().toUpperCase();

      const allStations = await db.select().from(schema.stations);

      // 1. Try BUNK match
      const matchedStation = allStations.find(
        (s) => s.id.toUpperCase() === clean || s.code.toUpperCase() === clean
      );
      if (matchedStation) {
        return {
          type: 'BUNK' as const,
          entity: matchedStation,
          identifier: matchedStation.code || matchedStation.id,
          name: matchedStation.name,
          stationId: matchedStation.id,
          isActive: matchedStation.status === 'ONLINE' || matchedStation.status === 'ACTIVE',
        };
      }

      // 2. Try TANK match
      const allTanks = await db.select().from(schema.tanks);
      const matchedTank = allTanks.find((t) => t.id.toUpperCase() === clean);
      if (matchedTank) {
        const parentStation = allStations.find((s) => s.id === matchedTank.stationId);
        return {
          type: 'TANK' as const,
          entity: matchedTank,
          parentStation,
          identifier: matchedTank.id,
          name: matchedTank.name || `Tank #${matchedTank.tankNumber}`,
          stationId: matchedTank.stationId,
          isActive: matchedTank.status === 'ACTIVE',
        };
      }

      // 3. Try NOZZLE match
      const allNozzles = await db.select().from(schema.nozzles);
      const matchedNozzle = allNozzles.find((n) => n.id.toUpperCase() === clean);
      if (matchedNozzle) {
        const parentStation = allStations.find((s) => s.id === matchedNozzle.stationId);
        return {
          type: 'NOZZLE' as const,
          entity: matchedNozzle,
          parentStation,
          identifier: matchedNozzle.id,
          name: matchedNozzle.name || `Nozzle #${matchedNozzle.nozzleNumber}`,
          stationId: matchedNozzle.stationId,
          isActive: matchedNozzle.status === 'ACTIVE',
        };
      }

      throw new Error(`QR code "${identifier}" was not found in the database. Please verify the QR identifier.`);
    } catch (err: any) {
      console.warn('[DB resolveQRCode offline fallback]:', err.message);
      return mockStore.resolveQRCode(identifier);
    }
  },

  // 6. Employees & Users Management
  async getEmployees(stationId?: string) {
    try {
      if (stationId) {
        return await db.select().from(schema.employees).where(eq(schema.employees.stationId, stationId));
      }
      return await db.select().from(schema.employees);
    } catch (err: any) {
      console.warn('[DB getEmployees offline fallback]:', err.message);
      return mockStore.getUsers({ stationId });
    }
  },

  async getUsers(stationId?: string, role?: string) {
    try {
      let rows = await db.select().from(schema.employees);
      if (stationId) {
        rows = rows.filter((r) => r.stationId === stationId || r.assignedBunks?.includes(stationId));
      }
      if (role) {
        rows = rows.filter((r) => r.role === role);
      }

      const stationsList = await db.select().from(schema.stations).catch(() => []);
      return rows.map((u) => {
        let bunksArr: string[] = [];
        try {
          if (u.assignedBunks?.startsWith('[')) {
            bunksArr = JSON.parse(u.assignedBunks);
          } else if (u.assignedBunks) {
            bunksArr = u.assignedBunks.split(',').map((s) => s.trim());
          } else if (u.stationId) {
            bunksArr = [u.stationId];
          }
        } catch {
          bunksArr = u.stationId ? [u.stationId] : [];
        }

        const assignedBunkDetails = stationsList
          .filter((s) => bunksArr.includes(s.id))
          .map((s) => ({ id: s.id, name: s.name, code: s.code }));

        return {
          ...u,
          assignedBunksList: bunksArr,
          assignedBunkDetails,
        };
      });
    } catch (err: any) {
      console.warn('[DB getUsers offline fallback]:', err.message);
      return mockStore.getUsers({ stationId, role });
    }
  },

  async getUser(id: string) {
    try {
      const users = await this.getUsers();
      return users.find((u) => u.id === id) || null;
    } catch (err: any) {
      console.warn('[DB getUser offline fallback]:', err.message);
      return mockStore.getUser(id);
    }
  },

  async createUser(payload: {
    name: string;
    email?: string;
    username?: string;
    role: string;
    stationId?: string;
    assignedBunks?: string[] | string;
    phone?: string;
    shiftSchedule?: string;
    status?: string;
  }) {
    try {
      if (!payload.name?.trim()) throw new Error('Full name is required.');
      if (!payload.role?.trim()) throw new Error('Role is required.');

      const emailOrUser = payload.email?.trim() || payload.username?.trim();
      if (!emailOrUser) throw new Error('Email address or username is required.');

      const allUsers = await db.select().from(schema.employees);
      if (payload.email && allUsers.some((u) => u.email?.toLowerCase() === payload.email?.toLowerCase())) {
        throw new Error(`A user with email "${payload.email}" already exists.`);
      }
      if (payload.username && allUsers.some((u) => u.username?.toLowerCase() === payload.username?.toLowerCase())) {
        throw new Error(`A user with username "${payload.username}" already exists.`);
      }

      let bunksJson = '[]';
      let primaryStationId = payload.stationId || 'st-101';
      if (Array.isArray(payload.assignedBunks)) {
        bunksJson = JSON.stringify(payload.assignedBunks);
        if (payload.assignedBunks.length > 0) primaryStationId = payload.assignedBunks[0];
      } else if (typeof payload.assignedBunks === 'string') {
        bunksJson = payload.assignedBunks;
      } else if (payload.stationId) {
        bunksJson = JSON.stringify([payload.stationId]);
      }

      const id = `emp-${Date.now().toString().slice(-6)}`;
      const cleanName = (payload.name || 'New Staff Member').trim();
      const cleanEmail = payload.email?.trim() || `${payload.username?.trim().toLowerCase() || 'user'}@petropulse.in`;
      const cleanUsername = payload.username?.trim() || payload.email?.trim().split('@')[0] || `user_${Date.now().toString().slice(-4)}`;
      const passwordHash =
        (payload as any).passwordHash ||
        hashPassword((payload as any).pin || (payload as any).password || '1234');
      const newEmp = {
        id,
        stationId: primaryStationId,
        name: cleanName,
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        role: payload.role as any,
        phone: payload.phone?.trim() || '+91 98000 00000',
        shiftSchedule: payload.shiftSchedule?.trim() || 'MORNING',
        isActive: payload.status !== 'INACTIVE',
        status: payload.status?.trim() || 'ACTIVE',
        assignedBunks: bunksJson,
        customPermissions: (payload as any).customPermissions || null,
        lastLogin: new Date(),
      };

      await db.insert(schema.employees).values(newEmp);
      return await this.getUser(id);
    } catch (err: any) {
      console.warn('[DB createUser offline fallback]:', err.message);
      return mockStore.createUser(payload);
    }
  },

  async updateUser(id: string, payload: Partial<{
    name: string;
    email: string;
    username: string;
    passwordHash: string;
    role: string;
    stationId: string;
    assignedBunks: string[] | string;
    phone: string;
    shiftSchedule: string;
    status: string;
    isActive: boolean;
    customPermissions: string;
  }>) {
    try {
      const existing = await db.select().from(schema.employees).where(eq(schema.employees.id, id));
      if (existing.length === 0) throw new Error('User not found.');

      const allUsers = await db.select().from(schema.employees);
      if (payload.email && allUsers.some((u) => u.id !== id && u.email?.toLowerCase() === payload.email?.toLowerCase())) {
        throw new Error(`Another user with email "${payload.email}" already exists.`);
      }

      const updateData: any = { ...payload };
      if ((payload as any).pin || (payload as any).password) {
        const rawPinOrPass = ((payload as any).pin || (payload as any).password).toString().trim();
        if (rawPinOrPass) {
          updateData.passwordHash = hashPassword(rawPinOrPass);
        }
      }
      delete updateData.pin;
      delete updateData.password;

      if (Array.isArray(payload.assignedBunks)) {
        updateData.assignedBunks = JSON.stringify(payload.assignedBunks);
        if (payload.assignedBunks.length > 0 && !payload.stationId) {
          updateData.stationId = payload.assignedBunks[0];
        }
      }
      if (payload.status) {
        updateData.isActive = payload.status === 'ACTIVE';
      }
      if (payload.customPermissions !== undefined) {
        updateData.customPermissions = payload.customPermissions;
      }

      await db.update(schema.employees).set(updateData).where(eq(schema.employees.id, id));
      return await this.getUser(id);
    } catch (err: any) {
      console.warn('[DB updateUser offline fallback]:', err.message);
      return mockStore.updateUser(id, payload);
    }
  },

  async updateUserStatus(id: string, status: string) {
    try {
      await db.update(schema.employees).set({
        status,
        isActive: status === 'ACTIVE',
      }).where(eq(schema.employees.id, id));
      return await this.getUser(id);
    } catch (err: any) {
      console.warn('[DB updateUserStatus offline fallback]:', err.message);
      return mockStore.updateUserStatus(id, status);
    }
  },

  async deleteUser(id: string) {
    try {
      const userShifts = await db.select().from(schema.shifts).where(eq(schema.shifts.attendantId, id));
      if (userShifts.length > 0) {
        throw new Error(
          `Cannot delete user "${id}" because they are linked to ${userShifts.length} operational shift records. Please deactivate this user instead to maintain audit trails.`
        );
      }
      await db.delete(schema.employees).where(eq(schema.employees.id, id));
      return { success: true, deletedUserId: id };
    } catch (err: any) {
      console.warn('[DB deleteUser offline fallback]:', err.message);
      return mockStore.deleteUser(id);
    }
  },

  async updateEmployee(id: string, updates: Partial<{ name: string; phone: string; shiftSchedule: string; assignedIsland: number | null; avatarUrl?: string | null }>) {
    try {
      await db.update(schema.employees)
        .set(updates)
        .where(eq(schema.employees.id, id));
      const rows = await db.select().from(schema.employees).where(eq(schema.employees.id, id));
      return rows[0] || null;
    } catch (err: any) {
      console.warn('[DB updateEmployee offline fallback]:', err.message);
      return mockStore.updateUser(id, updates);
    }
  },

  async updateStationContact(stationId: string, updates: { managerName?: string; phone?: string }) {
    try {
      await db.update(schema.stations)
        .set(updates)
        .where(eq(schema.stations.id, stationId));
      const rows = await db.select().from(schema.stations).where(eq(schema.stations.id, stationId));
      return rows[0] || null;
    } catch (err: any) {
      console.warn('[DB updateStationContact offline fallback]:', err.message);
      return mockStore.updateStation(stationId, updates);
    }
  },

  // Authentication & Security Management
  async login(usernameOrEmail: string, password: string) {
    if (!usernameOrEmail?.trim() || !password) {
      throw new Error('Please provide both username/email/mobile and password/PIN.');
    }
    const clean = usernameOrEmail.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');
    const isPhoneMatch = (uPhone?: string | null) => {
      if (!uPhone) return false;
      const uDigits = uPhone.replace(/\D/g, '');
      if (!uDigits || !cleanDigits) return false;
      return (
        uDigits === cleanDigits ||
        (cleanDigits.length >= 7 && uDigits.endsWith(cleanDigits)) ||
        (uDigits.length >= 7 && cleanDigits.endsWith(uDigits))
      );
    };

    let allEmps: any[] = [];
    try {
      allEmps = await db.select().from(schema.employees);
    } catch (dbErr: any) {
      console.warn('[DB Query on Login]:', dbErr.message);
    }

    let user = allEmps.find(
      (u) =>
        u.username?.toLowerCase() === clean ||
        u.email?.toLowerCase() === clean ||
        u.name?.toLowerCase() === clean ||
        isPhoneMatch(u.phone) ||
        (u.phone && u.phone.replace(/[\s+-]/g, '') === clean.replace(/[\s+-]/g, '')) ||
        (u.email && u.email.toLowerCase().split('@')[0] === clean) ||
        (u.username && u.username.toLowerCase().split(' ')[0] === clean) ||
        (clean === 'askar' && (u.username?.toLowerCase().includes('askar') || u.name?.toLowerCase().includes('askar') || u.email?.toLowerCase().includes('askar')))
    );

    // Fallback to pre-configured demo users if DB is unseeded or offline
    if (!user) {
      user = DEFAULT_DEMO_USERS.find(
        (u) =>
          u.username.toLowerCase() === clean ||
          u.email.toLowerCase() === clean ||
          u.name?.toLowerCase() === clean ||
          isPhoneMatch(u.phone) ||
          (u.phone && u.phone.replace(/[\s+-]/g, '') === clean.replace(/[\s+-]/g, '')) ||
          u.email.toLowerCase().split('@')[0] === clean
      );
    }

    if (!user) {
      throw new Error('Invalid credentials. Please verify your username/email and password.');
    }

    if (!user.isActive || user.status === 'INACTIVE') {
      throw new Error('This account has been deactivated. Please contact your station administrator.');
    }

    const cleanPassword = (password || '').trim();
    const isValid = verifyPassword(cleanPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials. Please verify your username/email and password.');
    }

    const now = new Date();
    // Save hash if user exists in DB and password was unhashed default or temporary
    try {
      if (!user.passwordHash || !user.passwordHash.includes(':')) {
        const newHash = hashPassword(cleanPassword);
        await db.update(schema.employees).set({ passwordHash: newHash }).where(eq(schema.employees.id, user.id));
      }
      await db.update(schema.employees).set({ lastLogin: now }).where(eq(schema.employees.id, user.id));
    } catch {
      // Ignored if offline
    }

    let bunksArr: string[] = [];
    try {
      if (user.assignedBunks?.startsWith('[')) {
        bunksArr = JSON.parse(user.assignedBunks);
      } else if (user.assignedBunks) {
        bunksArr = user.assignedBunks.split(',').map((s: string) => s.trim());
      } else if (user.stationId) {
        bunksArr = [user.stationId];
      }
    } catch {
      bunksArr = user.stationId ? [user.stationId] : [];
    }

    const token = `pp_${user.id}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || '',
        username: user.username || '',
        role: user.role,
        phone: user.phone,
        stationId: user.stationId,
        assignedBunks: bunksArr,
        status: user.status || 'ACTIVE',
        isActive: user.isActive,
        shiftSchedule: user.shiftSchedule,
        lastLogin: now.toISOString(),
      },
    };
  },

  async forgotPassword(email: string) {
    if (!email?.trim()) throw new Error('Email address is required.');
    const clean = email.trim().toLowerCase();
    const allEmps = await db.select().from(schema.employees);
    const user = allEmps.find((u) => u.email?.toLowerCase() === clean);

    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email address, password reset instructions have been dispatched.',
      };
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.update(schema.employees)
      .set({
        resetToken: token,
        resetTokenExpiry: expiry,
      })
      .where(eq(schema.employees.id, user.id));

    return {
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been dispatched.',
      resetToken: token,
    };
  },

  async resetPassword(token: string, newPass: string) {
    if (!token?.trim()) throw new Error('Reset token is required.');
    if (!newPass || newPass.length < 6) throw new Error('New password must be at least 6 characters.');

    const allEmps = await db.select().from(schema.employees);
    const user = allEmps.find((u) => u.resetToken === token.trim());

    if (!user) {
      throw new Error('Password reset token is invalid or has already been used.');
    }

    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
      throw new Error('Password reset token has expired. Please request a new link.');
    }

    const newHash = hashPassword(newPass);
    await db.update(schema.employees)
      .set({
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(schema.employees.id, user.id));

    return {
      success: true,
      message: 'Password successfully updated. You may now log in with your new credentials.',
    };
  },

  async changePassword(userId: string, currentPass: string, newPass: string) {
    if (!currentPass) throw new Error('Current password is required.');
    if (!newPass || newPass.length < 6) throw new Error('New password must be at least 6 characters.');
    const rows = await db.select().from(schema.employees).where(eq(schema.employees.id, userId));
    const user = rows[0];
    if (!user) throw new Error('User not found.');

    const isCurrentValid = verifyPassword(currentPass, user.passwordHash);
    if (!isCurrentValid) {
      throw new Error('Current password entered is incorrect.');
    }

    const newHash = hashPassword(newPass);
    await db.update(schema.employees)
      .set({ passwordHash: newHash })
      .where(eq(schema.employees.id, userId));

    return { success: true, message: 'Password updated successfully.' };
  },

  async getAuthUserById(userId: string) {
    let user: any = null;
    try {
      const rows = await db.select().from(schema.employees).where(eq(schema.employees.id, userId));
      user = rows[0];
    } catch {
      // Ignored if offline
    }
    if (!user) {
      user = DEFAULT_DEMO_USERS.find((u) => u.id === userId);
    }
    if (!user) return null;

    let bunksArr: string[] = [];
    try {
      if (user.assignedBunks?.startsWith('[')) {
        bunksArr = JSON.parse(user.assignedBunks);
      } else if (user.assignedBunks) {
        bunksArr = user.assignedBunks.split(',').map((s: string) => s.trim());
      } else if (user.stationId) {
        bunksArr = [user.stationId];
      }
    } catch {
      bunksArr = user.stationId ? [user.stationId] : [];
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email || '',
      username: user.username || '',
      role: user.role,
      phone: user.phone,
      stationId: user.stationId,
      assignedBunks: bunksArr,
      status: user.status || 'ACTIVE',
      isActive: user.isActive,
      shiftSchedule: user.shiftSchedule,
      lastLogin: user.lastLogin?.toISOString(),
    };
  },

  // 7. Shifts
  async getShifts(stationId?: string) {
    try {
      let rawShifts;
      if (stationId) {
        rawShifts = await db.select().from(schema.shifts)
          .where(eq(schema.shifts.stationId, stationId))
          .orderBy(desc(schema.shifts.startTime));
      } else {
        rawShifts = await db.select().from(schema.shifts).orderBy(desc(schema.shifts.startTime));
      }

      const allDisps = await db.select().from(schema.dispensers).catch(() => []);
      const allNozs = await db.select().from(schema.nozzles).catch(() => []);

      return rawShifts.map((s) => {
        let nr: any[] = [];
        let cashFloat = 0;
        if (s.notes?.startsWith('{')) {
          try {
            const parsed = JSON.parse(s.notes);
            if (Array.isArray(parsed.nozzleReadings)) nr = parsed.nozzleReadings;
            if (typeof parsed.openingCashFloat === 'number') cashFloat = parsed.openingCashFloat;
          } catch {}
        }
        if (nr.length === 0) {
          const islandDisps = allDisps.filter(
            (d) => d.stationId === s.stationId && d.islandNumber === s.islandNumber
          );
          const islandNozs = allNozs.filter(
            (n) => islandDisps.some((d) => d.id === n.dispenserId) || (islandDisps.length === 0 && n.stationId === s.stationId)
          );
          nr = islandNozs.map((n) => ({
            nozzleId: n.id,
            fuelCode: n.fuelCode,
            startMeter: n.electronicTotalizer || 0,
            openingElectronic: n.electronicTotalizer || 0,
          }));
        }
        return {
          ...s,
          openingCashFloat: cashFloat,
          nozzleReadings: nr,
        };
      });
    } catch (err: any) {
      console.warn('[DB getShifts offline fallback]:', err.message);
      return mockStore.getShifts(stationId);
    }
  },

  async createShift(payload: {
    stationId: string;
    attendantId: string;
    islandNumber: number;
    shiftCode: string;
    attendantName?: string;
    openingCashFloat?: number;
    nozzleReadings?: any[];
  }) {
    try {
      const empRows = await db.select().from(schema.employees).where(eq(schema.employees.id, payload.attendantId));
      const emp = empRows[0];
      const attendantName = emp ? emp.name : (payload.attendantName || 'Attendant');
      const id = `shf-${Date.now()}`;

      await db.insert(schema.shifts).values({
        id,
        stationId: payload.stationId,
        shiftCode: payload.shiftCode || `SHIFT-${Date.now().toString().slice(-5)}`,
        attendantId: payload.attendantId,
        attendantName,
        islandNumber: payload.islandNumber,
        startTime: new Date(),
        status: 'ACTIVE',
        totalFuelSoldLiters: 0,
        totalExpectedRevenue: 0,
        cashSubmitted: 0,
        digitalSubmitted: 0,
        creditSubmitted: 0,
        totalCollected: 0,
        shortageExcess: 0,
        notes: JSON.stringify({
          nozzleReadings: payload.nozzleReadings || [],
          openingCashFloat: payload.openingCashFloat || 0,
        }),
      });

      const list = await this.getShifts(payload.stationId);
      return (
        list.find((s) => s.id === id) || {
          id,
          stationId: payload.stationId,
          shiftCode: payload.shiftCode,
          attendantId: payload.attendantId,
          attendantName,
          islandNumber: payload.islandNumber,
          startTime: new Date(),
          status: 'ACTIVE',
          totalFuelSoldLiters: 0,
          totalExpectedRevenue: 0,
          cashSubmitted: 0,
          digitalSubmitted: 0,
          creditSubmitted: 0,
          totalCollected: 0,
          shortageExcess: 0,
          nozzleReadings: payload.nozzleReadings || [],
          openingCashFloat: payload.openingCashFloat || 0,
        }
      );
    } catch (err: any) {
      console.warn('[DB createShift offline fallback]:', err.message);
      return mockStore.createShift(payload);
    }
  },

  async closeShift(shiftId: string, payload: {
    totalFuelSoldLiters: number;
    totalExpectedRevenue: number;
    cashSubmitted: number;
    digitalSubmitted: number;
    creditSubmitted: number;
    denominationsJson?: string;
    notes?: string;
    managerSignOff?: string;
    closingPhotoUrl?: string;
  }) {
    try {
      const totalCollected = payload.cashSubmitted + payload.digitalSubmitted + payload.creditSubmitted;
      const variance = Number((totalCollected - payload.totalExpectedRevenue).toFixed(2));

      await db.update(schema.shifts)
        .set({
          endTime: new Date(),
          status: 'SETTLED',
          totalFuelSoldLiters: payload.totalFuelSoldLiters,
          totalExpectedRevenue: payload.totalExpectedRevenue,
          cashSubmitted: payload.cashSubmitted,
          digitalSubmitted: payload.digitalSubmitted,
          creditSubmitted: payload.creditSubmitted,
          totalCollected,
          shortageExcess: variance,
          denominationsJson: payload.denominationsJson,
          notes: payload.notes,
          managerSignOff: payload.managerSignOff || 'Manager Certified',
          closingPhotoUrl: payload.closingPhotoUrl || (payload as any).photoUrl || null,
        })
        .where(eq(schema.shifts.id, shiftId));

      // Synchronize closing nozzle meter readings with nozzle totalizers
      if (Array.isArray((payload as any).nozzleReadings)) {
        for (const nr of (payload as any).nozzleReadings) {
          if (nr.nozzleId && typeof nr.endMeter === 'number') {
            await db.update(schema.nozzles)
              .set({
                electronicTotalizer: nr.endMeter,
                mechanicalTotalizer: nr.endMeter,
                updatedAt: new Date(),
              })
              .where(eq(schema.nozzles.id, nr.nozzleId));
          }
        }
      }

      const updated = await db.select().from(schema.shifts).where(eq(schema.shifts.id, shiftId));
      return updated[0];
    } catch (err: any) {
      console.warn('[DB closeShift offline fallback]:', err.message);
      return mockStore.closeShift(shiftId, payload);
    }
  },

  // 8. Role Permissions (Customizable CRUD Matrix)
  async getRolePermissions() {
    try {
      const perms = await db.select().from(schema.rolePermissions);
      if (perms && perms.length > 0) return perms;
    } catch (err: any) {
      console.warn('[DB getRolePermissions offline fallback]:', err.message);
    }
    return mockStore.getRolePermissions();
  },

  async updateRolePermission(id: string, perms: { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }) {
    try {
      await db.update(schema.rolePermissions)
        .set({
          canCreate: perms.canCreate,
          canRead: perms.canRead,
          canUpdate: perms.canUpdate,
          canDelete: perms.canDelete,
        })
        .where(eq(schema.rolePermissions.id, id));
      return await this.getRolePermissions();
    } catch (err: any) {
      console.warn('[DB updateRolePermission offline fallback]:', err.message);
      return mockStore.updateRolePermission(id, perms);
    }
  },

  async checkPrivilege(role: string, module: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE', userId?: string): Promise<boolean> {
    if (role === 'OWNER') return true; // Super admin master bypass

    if (userId) {
      try {
        const user = await this.getUser(userId);
        if (user && (user as any).customPermissions) {
          const custom = JSON.parse((user as any).customPermissions);
          if (custom && custom[module]) {
            const modPerm = custom[module];
            if (action === 'CREATE') return Boolean(modPerm.canCreate);
            if (action === 'READ') return Boolean(modPerm.canRead);
            if (action === 'UPDATE') return Boolean(modPerm.canUpdate);
            if (action === 'DELETE') return Boolean(modPerm.canDelete);
          }
        }
      } catch {
        // Fall back to role permissions
      }
    }

    try {
      const rows = await db.select().from(schema.rolePermissions)
        .where(and(eq(schema.rolePermissions.role, role), eq(schema.rolePermissions.module, module)));
      const perm = rows[0];
      if (perm) {
        if (action === 'CREATE') return perm.canCreate;
        if (action === 'READ') return perm.canRead;
        if (action === 'UPDATE') return perm.canUpdate;
        if (action === 'DELETE') return perm.canDelete;
      }
    } catch (err: any) {
      console.warn('[DB checkPrivilege offline fallback]:', err.message);
    }
    return mockStore.checkPrivilege(role, module, action, userId);
  },

  // 9. Timezone-based EOD Day Close Scheduler
  async getEODSettlements(stationId?: string) {
    try {
      if (stationId) {
        return await db.select().from(schema.eodSettlements)
          .where(eq(schema.eodSettlements.stationId, stationId))
          .orderBy(desc(schema.eodSettlements.actualCloseTimestamp));
      }
      return await db.select().from(schema.eodSettlements)
        .orderBy(desc(schema.eodSettlements.actualCloseTimestamp));
    } catch (err: any) {
      console.warn('[DB getEODSettlements offline fallback]:', err.message);
      return mockStore.getEODSettlements(stationId);
    }
  },

  async runEODClose(payload: {
    stationId: string;
    settlementDate: string;
    timezone: string;
    closedBy: string;
    auditorNotes?: string;
  }) {
    try {
      // Aggregate all meter readings for this station
      const readings = await this.getManualMeterReadings(payload.stationId);
      const totalVolume = readings.reduce((s, r) => s + r.netSoldLiters, 0);
      const totalRevenue = readings.reduce((s, r) => s + r.netSalesAmount, 0);

      const cash = Math.round(totalRevenue * 0.55);
      const digital = Math.round(totalRevenue * 0.35);
      const credit = Math.round(totalRevenue * 0.10);
      const deposits = cash + digital + credit;
      const diff = Number((deposits - totalRevenue).toFixed(2));

      const id = `eod-${payload.stationId}-${payload.settlementDate}`;

      // Upsert EOD record
      const existing = await db.select().from(schema.eodSettlements).where(eq(schema.eodSettlements.id, id));
      if (existing.length > 0) {
        await db.update(schema.eodSettlements).set({
          actualCloseTimestamp: new Date(),
          totalVolumeSold: totalVolume,
          totalGrossRevenue: totalRevenue,
          totalCash: cash,
          totalDigital: digital,
          totalCredit: credit,
          actualDeposits: deposits,
          settlementDifference: diff,
          closedBy: payload.closedBy,
          auditorNotes: payload.auditorNotes || 'Day successfully closed via scheduler.',
        }).where(eq(schema.eodSettlements.id, id));
      } else {
        await db.insert(schema.eodSettlements).values({
          id,
          stationId: payload.stationId,
          settlementDate: payload.settlementDate,
          timezone: payload.timezone,
          scheduledCloseTime: '23:59',
          actualCloseTimestamp: new Date(),
          status: 'AUDITED_CLOSED',
          totalVolumeSold: totalVolume,
          totalGrossRevenue: totalRevenue,
          totalCash: cash,
          totalDigital: digital,
          totalCredit: credit,
          actualDeposits: deposits,
          settlementDifference: diff,
          isAutoClosed: true,
          closedBy: payload.closedBy,
          auditorNotes: payload.auditorNotes || 'Scheduled EOD Day Close executed cleanly.',
        });
      }

      const created = await db.select().from(schema.eodSettlements).where(eq(schema.eodSettlements.id, id));
      return created[0];
    } catch (err: any) {
      console.warn('[DB runEODClose offline fallback]:', err.message);
      return mockStore.runEODClose(payload);
    }
  },

  async getDailySalesReport(stationId: string, date: string) {
    try {
      return mockStore.getDailySalesReport(stationId, date);
    } catch (err: any) {
      console.warn('[DB getDailySalesReport fallback]:', err.message);
      return mockStore.getDailySalesReport(stationId, date);
    }
  },
};


