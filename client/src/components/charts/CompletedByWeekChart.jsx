import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CompletedByWeekChart({ data }) {
    if (!data || data.length === 0) {
        return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No data for this period</div>;
    }

    const formatted = data.map((d) => ({
        ...d,
        weekLabel: new Date(d.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis
                    dataKey="weekLabel"
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickLine={false}
                    allowDecimals={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text-primary)',
                    }}
                    formatter={(value) => [value, 'Completed']}
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
        </ResponsiveContainer>
    );
}