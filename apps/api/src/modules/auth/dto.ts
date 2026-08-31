import {
  authUserSchema,
  loginSchema,
  messageResponseSchema,
  registerSchema,
} from '@expence/contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterBodyDto extends createZodDto(registerSchema) {}
export class LoginBodyDto extends createZodDto(loginSchema) {}
export class AuthUserResponseDto extends createZodDto(authUserSchema) {}
export class MessageResponseDto extends createZodDto(messageResponseSchema) {}
