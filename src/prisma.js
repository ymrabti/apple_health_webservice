const { PrismaClient } = require('@prisma/client');

/**
 * Singleton Prisma Client
 */
const prisma = new PrismaClient();

module.exports = { prisma };