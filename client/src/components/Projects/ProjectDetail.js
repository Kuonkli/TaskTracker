import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import TaskList from '../Tasks/TaskList';
import api from '../../services/api';

const ProjectDetail = ({ project, onClose, onEdit, onDelete }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjectTasks();
    }, [project]);

    const fetchProjectTasks = async () => {
        try {
            const response = await api.get(`/api/tasks?project_id=${project.id}`);
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching project tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        return format(new Date(dateString), 'MMMM d, yyyy');
    };

    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    return (
        <div className="project-detail-modal">
            <div className="project-detail-container">
                <div className="project-detail-header">
                    <div>
                        <h2 className="project-detail-title">
              <span
                  style={{
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      backgroundColor: project.color || '#4f46e5',
                      borderRadius: '50%',
                      marginRight: '10px'
                  }}
              />
                            {project.name}
                        </h2>
                        <p style={{ color: '#6b7280', marginTop: '5px' }}>
                            Created: {formatDate(project.created_at)}
                        </p>
                    </div>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                {project.description && (
                    <div className="project-detail-content">
                        <h3 style={{ marginBottom: '10px' }}>Description</h3>
                        <p style={{
                            color: '#4b5563',
                            lineHeight: '1.6',
                            padding: '15px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px'
                        }}>
                            {project.description}
                        </p>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginTop: '30px',
                    backgroundColor: '#f8fafc',
                    padding: '20px',
                    borderRadius: '8px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                            {tasks.length}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Tasks</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                            {completedTasks}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Completed</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                            {progress}%
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Progress</div>
                    </div>
                </div>

                <div className="project-tasks-section">
                    <div className="project-tasks-header">
                        <h3>Project Tasks</h3>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div className="loader">Loading tasks...</div>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📝</div>
                            <h4 style={{ marginBottom: '10px' }}>No tasks in this project</h4>
                            <p style={{ color: '#6b7280' }}>Add tasks to this project from the tasks page</p>
                        </div>
                    ) : (
                        <TaskList tasks={tasks} showProject={false} />
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '30px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <button
                        onClick={() => onEdit(project)}
                        className="btn btn-primary"
                    >
                        Edit Project
                    </button>

                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to delete this project?')) {
                                onDelete(project.id);
                                onClose();
                            }
                        }}
                        className="btn btn-danger"
                    >
                        Delete Project
                    </button>

                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;