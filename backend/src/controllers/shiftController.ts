import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';

export const shiftController = {
  getShifts: async (req: Request, res: Response) => {
    try {
      const stationId = req.query.stationId as string | undefined;
      const shifts = await dbService.getShifts(stationId);
      res.json(shifts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createShift: async (req: Request, res: Response) => {
    try {
      const shift = await dbService.createShift(req.body);
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  closeShift: async (req: Request, res: Response) => {
    try {
      const closed = await dbService.closeShift(req.params.id, req.body);
      res.json(closed);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  getEODSettlements: async (req: Request, res: Response) => {
    try {
      const stationId = req.query.stationId as string | undefined;
      const eod = await dbService.getEODSettlements(stationId);
      res.json(eod);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  runEODClose: async (req: Request, res: Response) => {
    try {
      const result = await dbService.runEODClose(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  getDailySalesReport: async (req: Request, res: Response) => {
    try {
      const stationId = (req.query.stationId as string) || 'st-101';
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const dsr = await dbService.getDailySalesReport(stationId, date);
      res.json(dsr);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
