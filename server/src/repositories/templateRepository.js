// Repository for the Template aggregate.

import { pick } from './pick.js';

// Client-writable content fields (see prisma/schema.prisma Template model).
// Excludes id, version/isPublished/publishedAt (version & trust fields),
// parentTemplateId (relation-like reference), createdAt/updatedAt.
const WRITABLE_FIELDS = [
  'category',
  'name',
  'skeletonContent',
  'defaultMetadata',
  'placeholders',
  'sections',
  'variables',
];

export async function createTemplate(prisma, data) {
  return prisma.template.create({
    data: {
      ...pick(data, WRITABLE_FIELDS),
      version: 1,
      isPublished: false,
    },
  });
}

export async function getTemplate(prisma, id) {
  return prisma.template.findUnique({ where: { id } });
}

export async function updateTemplate(prisma, id, data) {
  return prisma.template.update({ where: { id }, data: pick(data, WRITABLE_FIELDS) });
}

export async function deleteTemplate(prisma, id) {
  return prisma.template.delete({ where: { id } });
}

export async function listTemplates(prisma, { category } = {}) {
  const where = {};
  if (category) where.category = category;
  return prisma.template.findMany({ where });
}
