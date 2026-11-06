import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '@mal/shared';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const result = await AuthService.register(req.body as RegisterInput);
    res.status(201).json({ data: result });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const result = await AuthService.login(req.body as LoginInput);
    res.json({ data: result });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const result = await AuthService.getProfile(req.user!.id);
    res.json({ data: result });
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    const result = await AuthService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    res.json({ data: result });
  }

  static async demoUsers(_req: Request, res: Response): Promise<void> {
    const result = await AuthService.getDemoUsers();
    res.json({ data: result });
  }
}
