import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/SideBar';
import TaskList from '../components/Tasks/TaskList';
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
            // Получаем задачи с защитой от null
            const tasksResponse = await api.get('/api/tasks?limit=5');
            const allTasksResponse = await api.get('/api/tasks?limit=1000');

            // Получаем проекты с защитой от null
            const projectsResponse = await api.get('/api/projects?limit=5');

            // Безопасное извлечение данных
            const recentTasksData = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
            const allTasksData = Array.isArray(allTasksResponse?.data) ? allTasksResponse.data : [];
            const projectsData = Array.isArray(projectsResponse?.data) ? projectsResponse.data : [];

            // Фильтруем только валидные задачи
            const validAllTasks = allTasksData.filter(task => task && typeof task === 'object');
            const validRecentTasks = recentTasksData.filter(task => task && typeof task === 'object');

            // Рассчитываем статистику
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
                    <h3>Recent Tasks</h3>
                    {recentTasks.length > 0 ? (
                        <TaskList tasks={recentTasks} showProject={true} />
                    ) : (
                        <p>No tasks yet. <a href="/tasks" style={{color: '#4f46e5'}}>Create your first task</a></p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;