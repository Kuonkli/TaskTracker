import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    X, MessageSquare, GitPullRequestArrow, Clock,
    MoveRight, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { projectService } from '../services/projectService';
import Preloader, { CustomUserAvatar, PriorityIcon } from './CommonComponents';
import styles from '../styles/RightSidebar.module.css';

const ACTIVITIES_PER_PAGE = 20;

export default function RightSidebar({ isOpen, onClose }) {
    const { projectId } = useParams();
    const { handleApiError } = useToast();

    const [activities, setActivities] = useState([]);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const feedRef = useRef(null);

    const totalPages = Math.ceil(total / ACTIVITIES_PER_PAGE);
    const currentPage = Math.floor(offset / ACTIVITIES_PER_PAGE) + 1;

    const loadActivities = useCallback(async (newOffset) => {
        try {
            setLoading(true);
            const data = await projectService.getProjectActivities(projectId, ACTIVITIES_PER_PAGE, newOffset);
            setActivities(data.activities);
            setTotal(data.total);
            setOffset(newOffset);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [projectId, handleApiError]);

    useEffect(() => {
        if (isOpen) {
            setInitialLoading(true);
            loadActivities(0);
        }
    }, [isOpen, loadActivities]);

    const fieldLabels = {
        task: 'Created task',
        status: 'Changed status',
        priority: 'Changed priority',
        assignee: 'Changed assignee',
        due_date: 'Changed due date',
        start_date: 'Changed start date',
        title: 'Changed title',
        description: 'Changed description',
        subtask: 'Changed subtasks'
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        if (diffInSeconds < 60) return 'Now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
        return date.toLocaleDateString();
    };

    const formatDuration = (seconds) => {
        if (!seconds && seconds !== 0) return null;
        if (seconds < 60) return `${seconds}s`;
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
        if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        return `${minutes}m`;
    };

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
                onClick={onClose}
            />
            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <h2>Activity Feed</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content} ref={feedRef}>
                    {initialLoading ? (
                        <div className={styles.loadingState}>
                            <Preloader />
                            <p>Loading activities...</p>
                        </div>
                    ) : activities.length > 0 ? (
                        <>
                            <div className={styles.activitiesList}>
                                {activities.map((activity) => {
                                    const duration = formatDuration(activity.time_duration);

                                    return (
                                        <div key={activity.id} className={`${styles.activityItem} ${activity.field_name === 'task' ? styles.center : ''}`}>
                                            <CustomUserAvatar
                                                user={activity.user}
                                                color={activity.user?.color}
                                                size="32px"
                                                fontSize="11px"
                                            />
                                            <div className={styles.activityContent}>
                                                <div className={styles.activityHeader}>
                                                    <span className={styles.activityUser}>
                                                        {activity.user?.last_name} {activity.user?.first_name}
                                                    </span>
                                                    <span className={styles.activityType}>
                                                        {activity.type === 'comment'
                                                            ? 'Commented'
                                                            : fieldLabels[activity.field_name] || `Changed ${activity.field_name}`
                                                        }
                                                    </span>
                                                    <span className={styles.activityTime}>
                                                        {formatTimeAgo(activity.created_at)}
                                                    </span>
                                                    {duration && activity.field_name !== 'task' && (
                                                        <span className={styles.activityDuration}>
                                                            <Clock size={12} />
                                                            {duration}
                                                        </span>
                                                    )}
                                                </div>

                                                {activity.type === 'comment' ? (
                                                    <div className={styles.activityText}>
                                                        {activity.content}
                                                    </div>
                                                ) : (
                                                    activity.field_name !== 'task' && (
                                                        <div className={styles.activityChangeContent}>
                                                            <div className={styles.changeValues}>
                                                                {activity.field_name === 'status' && (
                                                                    <>
                                                                        <span className={styles.changeBadge}
                                                                              style={{
                                                                                  backgroundColor: `${activity.old_value?.color}20`,
                                                                                  color: activity.old_value?.color,
                                                                                  borderColor: `${activity.old_value?.color}40`
                                                                              }}
                                                                        >{activity.old_value?.name || 'None'}</span>
                                                                        <span className={styles.changeArrow}><MoveRight size={14} /></span>
                                                                        <span className={styles.changeBadge}
                                                                              style={{
                                                                                  backgroundColor: `${activity.new_value?.color}20`,
                                                                                  color: activity.new_value?.color,
                                                                                  borderColor: `${activity.new_value?.color}40`
                                                                              }}
                                                                        >{activity.new_value?.name}</span>
                                                                    </>
                                                                )}

                                                                {activity.field_name === 'priority' && (
                                                                    <>
                                                                        <span className={`${styles.changePriority} ${styles[`priority${activity.old_value?.charAt(0).toUpperCase() + activity.old_value?.slice(1)}`] || ''}`}>
                                                                            <PriorityIcon priorityId={activity.old_value} size={14} /> {activity.old_value}
                                                                        </span>
                                                                        <span className={styles.changeArrow}><MoveRight size={14} /></span>
                                                                        <span className={`${styles.changePriority} ${styles[`priority${activity.new_value?.charAt(0).toUpperCase() + activity.new_value?.slice(1)}`] || ''}`}>
                                                                            <PriorityIcon priorityId={activity.new_value} size={14} /> {activity.new_value}
                                                                        </span>
                                                                    </>
                                                                )}

                                                                {activity.field_name === 'assignee' && (
                                                                    <>
                                                                        <span className={styles.changeTextOld}>
                                                                            {activity.old_value?.last_name
                                                                                ? `${activity.old_value.last_name} ${activity.old_value.first_name}`
                                                                                : 'Unassigned'}
                                                                        </span>
                                                                        <span className={styles.changeArrow}><MoveRight size={14} /></span>
                                                                        <span className={styles.changeText}>
                                                                            {activity.new_value?.last_name
                                                                                ? `${activity.new_value.last_name} ${activity.new_value.first_name}`
                                                                                : 'Unassigned'}
                                                                        </span>
                                                                    </>
                                                                )}

                                                                {activity.field_name === 'title' && (
                                                                    <>
                                                                        <span className={styles.changeTextOld}>{activity.old_value}</span>
                                                                        <span className={styles.changeArrow}><MoveRight size={14} /></span>
                                                                        <span className={styles.changeText}>{activity.new_value}</span>
                                                                    </>
                                                                )}

                                                                {activity.field_name === 'description' && (
                                                                    <div className={styles.changeDescriptionBlock}>
                                                                        <div className={styles.changeDescriptionSection}>
                                                                            <span className={styles.changeDescriptionLabel}>Old:</span>
                                                                            <div className={styles.changeDescriptionText}>
                                                                                {activity.old_value || 'Empty'}
                                                                            </div>
                                                                        </div>
                                                                        <div className={styles.changeDescriptionSection}>
                                                                            <span className={styles.changeDescriptionLabel}>New:</span>
                                                                            <div className={styles.changeDescriptionText}>
                                                                                {activity.new_value || 'Empty'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {activity.field_name === 'subtask' && (
                                                                    <span className={styles.changeText}>
                                                                        Added subtask{' '}
                                                                        <Link
                                                                            to={`/projects/${projectId}/task/${activity.new_value?.at(-1)?.id}`}
                                                                            className={styles.activityTaskLink}
                                                                        >
                                                                            {activity.new_value?.at(-1)?.title}
                                                                        </Link>
                                                                    </span>
                                                                )}

                                                                {activity.field_name === 'due_date' && (
                                                                    <>
                                                                        <span className={styles.changeText}>
                                                                            {activity.old_value ? new Date(activity.old_value).toLocaleDateString() : 'Not set'}
                                                                        </span>
                                                                        <span className={styles.changeArrow}><MoveRight size={14} /></span>
                                                                        <span className={styles.changeText}>
                                                                            {activity.new_value ? new Date(activity.new_value).toLocaleDateString() : 'Not set'}
                                                                        </span>
                                                                    </>
                                                                )}

                                                                {activity.field_name === 'start_date' && (
                                                                    <>
                                                                        <span className={styles.changeText}>
                                                                            {activity.old_value ? new Date(activity.old_value).toLocaleDateString() : 'Not set'}
                                                                        </span>
                                                                        <span className={styles.changeArrow}><MoveRight size={14} /></span>
                                                                        <span className={styles.changeText}>
                                                                            {activity.new_value ? new Date(activity.new_value).toLocaleDateString() : 'Not set'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}

                                                <Link
                                                    to={`/projects/${projectId}/task/${activity.task_id}`}
                                                    className={styles.activityTaskLink}
                                                >
                                                    {activity.task?.title || 'Task'}
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {totalPages > 1 && (
                                <div className={styles.pagination}>
                                    <button
                                        className={styles.pageBtn}
                                        onClick={() => loadActivities(offset - ACTIVITIES_PER_PAGE)}
                                        disabled={offset === 0 || loading}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className={styles.pageInfo}>
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        className={styles.pageBtn}
                                        onClick={() => loadActivities(offset + ACTIVITIES_PER_PAGE)}
                                        disabled={offset + ACTIVITIES_PER_PAGE >= total || loading}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <Clock size={48} />
                            <h3>No activity yet</h3>
                            <p>Project activities will appear here</p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}