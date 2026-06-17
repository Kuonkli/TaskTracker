import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function StatusPieChart({ data, total }) {
    if (!data || data.length === 0) {
        return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No data for this period</div>;
    }
    return (
        <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="count"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: 'var(--text-primary)',
                        }}
                        formatter={(value, name) => [value, name]}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{total}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Total</p>
                </div>
            </div>
        </div>
    );
}