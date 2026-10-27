import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';

export const nozzleController = {
  getDispensers: async (req: Request, res: Response) => {
    try {
      const stationId = req.query.stationId as string | undefined;
      const dispensers = await dbService.getDispensers(stationId);
      res.json(dispensers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getNozzles: async (req: Request, res: Response) => {
    try {
      const { stationId, fuelCode, status } = req.query;
      const nozzles = await dbService.getNozzles({
        stationId: stationId as string,
        fuelCode: fuelCode as string,
        status: status as string,
      });
      res.json(nozzles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getNextNozzleCode: async (_req: Request, res: Response) => {
    try {
      const nextCode = await dbService.getNextNozzleCode();
      res.json({ nextCode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getNozzle: async (req: Request, res: Response) => {
    try {
      const nozzle = await dbService.getNozzle(req.params.id);
      if (!nozzle) return res.status(404).json({ error: 'Nozzle not found' });
      res.json(nozzle);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createNozzle: async (req: Request, res: Response) => {
    try {
      const nozzle = await dbService.createNozzle(req.body);
      res.status(201).json(nozzle);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  updateNozzle: async (req: Request, res: Response) => {
    try {
      const updated = await dbService.updateNozzle(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: 'Status is required' });
      const updated = await dbService.updateNozzleStatus(req.params.id, status);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteNozzle: async (req: Request, res: Response) => {
    try {
      const result = await dbService.deleteNozzle(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  getNextReadingCode: async (_req: Request, res: Response) => {
    try {
      const nextCode = await dbService.getNextReadingCode();
      res.json({ nextCode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getMeterReadings: async (req: Request, res: Response) => {
    try {
      const { stationId, nozzleId } = req.query;
      const readings = await dbService.getManualMeterReadings(stationId as string, nozzleId as string);
      res.json(readings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  recordReading: async (req: Request, res: Response) => {
    try {
      const {
        stationId,
        nozzleId,
        openingMeter,
        closingMeter,
        testingLiters,
        readingType,
        isCorrection,
        correctionReason,
        remarks,
        enteredBy,
        shiftCode,
        recordedBy,
        recordedByName,
      } = req.body;

      const parsedOpening = typeof openingMeter === 'number'
        ? openingMeter
        : (typeof req.body.openingReading === 'number'
            ? req.body.openingReading
            : (typeof req.body.openingElectronic === 'number'
                ? req.body.openingElectronic
                : parseFloat(openingMeter ?? req.body.openingReading ?? req.body.openingElectronic)));

      const parsedClosing = typeof closingMeter === 'number'
        ? closingMeter
        : (typeof req.body.closingReading === 'number'
            ? req.body.closingReading
            : (typeof req.body.closingElectronic === 'number'
                ? req.body.closingElectronic
                : parseFloat(closingMeter ?? req.body.closingReading ?? req.body.closingElectronic)));

      if (isNaN(parsedOpening) || isNaN(parsedClosing)) {
        return res.status(400).json({ error: 'Opening and closing meter numbers are required' });
      }

      const photo = req.body.meterPhotoUrl || req.body.photoUrl;
      if (!photo || typeof photo !== 'string' || !photo.trim()) {
        return res.status(400).json({
          error: 'Meter totalizer photograph is strictly mandatory for legal metrology and audit compliance.',
        });
      }

      const authUser = (req as any).user;
      const trustedName = authUser?.name || (req.headers['x-user-name'] as string) || enteredBy || recordedByName || 'Forecourt Attendant';
      const trustedRole = authUser?.role || (req.headers['x-user-role'] as string) || recordedBy || 'ATTENDANT';

      const reading = await dbService.recordNozzleReading({
        stationId,
        nozzleId,
        openingMeter: parsedOpening,
        closingMeter: parsedClosing,
        testingLiters: Number(testingLiters) || 0,
        readingType,
        isCorrection,
        correctionReason,
        remarks,
        enteredBy: trustedName,
        shiftCode,
        recordedBy: trustedRole,
        recordedByName: trustedName,
        meterPhotoUrl: photo.trim(),
      });
      res.status(201).json(reading);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
