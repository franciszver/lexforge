// Repository for the Template aggregate.

export async function createTemplate(prisma, data) {
  return prisma.template.create({
    data: {
      ...data,
      version: data.version ?? 1,
      isPublished: data.isPublished ?? false,
    },
  });
}

export async function getTemplate(prisma, id) {
  return prisma.template.findUnique({ where: { id } });
}

export async function updateTemplate(prisma, id, data) {
  return prisma.template.update({ where: { id }, data });
}

export async function deleteTemplate(prisma, id) {
  return prisma.template.delete({ where: { id } });
}

export async function listTemplates(prisma, { category } = {}) {
  const where = {};
  if (category) where.category = category;
  return prisma.template.findMany({ where });
}
