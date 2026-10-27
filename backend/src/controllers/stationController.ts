import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';
import { validateBunkForm } from '../utils/validation.ts';

export const stationController = {
  getStations: async (req: Request, res: Response) => {
    try {
      let stations = await dbService.getStations();
      const user = (req as any).user;
      if (user && user.role !== 'OWNER' && user.role !== 'AUDITOR') {
        const userRec = user.id ? await dbService.getUser(user.id).catch(() => null) : null;
        if (userRec?.stationId) {
          stations = stations.filter((s) => s.id === userRec.stationId);
        }
      }
      const { status, search } = req.query;

      if (status && typeof status === 'string') {
        const cleanStatus = status.toUpperCase();
        if (cleanStatus === 'ACTIVE') {
          stations = stations.filter((s) => s.status === 'ONLINE' || s.status === 'ACTIVE');
        } else if (cleanStatus === 'INACTIVE') {
          stations = stations.filter((s) => s.status === 'INACTIVE' || s.status === 'OFFLINE');
        } else {
          stations = stations.filter((s) => s.status?.toUpperCase() === cleanStatus);
        }
      }

      if (search && typeof search === 'string') {
        const term = search.toLowerCase();
        stations = stations.filter(
          (s) =>
            s.name?.toLowerCase().includes(term) ||
            s.code?.toLowerCase().includes(term) ||
            s.location?.toLowerCase().includes(term) ||
            s.managerName?.toLowerCase().includes(term)
        );
      }

      res.json(stations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getNextBunkCode: async (_req: Request, res: Response) => {
    try {
      const nextCode = await dbService.peekNextBunkCode();
      res.json({ code: nextCode, nextCode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getStation: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user && user.role !== 'OWNER' && user.role !== 'AUDITOR') {
        const userRec = user.id ? await dbService.getUser(user.id).catch(() => null) : null;
        if (userRec?.stationId && userRec.stationId !== req.params.id) {
          return res.status(403).json({ error: 'Access denied: You are not authorized to view this station.' });
        }
      }
      const station = await dbService.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: 'Bunk not found' });
      res.json(station);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createStation: async (req: Request, res: Response) => {
    try {
      const validation = validateBunkForm(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors,
        });
      }

      const actorId = (req as any).user?.id || 'system';
      const actorName = (req as any).user?.name || 'Administrator';
      const station = await dbService.createStation(req.body, actorId, actorName);
      res.status(201).json(station);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  updateStation: async (req: Request, res: Response) => {
    try {
      if (req.body.name !== undefined) {
        if (!req.body.name || !req.body.name.trim()) {
          return res.status(400).json({
            error: 'Validation failed',
            errors: { name: 'Bunk name is required.' },
          });
        }
        if (req.body.name.trim().length < 3) {
          return res.status(400).json({
            error: 'Validation failed',
            errors: { name: 'Bunk name must be at least 3 characters.' },
          });
        }
      }

      const validation = validateBunkForm({
        name: req.body.name || 'Valid Default',
        ...req.body,
      });

      if (!validation.isValid) {
        const errors = { ...validation.errors };
        if (req.body.name === undefined) delete errors.name;
        if (Object.keys(errors).length > 0) {
          return res.status(400).json({ error: 'Validation failed', errors });
        }
      }

      const actorId = (req as any).user?.id || 'system';
      const actorName = (req as any).user?.name || 'Administrator';
      const updated = await dbService.updateStation(req.params.id, req.body, actorId, actorName);
      res.json(updated);
    } catch (err: any) {
      if (err.message === 'Bunk not found.') {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  },

  deactivateStation: async (req: Request, res: Response) => {
    try {
      const actorId = (req as any).user?.id || 'system';
      const actorName = (req as any).user?.name || 'Administrator';
      const updated = await dbService.deactivateStation(req.params.id, actorId, actorName);
      res.json(updated);
    } catch (err: any) {
      if (err.message === 'Bunk not found.') {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  },

  deleteStation: async (req: Request, res: Response) => {
    try {
      const actorId = (req as any).user?.id || 'system';
      const actorName = (req as any).user?.name || 'Administrator';
      const result = await dbService.deleteStation(req.params.id, actorId, actorName);
      res.json(result);
    } catch (err: any) {
      if (err.message === 'Bunk not found.') {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  },
};
