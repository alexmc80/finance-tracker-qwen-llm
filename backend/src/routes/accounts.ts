import { Router } from 'express';
import { AccountRepository } from '../repositories/account.repository.js';
import type { AccountInput } from '../types.js';

const router = Router();

router.get('/', (_req, res) => {
  const accounts = AccountRepository.findAll();
  res.json(accounts);
});

router.get('/owner/:ownerId', (req, res) => {
  const accounts = AccountRepository.findByOwner(req.params.ownerId);
  res.json(accounts);
});

router.get('/:id', (req, res) => {
  const account = AccountRepository.findById(req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json(account);
});

router.post('/', (req, res) => {
  const input: AccountInput = req.body;
  if (!input.name || typeof input.name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!input.ownerId) {
    return res.status(400).json({ error: 'OwnerId is required' });
  }
  const account = AccountRepository.create(input);
  res.status(201).json(account);
});

router.put('/:id', (req, res) => {
  const input: Partial<AccountInput> = req.body;
  const account = AccountRepository.update(req.params.id, input);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json(account);
});

router.delete('/:id', (req, res) => {
  const deleted = AccountRepository.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.status(204).send();
});

export default router;
