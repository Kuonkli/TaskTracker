import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, AtSign } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import '../styles/AuthPages.css';

export default function RegisterPage({ onRegister }) {
    const navigate = useNavigate();
    const { showToast, handleApiError } = useToast();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        nickname: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const errors = [];

        if (!formData.email.trim()) {
            errors.push('Email is required');
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.push('Email is invalid');
        }

        if (!formData.password) {
            errors.push('Password is required');
        } else if (formData.password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }

        if (formData.password !== formData.confirmPassword) {
            errors.push('Passwords do not match');
        }

        if (!formData.first_name.trim()) {
            errors.push('First name is required');
        }

        if (!formData.last_name.trim()) {
            errors.push('Last name is required');
        }

        if (!formData.nickname.trim()) {
            errors.push('Nickname is required');
        } else if (formData.nickname.length < 3) {
            errors.push('Nickname must be at least 3 characters');
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.nickname)) {
            errors.push('Nickname can only contain letters, numbers and underscore');
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateForm();

        if (errors.length > 0) {
            // Показываем все ошибки в одном toast
            errors.forEach(error => showToast(error, 'warning'));
            return;
        }

        setIsLoading(true);

        try {
            // Отправляем только нужные поля (без confirmPassword)
            const { confirmPassword, ...registerData } = formData;

            const user = await authService.register(registerData);
            await onRegister(user);
            showToast('Account created successfully! Welcome aboard!', 'success');
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">T</div>
                        <h1>Create account</h1>
                        <p>Start managing your projects</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="first_name">
                                    <User size={16} />
                                    First name
                                </label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="First name"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="last_name">
                                    <User size={16} />
                                    Last name
                                </label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="Last name"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="nickname">
                                <AtSign size={16} />
                                Nickname
                            </label>
                            <input
                                type="text"
                                id="nickname"
                                name="nickname"
                                value={formData.nickname}
                                onChange={handleChange}
                                placeholder="Choose a nickname"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                <Mail size={16} />
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="password">
                                    <Lock size={16} />
                                    Password
                                </label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Create password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">
                                    <Lock size={16} />
                                    Confirm password
                                </label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="auth-submit" disabled={isLoading}>
                            {isLoading ? (
                                <span className="loading-spinner" />
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Sign up
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to={`/login`} className="auth-link">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}