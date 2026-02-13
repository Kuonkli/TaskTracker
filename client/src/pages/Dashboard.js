import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/SideBar';
import api from '../services/api';
import '../styles/dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalTasks: 0,
        completedTasks: 0,
        activeProjects: 0,
        overdueTasks: 0,
    });
    const [recentTasks, setRecentTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const tasksResponse = await api.get('/api/tasks?limit=5');
            const allTasksResponse = await api.get('/api/tasks?limit=1000');
            const projectsResponse = await api.get('/api/projects?limit=5');

            const recentTasksData = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
            const allTasksData = Array.isArray(allTasksResponse?.data) ? allTasksResponse.data : [];
            const projectsData = Array.isArray(projectsResponse?.data) ? projectsResponse.data : [];

            const validAllTasks = allTasksData.filter(task => task && typeof task === 'object');
            const validRecentTasks = recentTasksData.filter(task => task && typeof task === 'object');

            const totalTasks = validAllTasks.length;
            const completedTasks = validAllTasks.filter(task => task.status === 'done').length;
            const activeProjects = projectsData.length;
            const overdueTasks = validAllTasks.filter(task =>
                task.status !== 'done' &&
                task.due_date &&
                new Date(task.due_date) < new Date()
            ).length;

            setStats({
                totalTasks,
                completedTasks,
                activeProjects,
                overdueTasks,
            });

            setRecentTasks(validRecentTasks);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Функции для отображения задач
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
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return 'Invalid date';
        }
    };

    const isOverdue = (task) => {
        if (!task.due_date || task.status === 'done') return false;
        return new Date(task.due_date) < new Date();
    };

    const renderTaskCard = (task) => {
        if (!task) return null;

        return (
            <div key={task.id} className="task-card">
                <div className="task-card-header">
                    <h3 className="task-title">{task.title || 'Untitled Task'}</h3>
                    <span className={`task-priority ${getPriorityClass(task.priority)}`}>
                        {task.priority || 'medium'}
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
                            {getStatusLabel(task.status || 'todo')}
                        </span>
                    </div>

                    <div className={`task-due-date ${isOverdue(task) ? 'due-date-overdue' : ''}`}>
                        <span>📅 {formatDate(task.due_date)}</span>
                        {isOverdue(task) && <span> (Overdue)</span>}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="app-container">
                <Header />
                <Sidebar />
                <main className="main-content">
                    <div className="loader">Loading...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header />
            <Sidebar />
            <main className="main-content">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Welcome back! Here's what's happening with your tasks and projects.</p>

                {/* Статистика */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-title">Total Tasks</div>
                        <div className="stat-value">{stats.totalTasks}</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-title">Completed Tasks</div>
                        <div className="stat-value">{stats.completedTasks}</div>
                        <div className="stat-change positive">
                            {stats.totalTasks > 0
                                ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% complete`
                                : 'No tasks'
                            }
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-title">Active Projects</div>
                        <div className="stat-value">{stats.activeProjects}</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-title">Overdue Tasks</div>
                        <div className="stat-value">{stats.overdueTasks}</div>
                        {stats.overdueTasks > 0 && (
                            <div className="stat-change negative">Need attention</div>
                        )}
                    </div>
                </div>

                {/* Недавние задачи */}
                <div className="recent-tasks">
                    <div className="recent-tasks-header">
                        <h3>Recent Tasks</h3>
                        <a href="/tasks" className="view-all-link">View All →</a>
                    </div>

                    {recentTasks.length > 0 ? (
                        <div className="dashboard-tasks-list">
                            {recentTasks.map(task => renderTaskCard(task))}
                        </div>
                    ) : (
                        <div className="empty-tasks">
                            <div className="empty-tasks-icon">📝</div>
                            <h4>No recent tasks</h4>
                            <p>No tasks to display. <a href="/tasks" className="create-task-link">Create your first task</a></p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;