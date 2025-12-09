import React from 'react';
import './BudgetCard.css';
import { formatCurrency, formatPercent, CURRENCY } from '../utils/format';

// Helper to format ISO date to local YYYY-MM-DD
const formatLocalDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // toLocaleDateString with 'en-CA' gives YYYY-MM-DD
  return date.toLocaleDateString('en-CA');
};

const BudgetCard = ({ budget }) => {
  const percentage = Math.min(budget.percentage || 0, 100);

  return (
    <div className="budget-card">
      <h3 className="card-title">Monthly Budget</h3>
      <div className="budget-amount">
        {`${CURRENCY}${formatCurrency(budget.spent)} of ${CURRENCY}${formatCurrency(budget.budget)}`}
      </div>

      {/* Display budget period */}
      {budget.start_date && budget.end_date && (
        <div className="budget-period">
          {`${formatLocalDate(budget.start_date)} to ${formatLocalDate(budget.end_date)}`}
        </div>
      )}

      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="progress-percentage">{formatPercent(percentage, 0)}%</span>
      </div>
      <div className="budget-remaining">
        {`${CURRENCY}${formatCurrency(budget.remaining)} remaining this month`}
      </div>
    </div>
  );
};

export default BudgetCard;
