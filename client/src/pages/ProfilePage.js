import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/SideBar';
import Loader from '../components/Common/Loader';
import ErrorAlert from '../components/Common/ErrorAlert';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/profile.css';

const ProfilePage = () => {
    const { user, updateProfile } = useAuth();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
    });
    const [stats, setStats] = useState({
        totalTasks: 0,
        totalProjects: 0,
        completedTasks: 0,
    });

    useEffect(() => {
        if (user) {
            fetchUserData();
            fetchUserStats();
        }
    }, [user]);

    const fetchUserData = async () => {
        try {
            const response = await api.get('/api/profile');
            setUserData(response.data.user);
            setFormData({
                first_name: response.data.user.first_name,
                last_name: response.data.user.last_name,
            });
        } catch (error) {
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async () => {
        try {
            const [tasksResponse, projectsResponse] = await Promise.all([
                api.get('/api/tasks?limit=1000'),
                api.get('/api/projects?limit=1000'),
            ]);

            // Двойная проверка: response.data может быть null или не массивом
            const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
            const projects = Array.isArray(projectsResponse?.data) ? projectsResponse.data : [];

            // Фильтруем только валидные задачи (не null/undefined)
            const validTasks = tasks.filter(task => task && typeof task === 'object');

            const totalTasks = validTasks.length;
            const completedTasks = validTasks.filter(task => task.status === 'done').length;
            const totalProjects = projects.length;

            setStats({
                totalTasks,
                totalProjects,
                completedTasks,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Устанавливаем значения по умолчанию
            setStats({
                totalTasks: 0,
                totalProjects: 0,
                completedTasks: 0,
            });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('First name and last name are required');
            return;
        }

        try {
            const result = await updateProfile(formData.first_name, formData.last_name);

            if (result.success) {
                setSuccess('Profile updated successfully!');
                setEditing(false);
                fetchUserData(); // Refresh data
            } else {
                setError(result.error);
            }
        } catch (error) {
            setError('Failed to update profile');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getInitials = () => {
        if (!userData) return '??';
        return `${userData.first_name[0]}${userData.last_name[0]}`.toUpperCase();
    };

    if (loading || !userData) {
        return <Loader />;
    }

    return (
        <div className="app-container">
            <Header />
            <Sidebar />
            <main className="main-content">
                <h1 className="page-title">Profile</h1>
                <p className="page-subtitle">Manage your account and view your statistics</p>

                {error && <ErrorAlert message={error} />}
                {success && <div className="success-alert">{success}</div>}

                <div className="profile-container">
                    {/* Profile Card */}
                    <div className="profile-card">
                        <div className="profile-header">
                            <div className="profile-avatar">
                                {getInitials()}
                            </div>
                            <div className="profile-info">
                                <h2>{userData.first_name} {userData.last_name}</h2>
                                <p className="profile-email">{userData.email}</p>
                            </div>
                        </div>

                        <div className="profile-details">
                            <div className="detail-group">
                                <span className="detail-label">Member Since</span>
                                <span className="detail-value">{formatDate(userData.created_at)}</span>
                            </div>

                            <div className="detail-group">
                                <span className="detail-label">Account Type</span>
                                <span className="detail-value">Standard User</span>
                            </div>

                            <div className="detail-group">
                                <span className="detail-label">Last Updated</span>
                                <span className="detail-value">{formatDate(userData.updated_at)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setEditing(!editing)}
                            className="btn btn-primary"
                        >
                            {editing ? 'Cancel Edit' : 'Edit Profile'}
                        </button>
                    </div>

                    {/* Edit Form */}
                    {editing && (
                        <div className="edit-form-container">
                            <div className="edit-form-header">
                                <h3 className="edit-form-title">Edit Profile Information</h3>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="edit-form-row">
                                    <div className="form-group">
                                        <label className="form-label">First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter your first name"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter your last name"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        value={userData.email}
                                        className="form-input"
                                        disabled
                                        style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                                    />
                                    <small style={{ color: '#6b7280' }}>Email cannot be changed</small>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(false)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* User Statistics */}
                    <div className="user-stats">
                        <div className="stat-box">
                            <h4>Total Tasks</h4>
                            <p className="number">{stats.totalTasks}</p>
                        </div>

                        <div className="stat-box">
                            <h4>Completed Tasks</h4>
                            <p className="number">{stats.completedTasks}</p>
                        </div>

                        <div className="stat-box">
                            <h4>Active Projects</h4>
                            <p className="number">{stats.totalProjects}</p>
                        </div>

                        <div className="stat-box">
                            <h4>Completion Rate</h4>
                            <p className="number">
                                {stats.totalTasks > 0
                                    ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%`
                                    : '0%'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;