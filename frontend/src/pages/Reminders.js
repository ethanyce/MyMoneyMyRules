import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Reminders.css';
import AddReminderModal from '../components/AddReminderModal';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, CURRENCY } from '../utils/format';

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

const Reminders = () => {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/budgets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBudgets(response.data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetSaved = () => {
    setShowModal(false);
    // Refresh budgets and notify other components (dashboard) to update
    fetchBudgets().then(() => {
      window.dispatchEvent(new Event('budgetsUpdated'));
    });
  };

  const activeBudgets = budgets || [];
  const totalBudget = activeBudgets.reduce((sum, b) => sum + parseFloat(b.amount_limit || 0), 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + parseFloat(b.spent || 0), 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="reminders-page">
      <div className="reminders-header">
        <div>
          <h2 className="page-title">Budget Planning</h2>
          <p className="page-subtitle">Set monthly budgets by category and track your spending against them</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingBudget(null); setShowModal(true); }}>
          <span>+</span> Add Budget
        </button>
      </div>

      <div className="reminders-metrics">
        <MetricCard title="Active Budgets" value={activeBudgets.length.toString()} icon={null} />
        <MetricCard title="Total Budget" value={`${CURRENCY}${formatCurrency(totalBudget)}`} color="orange" icon={null} />
        <MetricCard title="Total Spent" value={`${CURRENCY}${formatCurrency(totalSpent)}`} icon={null} />
      </div>

      <div className="reminders-list-container">
        <div className="reminders-list-header">
          <h3 className="list-title">
            Active Budgets
          </h3>
        </div>
        {activeBudgets.length === 0 ? (
            <div className="empty-state">
            <p className="empty-message">No active budgets.</p>
            <button className="btn-secondary" onClick={() => { setEditingBudget(null); setShowModal(true); }}>
              <span>+</span> Add Your First Budget
            </button>
          </div>
        ) : (
          <div className="reminders-list">
            {activeBudgets.map((budget) => {
              // Ensure numeric comparison: backend may return strings
              const spent = Number(budget.spent) || 0;
              const limit = Number(budget.amount_limit) || 0;
              const isOverBudget = spent > limit; // true only when spent strictly exceeds limit
              const statusLabel = isOverBudget ? 'Over Limit' : 'Within Limit';
              const statusClass = isOverBudget ? 'budget-status-label over-limit' : 'budget-status-label within-limit';

              return (
                <div key={budget.budget_id} className="reminder-item">
                  <div className="reminder-info">
                    <span className="reminder-title">{budget.category_name}</span>
                    <div className="reminder-details">
                      <span className="reminder-category">{budget.category_type}</span>
                      <span className="reminder-date">
                        Period: {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span className="reminder-amount">
                        {`${CURRENCY}${formatCurrency(spent)} of ${CURRENCY}${formatCurrency(limit)}`}
                      </span>
                      <div className={statusClass}>
                        {statusLabel}
                      </div>
                    </div>

                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => { setEditingBudget(budget); setShowModal(true); }}
                        aria-label={`Edit budget ${budget.category_name}`}
                        style={{padding: '8px', borderRadius: '6px'}}
                      >
                        {/* simple pen SVG icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#2D3B45" />
                          <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#2D3B45" />
                        </svg>
                      </button>

                      <button
                        className="icon-btn"
                        title="Delete"
                        aria-label={`Delete budget ${budget.category_name}`}
                        onClick={async () => {
                          const ok = window.confirm(`Delete budget "${budget.category_name}"? This cannot be undone.`);
                          if (!ok) return;
                          try {
                            await axios.delete(`${API_URL}/budgets/${budget.budget_id}`, { headers: { Authorization: `Bearer ${token}` } });
                            await fetchBudgets();
                            window.dispatchEvent(new Event('budgetsUpdated'));
                            alert('Budget deleted');
                          } catch (err) {
                            console.error('Error deleting budget:', err.response || err.message || err);
                            const msg = err.response && err.response.data && err.response.data.error ? err.response.data.error : 'Failed to delete budget.';
                            alert(msg);
                          }
                        }}
                        style={{padding: '8px', borderRadius: '6px'}}
                      >
                        {/* trash SVG icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 6h18v2H3V6zm2 3h14l-1 12H6L5 9zm5-6h4v2h-4V3z" fill="#c0392b" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddReminderModal
          onClose={() => { setShowModal(false); setEditingBudget(null); }}
          onSuccess={handleBudgetSaved}
          budget={editingBudget}
        />
      )}
    </div>
  );
};

const MetricCard = ({ title, value, color = 'gray', icon }) => {
  return (
    <div className={`reminder-metric-card metric-card-${color}`}>
      <div className="metric-header">
        <h3 className="metric-title">{title}</h3>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
    </div>
  );
};

export default Reminders;


