import { Router } from 'express';
import { nozzleController } from '../controllers/nozzleController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';

const router = Router();

router.get('/', verifyPrivilege('METERS', 'READ'), nozzleController.getNozzles);
router.get('/next-code', verifyPrivilege('METERS', 'READ'), nozzleController.getNextNozzleCode);
router.get('/:id', verifyPrivilege('METERS', 'READ'), nozzleController.getNozzle);
router.post('/', verifyPrivilege('METERS', 'CREATE'), nozzleController.createNozzle);
router.put('/:id', verifyPrivilege('METERS', 'UPDATE'), nozzleController.updateNozzle);
router.post('/:id/status', verifyPrivilege('METERS', 'UPDATE'), nozzleController.updateStatus);
router.delete('/:id', verifyPrivilege('METERS', 'DELETE'), nozzleController.deleteNozzle);

export default router;
