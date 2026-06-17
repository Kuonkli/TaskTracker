import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { CustomUserAvatar, PriorityIcon } from '../CommonComponents';

function getOverdueStyle(days) {
    if (days > 7) return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
    if (days > 3) return { color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316' };
    return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' };
}

export default function OverdueTable({ data, projectId }) {
    if (!data || data.length === 0) {
        return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No data for this period</div>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={headerStyle}>Task</th>
                    <th style={headerStyle}>Assignee</th>
                    <th style={headerStyle}>Due Date</th>
                    <th style={headerStyle}>Overdue</th>
                    <th style={headerStyle}>Priority</th>
                </tr>
                </thead>
                <tbody>
                {data.map((task) => {
                    const overdueStyle = getOverdueStyle(task.days_overdue);
                    return (
                        <tr
                            key={task.id}
                            style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={16} style={{ color: overdueStyle.color, flexShrink: 0 }} />
                                    <Link
                                        to={`/project/${projectId}/task/${task.id}`}
                                        style={{
                                            color: 'var(--text-secondary)',
                                            textDecoration: 'none',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: 200,
                                            display: 'block'
                                        }}
                                    >
                                        {task.title}
                                    </Link>
                                </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                                {task.assignee ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CustomUserAvatar user={task.assignee} color={task.assignee.color} size="24px" fontSize="9px" />
                                        <span style={{ color: 'var(--text-tertiary)' }}>
                                                {task.assignee.last_name} {task.assignee.first_name}
                                            </span>
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Unassigned</span>
                                )}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>
                                {new Date(task.due_date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '2px 10px',
                                        borderRadius: 10,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: overdueStyle.bg,
                                        color: overdueStyle.text
                                    }}>
                                        {task.days_overdue}d
                                    </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <PriorityIcon priorityId={task.priority} size={14} />
                                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                            {task.priority}
                                        </span>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

const headerStyle = {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};