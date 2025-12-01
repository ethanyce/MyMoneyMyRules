import React from 'react';
import './RemindersCard.css';
import { formatCurrency, CURRENCY } from '../utils/format';

const RemindersCard = ({ reminders }) => {
  const activeReminders = reminders.filter(r => !r.is_completed) || [];

  return (
    <div className="reminders-card">
      <div className="reminders-header">
        <h3 className="card-title">
          Upcoming Items
        </h3>
      </div>
      <div className="reminders-content">
        {activeReminders.length > 0 ? (
          <div className="reminders-list">
            {activeReminders.slice(0, 5).map((reminder) => {
              // Support both "reminder" objects and budget objects returned
              // from the dashboard (budgets don't have `due_date` or `amount`).
              const title = reminder.title || reminder.category_name || 'Untitled';

              const startRaw = reminder.start_date || reminder.startDate || '';
              const endRaw = reminder.end_date || reminder.endDate || reminder.due_date || '';
              const startObj = startRaw ? new Date(startRaw) : null;
              const endObj = endRaw ? new Date(endRaw) : null;
              const startValid = startObj && !isNaN(startObj.getTime());
              const endValid = endObj && !isNaN(endObj.getTime());

              let dateLabel = 'No date';
              if (startValid && endValid) {
                dateLabel = `Period: ${startObj.toLocaleDateString()} - ${endObj.toLocaleDateString()}`;
              } else if (endValid) {
                dateLabel = `Due: ${endObj.toLocaleDateString()}`;
              } else if (startValid) {
                dateLabel = `Due: ${startObj.toLocaleDateString()}`;
              }

              const amountValue = reminder.amount ?? reminder.amount_limit ?? reminder.spent ?? 0;

              return (
                <div key={reminder.id || reminder.budget_id} className="reminder-item">
                  <div className="reminder-info">
                    <span className="reminder-title">{title}</span>
                    <span className="reminder-date">{dateLabel}</span>
                  </div>
                  <span className="reminder-amount">{`${CURRENCY}${formatCurrency(amountValue)}`}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-message">No upcoming reminders</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemindersCard;


