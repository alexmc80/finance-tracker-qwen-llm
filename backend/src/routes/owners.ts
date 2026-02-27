import { Router } from 'express';
import { OwnerRepository } from '../repositories/owner.repository.js';
import type { OwnerInput } from '../types.js';

const router = Router();

router.get('/', (_req, res) => {
  const owners = OwnerRepository.findAll();
  res.json(owners);
});

router.get('/:id', (req, res) => {
  const owner = OwnerRepository.findById(req.params.id);
  if (!owner) {
    return res.status(404).json({ error: 'Owner not found' });
  }
  res.json(owner);
});

router.post('/', (req, res) => {
  const input: OwnerInput = req.body;
  if (!input.name || typeof input.name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  // PIN-код должен быть 4 цифры или отсутствовать
  if (input.pinCode && !/^\d{4}$/.test(input.pinCode)) {
    return res.status(400).json({ error: 'PIN code must be 4 digits' });
  }
  const owner = OwnerRepository.create(input);
  res.status(201).json(owner);
});

router.post('/verify-pin', (req, res) => {
  const { ownerId, pinCode } = req.body;
  if (!ownerId || !pinCode) {
    return res.status(400).json({ error: 'ownerId and pinCode are required' });
  }
  const isValid = OwnerRepository.verifyPin(ownerId, pinCode);
  res.json({ valid: isValid });
});

router.put('/:id', (req, res) => {
  const input: Partial<OwnerInput> = req.body;
  const owner = OwnerRepository.update(req.params.id, input);
  if (!owner) {
    return res.status(404).json({ error: 'Owner not found' });
  }
  res.json(owner);
});

router.delete('/:id', (req, res) => {
  const deleted = OwnerRepository.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Owner not found' });
  }
  res.status(204).send();
});

export default router;
