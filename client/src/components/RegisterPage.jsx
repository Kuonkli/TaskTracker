import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import '../styles/AuthPages.css';

export default function RegisterPage({ onRegister }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        nickname: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!formData.nickname.trim()) {
            newErrors.nickname = 'Nickname is required';
        } else if (formData.nickname.length < 3) {
            newErrors.nickname = 'Nickname must be at least 3 characters';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validateForm();

        if (Object.keys(newErrors).length === 0) {
            setIsLoading(true);

            try {
                // Здесь будет API запрос к /api/auth/register
                setTimeout(() => {
                    const mockUser = {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        email: formData.email,
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        nickname: formData.nickname
                    };
                    onRegister(mockUser);
                    navigate('/projects');
                    setIsLoading(false);
                }, 500);
            } catch (err) {
                setErrors({ general: 'Registration failed. Please try again.' });
                setIsLoading(false);
            }
        } else {
            setErrors(newErrors);
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
                        {errors.general && (
                            <div className="auth-error">
                                <span>{errors.general}</span>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName">
                                    <User size={16} />
                                    First name
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Enter first name"
                                    className={errors.firstName ? 'error' : ''}
                                />
                                {errors.firstName && (
                                    <span className="field-error">{errors.firstName}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="lastName">
                                    <User size={16} />
                                    Last name
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Enter last name"
                                    className={errors.lastName ? 'error' : ''}
                                />
                                {errors.lastName && (
                                    <span className="field-error">{errors.lastName}</span>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="nickname">
                                @ Nickname
                            </label>
                            <input
                                type="text"
                                id="nickname"
                                name="nickname"
                                value={formData.nickname}
                                onChange={handleChange}
                                placeholder="Choose a nickname"
                                className={errors.nickname ? 'error' : ''}
                            />
                            {errors.nickname && (
                                <span className="field-error">{errors.nickname}</span>
                            )}
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
                                className={errors.email ? 'error' : ''}
                            />
                            {errors.email && (
                                <span className="field-error">{errors.email}</span>
                            )}
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
                                        className={errors.password ? 'error' : ''}
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="field-error">{errors.password}</span>
                                )}
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
                                        className={errors.confirmPassword ? 'error' : ''}
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <span className="field-error">{errors.confirmPassword}</span>
                                )}
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