import { PrismaClient } from "@prisma/client";

// Único PrismaClient da aplicação. Model só fala com o banco por aqui.
export const prisma = new PrismaClient();
