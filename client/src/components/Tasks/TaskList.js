import React from 'react';
import TaskCard from './TaskCard';

const TaskList = ({ tasks, onEdit, onDelete, onStatusChange, showProject = false }) => {
    if (tasks.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h4 className="empty-state-title">No tasks</h4>
                <p>No tasks to display</p>
            </div>
        );
    }

    return (
        <div className="tasks-list">
            {(tasks || []).map(task => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                />
            ))}
        </div>
    );
};

export default TaskList;