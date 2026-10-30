import { Router } from 'express';
import { authController } from '../controllers/authController.ts';

const router = Router();

// Informative GET endpoints so browser requests don't return 404
router.get('/', (_req, res) => {
  res.status(200).json({
    service: 'PetroPulse Authentication API',
    status: 'online',
    endpoints: {
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      me: 'GET /api/auth/me',
      forgotPassword: 'POST /api/auth/forgot-password',
      resetPassword: 'POST /api/auth/reset-password',
      changePassword: 'POST /api/auth/change-password',
    },
  });
});

router.get('/login', (_req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Auth login endpoint is active.',
    instruction: 'Send an HTTP POST request with JSON body { usernameOrEmail, password } to authenticate.',
    method: 'POST',
    path: '/api/auth/login',
  });
});

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authController.changePassword);

export default router;
