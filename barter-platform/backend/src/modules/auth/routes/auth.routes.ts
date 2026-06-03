import { Router } from 'express';
import { validate } from '../validators/auth.validator';
import {
  RegisterDtoSchema,
  VerifyOtpDtoSchema,
  CreatePasswordDtoSchema,
  LoginDtoSchema,
  RefreshTokenDtoSchema,
  ResendOtpDtoSchema
} from '../dto/auth.dto';
import {
  register,
  verifyOtp,
  createPassword,
  login,
  refresh,
  logout,
  resendOtp,
  getMe
} from '../controllers/auth.controller';
import { authenticate } from '@shared/middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', validate(RegisterDtoSchema), register);
router.post('/verify-otp', validate(VerifyOtpDtoSchema), verifyOtp);
router.post('/create-password', validate(CreatePasswordDtoSchema), createPassword);
router.post('/login', validate(LoginDtoSchema), login);
router.post('/refresh', validate(RefreshTokenDtoSchema), refresh);
router.post('/resend-otp', validate(ResendOtpDtoSchema), resendOtp);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;