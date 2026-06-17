import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function BurnupChart({ data }) {
    if (!data || data.length === 0) {
        return <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No data for this period</div>;
    }

    const formatted = data.map((d) => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text-primary)',
                    }}
                />
                <Legend
                    wrapperStyle={{ fontSize: 12, color: 'var(--text-tertiary)' }}
                    iconType="circle"
                    iconSize={8}
                />
                <Area
                    type="monotone"
                    dataKey="created"
                    stroke="#3B82F6"
                    fill="url(#gradCreated)"
                    strokeWidth={2}
                    name="Created"
                />
                <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#10B981"
                    fill="url(#gradCompleted)"
                    strokeWidth={2}
                    name="Completed"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}