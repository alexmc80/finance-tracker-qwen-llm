import { Router } from 'express';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import type { TransactionInput } from '../types.js';

const router = Router();

router.get('/', (_req, res) => {
  const transactions = TransactionRepository.findAll();
  res.json(transactions);
});

router.get('/owner/:ownerId', (req, res) => {
  const transactions = TransactionRepository.findByOwner(req.params.ownerId);
  res.json(transactions);
});

router.get('/:id', (req, res) => {
  const transaction = TransactionRepository.findById(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

router.post('/', (req, res) => {
  const input: TransactionInput = req.body;

  if (!input.ownerId) {
    return res.status(400).json({ error: 'OwnerId is required' });
  }
  if (!input.accountId) {
    return res.status(400).json({ error: 'AccountId is required' });
  }
  if (!input.categoryId) {
    return res.status(400).json({ error: 'CategoryId is required' });
  }
  if (typeof input.amount !== 'number') {
    return res.status(400).json({ error: 'Amount is required and must be a number' });
  }
  if (input.type !== -1 && input.type !== 1) {
    return res.status(400).json({ error: 'Type must be -1 (expense) or 1 (income)' });
  }
  if (!input.date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  const transaction = TransactionRepository.create(input);
  res.status(201).json(transaction);
});

router.put('/:id', (req, res) => {
  const input: Partial<TransactionInput> = req.body;
  const transaction = TransactionRepository.update(req.params.id, input);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

router.delete('/:id', (req, res) => {
  const deleted = TransactionRepository.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.status(204).send();
});

export default router;
