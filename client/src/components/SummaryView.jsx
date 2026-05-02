import { useState } from 'react';
import { BarChart3, SquareCheckBig, Clock, Users, TrendingUp, Award, Rocket } from 'lucide-react';
import '../styles/SummaryView.css';

export default function SummaryView({ tasks, users }) {
    const [timeRange, setTimeRange] = useState('week');

    const stats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        overdueTasks: tasks.filter(t => t.isOverdue).length,
        completionRate: Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100),
    };

    const tasksByStatus = {
        todo: tasks.filter(t => t.status === 'todo').length,
        'in-progress': tasks.filter(t => t.status === 'in-progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
    };

    const tasksByPriority = {
        critical: tasks.filter(t => t.priority === 'critical').length,
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
    };

    const userActivity = users.map(user => ({
        ...user,
        completedTasks: tasks.filter(t => t.assignee?.id === user.id && t.status === 'done').length,
        totalTasks: tasks.filter(t => t.assignee?.id === user.id).length,
    }));

    const getTopPerformer = () => {
        return userActivity.reduce((best, current) =>
            current.completedTasks > best.completedTasks ? current : best
        );
    };

    return (
        <div className="summary-view">
            <div className="summary-header">
                <h1>Dashboard Summary</h1>
                <div className="time-range-selector">
                    <button
                        className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
                        onClick={() => setTimeRange('week')}
                    >
                        This Week
                    </button>
                    <button
                        className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
                        onClick={() => setTimeRange('month')}
                    >
                        This Month
                    </button>
                    <button
                        className={`time-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                        onClick={() => setTimeRange('quarter')}
                    >
                        This Quarter
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon total">
                        <BarChart3 size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Tasks</h3>
                        <p className="stat-value">{stats.totalTasks}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon completed">
                        <SquareCheckBig size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Completed</h3>
                        <p className="stat-value">{stats.completedTasks}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon progress">
                        <Rocket size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>In Progress</h3>
                        <p className="stat-value">{stats.inProgressTasks}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon overdue">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Overdue</h3>
                        <p className="stat-value">{stats.overdueTasks}</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <h3>Tasks by Status</h3>
                    <div className="progress-bars">
                        <div className="progress-item">
                            <span className="label">To Do</span>
                            <div className="bar-container">
                                <div
                                    className="bar todo"
                                    style={{ width: `${(tasksByStatus.todo / stats.totalTasks) * 100}%` }}
                                />
                            </div>
                            <span className="value">{tasksByStatus.todo}</span>
                        </div>
                        <div className="progress-item">
                            <span className="label">In Progress</span>
                            <div className="bar-container">
                                <div
                                    className="bar progress"
                                    style={{ width: `${(tasksByStatus['in-progress'] / stats.totalTasks) * 100}%` }}
                                />
                            </div>
                            <span className="value">{tasksByStatus['in-progress']}</span>
                        </div>
                        <div className="progress-item">
                            <span className="label">Review</span>
                            <div className="bar-container">
                                <div
                                    className="bar review"
                                    style={{ width: `${(tasksByStatus.review / stats.totalTasks) * 100}%` }}
                                />
                            </div>
                            <span className="value">{tasksByStatus.review}</span>
                        </div>
                        <div className="progress-item">
                            <span className="label">Done</span>
                            <div className="bar-container">
                                <div
                                    className="bar done"
                                    style={{ width: `${(tasksByStatus.done / stats.totalTasks) * 100}%` }}
                                />
                            </div>
                            <span className="value">{tasksByStatus.done}</span>
                        </div>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Tasks by Priority</h3>
                    <div className="priority-chart">
                        <div className="priority-item critical">
                            <span>Critical</span>
                            <span className="count">{tasksByPriority.critical}</span>
                        </div>
                        <div className="priority-item high">
                            <span>High</span>
                            <span className="count">{tasksByPriority.high}</span>
                        </div>
                        <div className="priority-item medium">
                            <span>Medium</span>
                            <span className="count">{tasksByPriority.medium}</span>
                        </div>
                        <div className="priority-item low">
                            <span>Low</span>
                            <span className="count">{tasksByPriority.low}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="insights-grid">
                <div className="insight-card">
                    <h3>Team Performance</h3>
                    <div className="top-performer">
                        <Award size={24} className="award-icon" />
                        <div className="performer-info">
                            <p className="performer-name">Top Performer</p>
                            <div className="performer-details">
                                <div
                                    className="performer-avatar"
                                    style={{ background: `linear-gradient(135deg, ${getTopPerformer().color.from}, ${getTopPerformer().color.to})` }}
                                >
                                    {getTopPerformer().initials}
                                </div>
                                <div>
                                    <p className="name">{getTopPerformer().name}</p>
                                    <p className="stats">{getTopPerformer().completedTasks} tasks completed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="team-list">
                        {userActivity.map(user => (
                            <div key={user.id} className="team-stat-item">
                                <div className="user-info">
                                    <div
                                        className="user-avatar"
                                        style={{ background: `linear-gradient(135deg, ${user.color.from}, ${user.color.to})` }}
                                    >
                                        {user.initials}
                                    </div>
                                    <span>{user.name}</span>
                                </div>
                                <div className="user-stats">
                                    <span className="completed">{user.completedTasks}</span>
                                    <span className="total">/{user.totalTasks}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="insight-card">
                    <h3>Completion Rate</h3>
                    <div className="completion-ring">
                        <svg viewBox="0 0 120 120" className="ring-chart">
                            <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="var(--bg-primary)"
                                strokeWidth="12"
                            />
                            <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="var(--accent-primary)"
                                strokeWidth="12"
                                strokeDasharray={`${2 * Math.PI * 54}`}
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.completionRate / 100)}`}
                                transform="rotate(-90 60 60)"
                            />
                        </svg>
                        <div className="completion-percent">
                            <span className="percent">{stats.completionRate}%</span>
                            <span className="label">Complete</span>
                        </div>
                    </div>

                    <div className="quick-stats">
                        <div className="quick-stat">
                            <Users size={16} />
                            <span>{users.length} Team Members</span>
                        </div>
                        <div className="quick-stat">
                            <Clock size={16} />
                            <span>Avg. completion: 3.2 days</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}