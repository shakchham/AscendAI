import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { supabase } from "../lib/supabase";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing Bearer token" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: data.user.id } });
  const role = (dbUser?.role ?? "student") as UserRole;

  req.authUser = {
    id: data.user.id,
    email: data.user.email,
    phone: data.user.phone,
    role,
  };
  return next();
};
