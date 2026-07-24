import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  listTemplates,
} from './templateRepository.js';

describe('templateRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('creates a template with default version 1 and unpublished', async () => {
    const template = await createTemplate(prisma, {
      category: 'Demand Letter',
      name: 'Basic',
      skeletonContent: '<p>{{name}}</p>',
    });
    expect(template.version).toBe(1);
    expect(template.isPublished).toBe(false);
  });

  it('gets, updates, and deletes a template', async () => {
    const created = await createTemplate(prisma, { category: 'Demand Letter', name: 'X' });

    expect((await getTemplate(prisma, created.id)).name).toBe('X');

    const updated = await updateTemplate(prisma, created.id, { name: 'Y', isPublished: true });
    expect(updated.name).toBe('Y');
    expect(updated.isPublished).toBe(true);

    await deleteTemplate(prisma, created.id);
    expect(await getTemplate(prisma, created.id)).toBeNull();
  });

  it('lists all templates when no category given', async () => {
    await createTemplate(prisma, { category: 'Demand Letter', name: 'A' });
    await createTemplate(prisma, { category: 'NDA', name: 'B' });

    const templates = await listTemplates(prisma);
    expect(templates).toHaveLength(2);
  });

  it('lists templates filtered by category', async () => {
    await createTemplate(prisma, { category: 'Demand Letter', name: 'A' });
    await createTemplate(prisma, { category: 'NDA', name: 'B' });

    const templates = await listTemplates(prisma, { category: 'NDA' });
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('B');
  });
});
