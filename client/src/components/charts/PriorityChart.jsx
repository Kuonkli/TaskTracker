import { PriorityIcon } from '../CommonComponents';

const priorityColors = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#3B82F6',
    low: '#6B7280',
};

export default function PriorityChart({ data }) {
    if (!data || data.length === 0) {
        return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No data for this period</div>;
    }

    // Общее количество ВСЕХ задач = 100%
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.map((item) => {
                const percentage = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;

                return (
                    <div key={item.priority}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <PriorityIcon priorityId={item.priority} size={14} />
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    {item.priority}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                                    {item.count}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                    {percentage}%
                                </span>
                            </div>
                        </div>
                        <div style={{
                            width: '100%',
                            height: 8,
                            background: 'var(--bg-primary)',
                            borderRadius: 4,
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                borderRadius: 4,
                                width: `${percentage}%`,
                                backgroundColor: priorityColors[item.priority] || '#6B7280',
                                transition: 'width 0.5s ease',
                                minWidth: percentage > 0 ? 4 : 0
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}