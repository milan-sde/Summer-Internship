import { Router } from 'express';
import { validate } from '../validators/auth.validator';
import {
  RegisterDtoSchema,
  VerifyOtpDtoSchema,
  CreatePasswordDtoSchema,
  LoginDtoSchema,
  RefreshTokenDtoSchema,
  ResendOtpDtoSchema,
  ForgotPasswordDtoSchema,
  ResetPasswordDtoSchema,
} from '../dto/auth.dto';
import {
  register,
  verifyOtp,
  createPassword,
  login,
  refresh,
  logout,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.controller';
import { authenticate } from '@shared/middlewares/auth.middleware';
import { authLimiter } from '@shared/middlewares/rate-limiter';

const router = Router();

// Public routes (with rate limiting for sensitive operations)
router.post('/register', authLimiter, validate(RegisterDtoSchema), register);
router.post('/verify-otp', authLimiter, validate(VerifyOtpDtoSchema), verifyOtp);
router.post('/create-password', validate(CreatePasswordDtoSchema), createPassword);
router.post('/login', authLimiter, validate(LoginDtoSchema), login);
router.post('/refresh', validate(RefreshTokenDtoSchema), refresh);
router.post('/resend-otp', authLimiter, validate(ResendOtpDtoSchema), resendOtp);
router.post('/forgot-password', authLimiter, validate(ForgotPasswordDtoSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(ResetPasswordDtoSchema), resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
