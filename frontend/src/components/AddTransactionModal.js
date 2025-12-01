import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../api';
import './AddTransactionModal.css';
import { useAuth } from '../context/AuthContext';
import { CURRENCY, formatCurrency } from '../utils/format';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const expenseCategories = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Other'
];

const incomeCategories = [
  'Salary',
  'Allowance',
  'Commission',
  'Gift',
  'Business/Freelance',
  'Investment',
  'Others'
];

const AddTransactionModal = ({ onClose, onSuccess, transaction }) => {
  const { token } = useAuth();

  // Determine if in edit mode (transaction passed)
  const isEditMode = !!transaction;

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('0.00');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [budgets, setBudgets] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load budgets (unchanged)
    let cancelled = false;
    const fetchBudgets = async () => {
      try {
        const res = await api.get('/budgets');
        if (!cancelled) setBudgets(res.data || []);
      } catch (err) {
        console.error('Failed to load budgets:', err);
      }
    };
    fetchBudgets();
    return () => { cancelled = true; };
  }, []);

  // When editing, prefill form fields with transaction data
  useEffect(() => {
    if (isEditMode) {
      setType(transaction.type || 'expense');
      setAmount(transaction.amount?.toFixed(2) || '0.00');
      setCategory(transaction.category || '');
      setDescription(transaction.description || '');
      setDate(transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setSelectedBudgetId(''); // optionally you can support pre-select budget here if you have budget linkage
    } else {
      // Reset form on adding
      setType('expense');
      setAmount('0.00');
      setCategory('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedBudgetId('');
    }
  }, [transaction, isEditMode]);

  // When transaction type changes, reset category list accordingly if adding (to keep behavior consistent)
  useEffect(() => {
    if (!isEditMode) {
      const list = type === 'income' ? incomeCategories : expenseCategories;
      setCategory(list.length > 0 ? list[0] : '');
    }
  }, [type, isEditMode]);

  // Budget select pre-fill category if user selects budget (as your original code)
  useEffect(() => {
    if (selectedBudgetId) {
      const b = budgets.find((bb) => String(bb.budget_id) === String(selectedBudgetId));
      if (b) {
        setCategory(b.category_name || '');
      }
    }
  }, [selectedBudgetId, budgets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const transactionData = {
      type,
      amount: parseFloat(amount),
      category: category || null,
      description: description || null,
      date: date,
      budget_id: selectedBudgetId || null
    };

    try {
      if (isEditMode) {
        // Update transaction (PUT)
        await axios.put(`${API_URL}/transactions/${transaction.id}`, transactionData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new transaction (POST)
        await api.post('/transactions', transactionData);
      }
      onSuccess();
    } catch (innerErr) {
      const msg = innerErr?.response?.data?.message || innerErr?.message || 'Unknown error';
      setError(`Failed to ${isEditMode ? 'update' : 'add'} transaction: ${msg}`);
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} transaction:`, innerErr);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const incrementAmount = () => {
    setAmount((prev) => (parseFloat(prev || 0) + 1).toFixed(2));
  };

  const decrementAmount = () => {
    setAmount((prev) => Math.max(0, parseFloat(prev || 0) - 1).toFixed(2));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEditMode ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-description">
          {isEditMode 
            ? 'Update your income or expense transaction details.' 
            : 'Record a new income or expense transaction to track your finances.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="transaction-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${type === 'expense' ? 'active' : ''}`}
              onClick={() => setType('expense')}
              disabled={isEditMode} // Optional: disable changing type when editing to avoid complexity
            >
              Expense
            </button>
            <button
              type="button"
              className={`toggle-btn ${type === 'income' ? 'active' : ''}`}
              onClick={() => setType('income')}
              disabled={isEditMode} // Optional
            >
              Income
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <div className="amount-input-container">
              <span className="currency-symbol">{CURRENCY}</span>
              <input
                type="text"
                id="amount"
                className="amount-input"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                required
              />
              <div className="amount-controls">
                <button type="button" className="amount-btn" onClick={incrementAmount}>▲</button>
                <button type="button" className="amount-btn" onClick={decrementAmount}>▼</button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
              <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                {!isEditMode && (
                  <select
                    id="budget"
                    className="form-select"
                    value={selectedBudgetId}
                    onChange={(e) => setSelectedBudgetId(e.target.value)}
                  >
                    <option value="">Apply to budget (optional)</option>
                    {budgets.map((b) => (
                      <option key={b.budget_id} value={b.budget_id}>
                        {`${b.category_name} — ${b.start_date} to ${b.end_date} (${CURRENCY}${formatCurrency(b.amount_limit)})`}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  id="category"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isEditMode} // Optional: disable changing category on edit if you want
                >
                  <option value="">Select a category</option>
                  {(type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this transaction for?"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <div className="date-input-container">
              <input
                type="date"
                id="date"
                className="date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <span className="date-icon"></span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Transaction' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;