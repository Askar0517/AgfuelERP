import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';

export const pricingController = {
  getFuels: async (req: Request, res: Response) => {
    try {
      const stationId = (req.query.stationId as string) || undefined;
      const fuels = await dbService.getFuels(stationId);
      res.json(fuels);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateFuelRate: async (req: Request, res: Response) => {
    try {
      const { rate, stationId, remarks } = req.body;
      if (typeof rate !== 'number' || rate <= 0) {
        return res.status(400).json({ error: 'Valid positive rate number required' });
      }
      const user = (req as any).user;
      const actorId = user?.id || 'SYSTEM';
      const actorName = user?.name || 'Forecourt Manager';
      const updated = await dbService.updateFuelRate(
        req.params.code,
        rate,
        stationId,
        actorId,
        actorName,
        remarks
      );
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  resetFuelRate: async (req: Request, res: Response) => {
    try {
      const { stationId } = req.body;
      if (!stationId) {
        return res.status(400).json({ error: 'stationId is required to reset station price override' });
      }
      const user = (req as any).user;
      const actorId = user?.id || 'SYSTEM';
      const actorName = user?.name || 'Forecourt Manager';
      const updated = await dbService.resetStationFuelRate(
        req.params.code,
        stationId,
        actorId,
        actorName
      );
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
