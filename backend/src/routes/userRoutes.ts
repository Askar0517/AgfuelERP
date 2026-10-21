import { Router } from 'express';
import { userController } from '../controllers/userController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';

const router = Router();

router.get('/employees', verifyPrivilege('ROSTER', 'READ'), userController.getEmployees);
router.get('/', verifyPrivilege('ROSTER', 'READ'), userController.getUsers);
router.get('/:id', verifyPrivilege('ROSTER', 'READ'), userController.getUser);
router.post('/', verifyPrivilege('ROSTER', 'CREATE'), userController.createUser);
router.put('/:id', verifyPrivilege('ROSTER', 'UPDATE'), userController.updateUser);
router.post('/:id/status', verifyPrivilege('ROSTER', 'UPDATE'), userController.updateStatus);
router.post('/:id/send-credentials', verifyPrivilege('ROSTER', 'UPDATE'), userController.sendCredentials);
router.delete('/:id', verifyPrivilege('ROSTER', 'DELETE'), userController.deleteUser);

export default router;
