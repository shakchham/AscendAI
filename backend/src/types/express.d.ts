import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email?: string;
        phone?: string;
        role: UserRole;
      };
    }
  }
}

export {};
