import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AddReminderModal.css';
import { useAuth } from '../context/AuthContext';
import { CURRENCY } from '../utils/format';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const categories = [
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

const AddReminderModal = ({ onClose, onSuccess, budget }) => {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(budget);

  useEffect(() => {
    if (budget) {
      setTitle(budget.category_name || '');
      setAmount((budget.amount_limit || 0).toString());
      setCategory(budget.category_type || '');
      setStartDate(budget.start_date ? budget.start_date.slice(0, 10) : '');
      setEndDate(budget.end_date ? budget.end_date.slice(0, 10) : '');
    }
  }, [budget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const reminderData = {
        category_name: title,
        amount_limit: parseFloat(amount),
        category_type: category || null,
        start_date: startDate,
        end_date: endDate
      };

      if (isEdit) {
        await axios.put(`${API_URL}/budgets/${budget.budget_id}`, reminderData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('PUT /api/budgets/:id response: updated', reminderData);
      } else {
        await axios.post(`${API_URL}/budgets`, reminderData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('POST /api/budgets response: created', reminderData);
      }
      onSuccess();
    } catch (err) {
      console.error('Error adding/updating reminder:', err);
      // Prefer server-provided error message when available
      const serverMsg = err?.response?.data?.error || err?.response?.data || null;
      setError(serverMsg || (isEdit ? 'Failed to update budget. Please try again.' : 'Failed to add budget. Please try again.'));
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Budget</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-description">
          Set up a budget limit for a specific spending category.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Category Name</label>
            <input
              type="text"
              id="title"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Groceries"
              required
            />
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
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <div className="date-input-container">
              <input
                type="date"
                id="startDate"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <span className="date-icon">📅</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <div className="date-input-container">
              <input
                type="date"
                id="endDate"
                className="date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <span className="date-icon">📅</span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Budget' : 'Add Budget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReminderModal;


