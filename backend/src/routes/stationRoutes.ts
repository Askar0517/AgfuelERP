import { Router } from 'express';
import { stationController } from '../controllers/stationController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';

const router = Router();

router.get('/', verifyPrivilege('BUNKS', 'READ'), stationController.getStations);
router.get('/next-code', verifyPrivilege('BUNKS', 'READ'), stationController.getNextBunkCode);
router.get('/:id', verifyPrivilege('BUNKS', 'READ'), stationController.getStation);
router.post('/', verifyPrivilege('BUNKS', 'CREATE'), stationController.createStation);
router.put('/:id', verifyPrivilege('BUNKS', 'UPDATE'), stationController.updateStation);
router.post('/:id/deactivate', verifyPrivilege('BUNKS', 'UPDATE'), stationController.deactivateStation);
router.delete('/:id', verifyPrivilege('BUNKS', 'DELETE'), stationController.deleteStation);

export default router;
