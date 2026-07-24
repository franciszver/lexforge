// Repository for the AuditLog aggregate.

export async function createAuditLog(prisma, data) {
  return prisma.auditLog.create({
    data: {
      timestamp: data.timestamp ?? new Date(),
      ...data,
    },
  });
}

export async function listAuditLogsByUser(prisma, userId, { limit } = {}) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

export async function listAuditLogsByEventType(prisma, eventType, { limit } = {}) {
  return prisma.auditLog.findMany({
    where: { eventType },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

export async function listAuditLogsByResource(prisma, resourceId, { limit } = {}) {
  return prisma.auditLog.findMany({
    where: { resourceId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

export async function listAuditLogs(prisma, { limit } = {}) {
  return prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}
