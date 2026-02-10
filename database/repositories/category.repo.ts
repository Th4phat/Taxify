import { eq, asc, and } from 'drizzle-orm';
import { db } from '../db';
import { categories, subCategories, type Category, type NewCategory, type SubCategory, type NewSubCategory } from '../schema';
import { generateUUIDSync } from '@/utils/uuid';
import type { TransactionType } from '@/types';

// Re-export types for convenience
export type { Category, NewCategory, SubCategory, NewSubCategory };

export async function getAllCategories(): Promise<Category[]> {
  return db.query.categories.findMany({
    orderBy: asc(categories.displayOrder),
  });
}

export async function getCategoriesByType(type: TransactionType): Promise<Category[]> {
  return db.query.categories.findMany({
    where: and(
      eq(categories.type, type),
      eq(categories.isActive, true)
    ),
    orderBy: asc(categories.displayOrder),
  });
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const result = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
  
  return result || null;
}

export async function getSubCategories(categoryId: string): Promise<SubCategory[]> {
  return db.query.subCategories.findMany({
    where: and(
      eq(subCategories.categoryId, categoryId),
      eq(subCategories.isActive, true)
    ),
  });
}

export async function getSubCategoryById(id: string): Promise<SubCategory | null> {
  const result = await db.query.subCategories.findFirst({
    where: eq(subCategories.id, id),
  });
  
  return result || null;
}

export async function createCategory(
  data: Omit<NewCategory, 'id'>
): Promise<string> {
  const id = generateUUIDSync();
  
  await db.insert(categories).values({
    ...data,
    id,
  });
  
  return id;
}

export async function createSubCategory(
  data: Omit<NewSubCategory, 'id'>
): Promise<string> {
  const id = generateUUIDSync();
  
  await db.insert(subCategories).values({
    ...data,
    id,
  });
  
  return id;
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<NewCategory, 'id'>>
): Promise<void> {
  await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id));
}

export async function updateSubCategory(
  id: string,
  data: Partial<Omit<NewSubCategory, 'id'>>
): Promise<void> {
  await db
    .update(subCategories)
    .set(data)
    .where(eq(subCategories.id, id));
}

export async function deleteCategory(id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function deleteSubCategory(id: string): Promise<void> {
  await db.delete(subCategories).where(eq(subCategories.id, id));
}

export async function createManyCategories(items: Omit<NewCategory, 'id'>[]): Promise<void> {
  const values = items.map((item) => ({
    ...item,
    id: generateUUIDSync(),
  }));
  
  await db.insert(categories).values(values);
}

export async function seedDefaultCategories(defaultCategories: Omit<NewCategory, 'id'>[]): Promise<void> {
  // Check if categories already exist
  const existing = await getAllCategories();
  
  if (existing.length > 0) {
    return; // Already seeded
  }
  
  await createManyCategories(defaultCategories);
}

export async function getCategoryBySection40Type(section40Type: number): Promise<Category | null> {
  const result = await db.query.categories.findFirst({
    where: eq(categories.defaultSection40, section40Type),
  });
  
  return result || null;
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(categories)
      .set({ displayOrder: i })
      .where(eq(categories.id, orderedIds[i]));
  }
}

export async function deactivateCategory(id: string): Promise<void> {
  await db
    .update(categories)
    .set({ isActive: false })
    .where(eq(categories.id, id));
}

export async function activateCategory(id: string): Promise<void> {
  await db
    .update(categories)
    .set({ isActive: true })
    .where(eq(categories.id, id));
}
