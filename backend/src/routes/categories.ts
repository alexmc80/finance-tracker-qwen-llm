import { Router } from 'express';
import { CategoryRepository } from '../repositories/category.repository.js';
import type { CategoryInput } from '../types.js';

const router = Router();

router.get('/', (_req, res) => {
  const categories = CategoryRepository.findAll();
  res.json(categories);
});

router.get('/owner/:ownerId', (req, res) => {
  const categories = CategoryRepository.findByOwner(req.params.ownerId);
  res.json(categories);
});

router.get('/:id', (req, res) => {
  const category = CategoryRepository.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

router.post('/', (req, res) => {
  const input: CategoryInput = req.body;
  if (!input.name || typeof input.name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!input.ownerId) {
    return res.status(400).json({ error: 'OwnerId is required' });
  }
  if (input.type !== -1 && input.type !== 1) {
    return res.status(400).json({ error: 'Type must be -1 (expense) or 1 (income)' });
  }
  const category = CategoryRepository.create(input);
  res.status(201).json(category);
});

router.put('/:id', (req, res) => {
  const input: Partial<CategoryInput> = req.body;
  const category = CategoryRepository.update(req.params.id, input);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

router.delete('/:id', (req, res) => {
  const deleted = CategoryRepository.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.status(204).send();
});

export default router;
