import { CustomUserAvatar } from '../CommonComponents';

export default function TopMembersChart({ data }) {
    if (!data || data.length === 0) {
        return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No data for this period</div>;
    }

    const totalChanges = data.reduce((sum, member) => sum + member.changes_count, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.map((member) => {
                const percentage = totalChanges > 0 ? Math.round((member.changes_count / totalChanges) * 100) : 0;

                return (
                    <div key={member.user.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CustomUserAvatar
                            user={member.user}
                            color={member.user.color}
                            size="32px"
                            fontSize="11px"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{
                                    fontSize: 13,
                                    color: 'var(--text-secondary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {member.user.last_name} {member.user.first_name}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                                        {member.changes_count}
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
                                    background: 'var(--accent-primary)',
                                    width: `${percentage}%`,
                                    transition: 'width 0.5s ease',
                                    minWidth: percentage > 0 ? 4 : 0
                                }} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}