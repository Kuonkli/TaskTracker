import React from 'react';
import '../styles/CommonComponents.css'

export const PriorityIcon = ({ priorityId, size = 16 }) => {
    const priorities = [
        { id: 'critical', label: 'Critical', color: 'var(--error)' },
        { id: 'high', label: 'High', color: 'var(--warning)' },
        { id: 'medium', label: 'Medium', color: 'var(--info)' },
        { id: 'low', label: 'Low', color: 'var(--text-tertiary)' }
    ];
    const priorityData = priorities.find(p => p.id === priorityId) || priorities[2];

    const priorityConfig = {
        critical: {
            lines: [
                [0, 8, 14, 2], [28, 8, 14, 2],
                [0, 14, 14, 8], [28, 14, 14, 8],
                [0, 20, 14, 14], [28, 20, 14, 14],
                [0, 26, 14, 20], [28, 26, 14, 20]
            ]
        },
        high: {
            lines: [
                [0, 10, 14, 4], [28, 10, 14, 4],
                [0, 18, 14, 12], [28, 18, 14, 12],
                [0, 26, 14, 20], [28, 26, 14, 20]
            ]
        },
        medium: {
            lines: [
                [0, 14, 14, 8], [28, 14, 14, 8],
                [0, 20, 14, 14], [28, 20, 15, 14]
            ]
        },
        low: {
            lines: [
                [0, 18, 14, 12], [28, 18, 14, 12]
            ]
        }
    };

    const config = priorityConfig[priorityId] || priorityConfig.medium;

    return (
        <svg width={size / 1.5} height={size} viewBox="0 0 28 28">
            {config.lines.map(([x1, y1, x2, y2], index) => (
                <line
                    key={index}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={priorityData.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            ))}
        </svg>
    );
};

export const CustomUserAvatar = ({ user, size='32px', color='#8B5CF6', fontSize='12px' }) => {
    const getInitials = (user) => {
        return user.last_name[0].toUpperCase() + user.first_name[0].toUpperCase();
    }
    return (
        <div className="custom-user-avatar" style={{ width: size, height: size, backgroundColor: color, fontSize: fontSize }}>
            {getInitials(user)}
        </div>
    )
}

const Preloader = ({ size = '32px', color = '#8B5CF6' }) => {
    return (
        <div className="preloader" style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 50 50"
                xmlns="http://www.w3.org/2000/svg"
                className="spinner"
            >
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeDasharray="125"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
};

export default Preloader;
