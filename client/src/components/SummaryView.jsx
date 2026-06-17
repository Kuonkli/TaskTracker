import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus,
    MessageSquare, Clock, Activity
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { projectService } from '../services/projectService';
import Preloader, { CustomUserAvatar, PriorityIcon } from './CommonComponents';
import BurnupChart from './charts/BurnupChart';
import StatusPieChart from './charts/StatusPieChart';
import TopMembersChart from './charts/TopMembersChart';
import PriorityChart from './charts/PriorityChart';
import OverdueTable from './charts/OverdueTable';
import CompletedByWeekChart from './charts/CompletedByWeekChart';
import styles from '../styles/SummaryView.module.css';

const periods = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
];

export default function SummaryView() {
    const navigate = useNavigate();
    const { projectId } = useParams();
    const { handleApiError } = useToast();

    const [period, setPeriod] = useState('30d');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSummaryData();
    }, [period, projectId]);

    const loadSummaryData = async () => {
        try {
            setLoading(true);
            const response = await projectService.getProjectSummary(projectId, period);
            setData(response);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="app-loading-container">
                <div className="spinner-container">
                    <Preloader />
                </div>
            </div>
        );
    }

    const {
        metrics = {},
        burnup = [],
        byStatus = [],
        topMembers = [],
        byPriority = [],
        overdue = [],
        completedByWeek = [],
        recentActivity = null
    } = data || {};

    const isSingleMember = topMembers?.length <= 1;

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const diff = Math.floor((Date.now() - date) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.periodSelector}>
                    {periods.map((p) => (
                        <button
                            key={p.value}
                            className={`${styles.periodBtn} ${period === p.value ? styles.periodBtnActive : ''}`}
                            onClick={() => setPeriod(p.value)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.content}>
                {/* Row 1: Key Metrics */}
                <div className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Created</span>
                        <span className={styles.metricValue}>{metrics.created}</span>
                        {metrics.createdChange !== 0 && (
                            <span
                                className={`${styles.metricChange} ${metrics.createdChange > 0 ? styles.positive : styles.negative}`}>
                                {metrics.createdChange > 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                                                {metrics.createdChange > 0 ? '+' : ''}{metrics.createdChange} vs prev
                            </span>
                        )}
                    </div>

                    <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Active</span>
                        <span className={styles.metricValue}>{metrics.active}</span>
                        <span className={styles.metricSubtext}>Not completed yet</span>
                    </div>

                    <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Completed</span>
                        <span className={styles.metricValue}>{metrics.completed}</span>
                        {metrics.completedChange !== 0 && (
                            <span
                                className={`${styles.metricChange} ${metrics.completedChange > 0 ? styles.positive : styles.negative}`}>
                                {metrics.completedChange > 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                                                {metrics.completedChange > 0 ? '+' : ''}{metrics.completedChange} vs prev
                            </span>
                        )}
                    </div>

                    <div className={styles.metricCard}>
                        <span className={styles.metricLabel}>Avg. Time</span>
                        <span className={styles.metricValue}>{metrics.avgCompletionDays.toFixed(1)}d</span>
                        <span className={styles.metricSubtext}>To complete</span>
                    </div>
                </div>

                {/* Row 2: Burnup + Status */}
                <div className={styles.row2}>
                    <div className={styles.chartBlock}>
                        <h3 className={styles.chartTitle}>Created vs Completed</h3>
                        <BurnupChart data={burnup}/>
                    </div>
                    <div className={styles.chartBlockNarrow}>
                        <h3 className={styles.chartTitle}>Status Distribution</h3>
                        <StatusPieChart data={byStatus} total={metrics.total}/>
                        <div className={styles.statusLegend}>
                            {byStatus.map((s) => (
                                <div key={s.name} className={styles.legendItem}>
                                    <div className={styles.legendDot} style={{ backgroundColor: s.color }} />
                                    <span className={styles.legendName}>{s.name}</span>
                                    <span className={styles.legendCount}>{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row 3: Members + Priority */}
                <div className={styles.row2}>
                    <div className={styles.chartBlock}>
                        <h3 className={styles.chartTitle}>
                            {isSingleMember ? 'Recent Activity' : 'Top Members'}
                        </h3>
                        {isSingleMember && recentActivity ? (
                            <div className={styles.recentActivityList}>
                                {recentActivity.map((activity, index) => (
                                    <div key={index} className={styles.activityItem}>
                                        <div
                                            className={styles.activityDot}
                                            style={{
                                                backgroundColor: activity.type === 'comment' ? '#8B5CF6' : '#6366F1'
                                            }}
                                        />
                                        <div className={styles.activityContent}>
                                            <span className={styles.activityText}>
                                                {activity.type === 'comment' ? 'Commented on ' : `Changed ${activity.field_name} in `}
                                                <Link
                                                    to={`/project/${projectId}/task/${activity.task_id}`}
                                                    className={styles.activityLink}
                                                >
                                                    {activity.task_title}
                                                </Link>
                                            </span>
                                            <span className={styles.activityTime}>
                                                {formatTimeAgo(activity.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <TopMembersChart data={topMembers} />
                        )}
                    </div>
                    <div className={styles.chartBlock}>
                        <h3 className={styles.chartTitle}>Priority Breakdown</h3>
                        <PriorityChart data={byPriority} />
                    </div>
                </div>

                {/* Row 4: Overdue */}
                <div className={styles.chartBlock}>
                    <h3 className={styles.chartTitle}>Overdue Tasks</h3>
                    <OverdueTable data={overdue} projectId={projectId} />
                </div>

                {/* Row 5: Completed by Week */}
                <div className={styles.chartBlock}>
                    <h3 className={styles.chartTitle}>Completed Per Week</h3>
                    <CompletedByWeekChart data={completedByWeek} />
                </div>
            </div>
        </div>
    );
}