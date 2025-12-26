import React from 'react';
import { format } from 'date-fns';

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }) => {
    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'high': return 'priority-high';
            case 'medium': return 'priority-medium';
            case 'low': return 'priority-low';
            default: return 'priority-medium';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'todo': return 'status-todo';
            case 'in_progress': return 'status-in_progress';
            case 'done': return 'status-done';
            default: return 'status-todo';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'todo': return 'To Do';
            case 'in_progress': return 'In Progress';
            case 'done': return 'Done';
            default: return status;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No due date';
        return format(new Date(dateString), 'MMM d, yyyy');
    };

    const isOverdue = () => {
        if (!task.due_date || task.status === 'done') return false;
        return new Date(task.due_date) < new Date();
    };

    return (
        <div className="task-card">
            <div className="task-card-header">
                <h3 className="task-title">{task.title}</h3>
                <span className={`task-priority ${getPriorityClass(task.priority)}`}>
          {task.priority}
        </span>
            </div>

            {task.description && (
                <p className="task-description">{task.description}</p>
            )}

            {task.project && (
                <div className="task-project">
                    <strong>Project:</strong> {task.project.name}
                </div>
            )}

            <div className="task-meta">
                <div>
          <span className={`task-status ${getStatusClass(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
                </div>

                <div className={`task-due-date ${isOverdue() ? 'due-date-overdue' : ''}`}>
                    <span>📅 {formatDate(task.due_date)}</span>
                    {isOverdue() && <span> (Overdue)</span>}
                </div>
            </div>

            <div className="task-actions">
                <button
                    onClick={() => onEdit(task)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                >
                    Edit
                </button>

                <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className="form-select"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.875rem' }}
                >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                </select>

                <button
                    onClick={() => onDelete(task.id)}
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

export default TaskCard;