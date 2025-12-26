import React from 'react';
import { format } from 'date-fns';

const ProjectCard = ({ project, onView, onEdit, onDelete }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        return format(new Date(dateString), 'MMM d, yyyy');
    };

    return (
        <div className="project-card">
            <div className="project-header">
                <div className="project-title-container">
                    <h3 className="project-title">{project.name}</h3>
                    <div
                        className="project-color"
                        style={{ backgroundColor: project.color || '#4f46e5' }}
                        title="Project color"
                    />
                </div>
            </div>

            {project.description && (
                <p className="project-description">{project.description}</p>
            )}

            <div className="project-stats">
                <div className="stat-item">
                    <span className="stat-number">{project?.total_tasks || 0}</span>
                    <span className="stat-label">Total Tasks</span>
                </div>

                <div className="stat-item">
                    <span className="stat-number">{project?.completed_tasks || 0}</span>
                    <span className="stat-label">Completed</span>
                </div>

                <div className="stat-item">
          <span className="stat-number">
            {project.total_tasks > 0 ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0}%
          </span>
                    <span className="stat-label">Progress</span>
                </div>
            </div>

            <div className="project-meta">
                <div className="project-date">
                    <span>Created: {formatDate(project.created_at)}</span>
                </div>
                <div className="project-date">
                    <span>Updated: {formatDate(project.updated_at)}</span>
                </div>
            </div>

            <div className="project-actions">
                <button
                    onClick={() => onView(project)}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                >
                    View Details
                </button>

                <button
                    onClick={() => onEdit(project)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                >
                    Edit
                </button>

                <button
                    onClick={() => onDelete(project.id)}
                    className="btn btn-danger"
                    style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

export default ProjectCard;