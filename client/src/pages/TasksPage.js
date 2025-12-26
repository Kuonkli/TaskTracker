import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/SideBar';
import TaskList from '../components/Tasks/TaskList';
import TaskForm from '../components/Tasks/TaskForm';
import Loader from '../components/Common/Loader';
import ErrorAlert from '../components/Common/ErrorAlert';
import api from '../services/api';
import '../styles/tasks.css';

const TasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        project_id: '',
        search: '',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
    });

    useEffect(() => {
        fetchTasks();
        fetchProjects();
    }, [filters, pagination.page]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            };

            const response = await api.get('/api/tasks', { params });
            setTasks(response.data);
            // В реальном приложении сервер должен возвращать информацию о пагинации
            setPagination(prev => ({ ...prev, total: response.data.length }));
            setError('');
        } catch (error) {
            setError('Failed to fetch tasks');
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await api.get('/api/projects?limit=100');
            setProjects(response.data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const handleCreateTask = async (taskData) => {
        try {
            const response = await api.post('/api/tasks', taskData);
            setTasks([response.data, ...tasks]);
            setShowForm(false);
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create task');
        }
    };

    const handleUpdateTask = async (id, taskData) => {
        try {
            const response = await api.put(`/api/tasks/${id}`, taskData);
            setTasks(tasks.map(task =>
                task.id === id ? response.data : task
            ));
            setEditingTask(null);
            setShowForm(false);
            setError('');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update task');
        }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            await api.delete(`/api/tasks/${id}`);
            setTasks(tasks.filter(task => task.id !== id));
            setError('');
        } catch (error) {
            setError('Failed to delete task');
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await api.put(`/api/tasks/${id}/status`, { status });
            setTasks(tasks.map(task =>
                task.id === id ? { ...task, status } : task
            ));
        } catch (error) {
            setError('Failed to update task status');
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleSave = (taskData) => {
        if (editingTask) {
            handleUpdateTask(editingTask.id, taskData);
        } else {
            handleCreateTask(taskData);
        }
    };

    if (loading && tasks.length === 0) {
        return <Loader />;
    }

    return (
        <div className="app-container">

            <Header/>
            <Sidebar/>
            <main className="main-content">
                <h1 className="page-title">Tasks</h1>
                <p className="page-subtitle">Manage your tasks and track progress</p>

                {error && <ErrorAlert message={error}/>}

                {/* Filters */}
                <div className="filters-container">
                    <h3 className="filters-title">Filters</h3>
                    <div className="filters-grid">
                        <div className="filter-group">
                            <label className="filter-label">Status</label>
                            <select
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                                className="form-select"
                            >
                                <option value="">All Statuses</option>
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Priority</label>
                            <select
                                name="priority"
                                value={filters.priority}
                                onChange={handleFilterChange}
                                className="form-select"
                            >
                                <option value="">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Project</label>
                            <select
                                name="project_id"
                                value={filters.project_id}
                                onChange={handleFilterChange}
                                className="form-select"
                            >
                                <option value="">All Projects</option>
                                {(projects || []).map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Search</label>
                            <input
                                type="text"
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                                placeholder="Search tasks..."
                                className="form-input"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setFilters({
                                status: '',
                                priority: '',
                                project_id: '',
                                search: '',
                            });
                            setPagination({page: 1, limit: 10, total: 0});
                        }}
                        className="btn btn-secondary"
                        style={{marginTop: '10px'}}
                    >
                        Clear Filters
                    </button>
                </div>

                {/* Tasks List */}
                <div className="tasks-list-container">
                    <div className="tasks-header">
                        <h3>Your Tasks ({tasks.length})</h3>
                        <div className="tasks-actions">
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn btn-primary"
                            >
                                + New Task
                            </button>
                        </div>
                    </div>

                    {tasks.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📝</div>
                            <h4 className="empty-state-title">No tasks found</h4>
                            <p>Create your first task to get started!</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn btn-primary"
                                style={{marginTop: '20px'}}
                            >
                                Create First Task
                            </button>
                        </div>
                    ) : (
                        <>
                            <TaskList
                                tasks={tasks}
                                onEdit={(task) => {
                                    setEditingTask(task);
                                    setShowForm(true);
                                }}
                                onDelete={handleDeleteTask}
                                onStatusChange={handleStatusChange}
                            />

                            {/* Пагинация */}
                            {pagination.total > pagination.limit && (
                                <div className="pagination">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="page-btn"
                                    >
                                        Previous
                                    </button>

                                    <span className="page-info">
                    Page {pagination.page}
                  </span>

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={tasks.length < pagination.limit}
                                        className="page-btn"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Task Form Modal */}
                {showForm && (
                    <TaskForm
                        task={editingTask}
                        onSave={handleSave}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingTask(null);
                        }}
                        projects={projects}
                    />
                )}
            </main>
        </div>
    );
};

export default TasksPage;