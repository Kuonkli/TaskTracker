import { useState, useEffect, useCallback } from 'react';
import {useNavigate, useParams, Link, useOutletContext} from 'react-router-dom';
import {
    ArrowLeft,
    Mail, Calendar, Clock, Tag, Loader,
    ChevronLeft, ChevronRight, MessageSquare,
    GitBranch, UserPlus, CheckCircle, AlertCircle,
    Pause, Play, Edit3, Trash2, Flag, AtSign, Blocks,
    LayersPlus, ShieldUser, Key, Handshake, UserCog,
    Activity, Hash, Info, Pen, LogOut, MoveRight, GitPullRequestArrow
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { projectService } from '../services/projectService';
import Preloader, {
    AdminPermissionsContent,
    CustomUserAvatar, MemberPermissionsContent,
    PriorityIcon,
    RemoveMemberContent, TransferOwnershipContent
} from "./CommonComponents";
import styles from '../styles/ProfilePage.module.css';
import ConfirmModal from "./modals/ConfirmModal";
import {authService} from "../services/authService";

const TASKS_PER_PAGE = 10;
const ACTIVITIES_PER_PAGE = 20;

export default function ProfilePage() {
    const navigate = useNavigate();
    const { projectId, userId } = useParams();
    const { showToast, handleApiError } = useToast();
    const { onLogout, currentUser, members, project } = useOutletContext();

    const [activeTab, setActiveTab] = useState('activity');
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Tasks state
    const [tasks, setTasks] = useState([]);
    const [tasksPage, setTasksPage] = useState(1);
    const [tasksTotal, setTasksTotal] = useState(0);
    const [tasksLoading, setTasksLoading] = useState(false);

    // Activities state
    const [activities, setActivities] = useState([]);
    const [activitiesOffset, setActivitiesOffset] = useState(0);
    const [activitiesTotal, setActivitiesTotal] = useState(0);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    const isOwnProfile = !userId || userId === currentUser?.id;
    const targetUserId = userId || member?.user_id;
    const totalTasksPages = Math.ceil(tasksTotal / TASKS_PER_PAGE);
    const totalActivitiesPages = Math.ceil(activitiesTotal / ACTIVITIES_PER_PAGE);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        last_name: '',
        first_name: '',
        nickname: '',
        email: '',
        role_in_team: ''
    });

    const handleOpenEdit = () => {
        setEditForm({
            last_name: user.last_name || '',
            first_name: user.first_name || '',
            nickname: user.nickname || '',
            email: user.email || '',
            role_in_team: member.role_in_team || ''
        });
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async () => {
        try {
            setActionLoading(true);

            // Обновляем профиль пользователя
            await authService.updateProfile({
                last_name: editForm.last_name,
                first_name: editForm.first_name,
                nickname: editForm.nickname,
            });

            showToast('Profile updated', 'success');
            setIsEditModalOpen(false);
            loadProfile();
        } catch (error) {
            handleApiError(error);
        } finally {
            setActionLoading(false);
        }
    };

    const canManage = !isOwnProfile &&
        (project?.owner_id === currentUser?.id ||
            members?.find(m => m.user_id === currentUser?.id)?.permission_level === 'admin');

    const [confirmModal, setConfirmModal] = useState(null);

    const handleChangePermissions = async (userId, newRole) => {
        try {
            await projectService.updateMember(projectId, userId, { permission_level: newRole });
            showToast('Permissions updated', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleRemoveMember = async (userId) => {
        try {
            await projectService.removeMember(projectId, userId);
            showToast('Member removed', 'success');
            navigate(-1);
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleTransferOwnership = async (userId) => {
        try {
            await projectService.transferOwnership(projectId, userId);
            showToast('Ownership transferred', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    // Load profile
    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            let data;

            if (isOwnProfile) {
                data = await projectService.getMyProfile(projectId);
            } else {
                data = await projectService.getMemberProfile(projectId, userId);
            }

            setMember(data.member);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    }, [projectId, userId, isOwnProfile, handleApiError]);

    // Load tasks
    const loadTasks = useCallback(async (page) => {
        if (!targetUserId) return;

        try {
            setTasksLoading(true);
            const data = await projectService.getUserTasks(projectId, targetUserId, page, TASKS_PER_PAGE);
            setTasks(data.tasks);
            setTasksTotal(data.total);
            setTasksPage(page);
        } catch (error) {
            handleApiError(error);
        } finally {
            setTasksLoading(false);
        }
    }, [projectId, targetUserId, handleApiError]);

    // Load activities
    const loadActivities = useCallback(async (offset) => {
        if (!targetUserId) return;

        try {
            setActivitiesLoading(true);
            const data = await projectService.getMemberActivities(
                projectId,
                targetUserId,
                ACTIVITIES_PER_PAGE,
                offset
            );
            setActivities(data.activities);
            setActivitiesTotal(data.total);
            setActivitiesOffset(offset);
        } catch (error) {
            handleApiError(error);
        } finally {
            setActivitiesLoading(false);
        }
    }, [projectId, targetUserId, handleApiError]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        if (targetUserId) {
            if (activeTab === 'tasks') {
                loadTasks(1);
            } else if (activeTab === 'activity') {
                loadActivities(0);
            }
        }
    }, [activeTab, targetUserId, loadTasks, loadActivities]);

    const handleChangeRole = async (newRole) => {
        if (newRole === member.permission_level) return;

        try {
            setActionLoading(true);
            await projectService.updateMember(projectId, targetUserId, {
                permission_level: newRole
            });
            showToast(`Role changed to ${newRole}`, 'success');
            loadProfile();
        } catch (error) {
            handleApiError(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeaveProject = async () => {
        if (!window.confirm('Are you sure you want to leave this project?')) {
            return;
        }

        try {
            setActionLoading(true);
            await projectService.leaveProject(projectId);
            showToast('You left the project', 'success');
            navigate('/');
        } catch (error) {
            handleApiError(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return '#EF4444';
            case 'high': return '#F97316';
            case 'medium': return '#3B82F6';
            case 'low': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'critical': return <PriorityIcon priorityId={'critical'} priority={priority} />;
            case 'high': return <PriorityIcon priorityId={'high'} priority={priority} />;
            case 'medium': return <PriorityIcon priorityId={'medium'} priority={priority} />;
            case 'low': return <PriorityIcon priorityId={'low'} priority={priority} />;
            default: return null;
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    };

    const formatDuration = (seconds) => {
        if (!seconds && seconds !== 0) return null;
        if (seconds < 60) return `${seconds}s`;

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
        }
        if (hours > 0) {
            return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        }
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="app-loading-container">
                <div className={"spinner-container"}>
                    <Preloader/>
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className={styles.errorContainer}>
                <AlertCircle size={48}/>
                <h2>User not found</h2>
                <button onClick={() => navigate(-1)} className={styles.backButton}>
                    <ArrowLeft size={16} />
                    Go back
                </button>
            </div>
        );
    }

    const user = member.user;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <span className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                    <span>Back</span>
                </span>
            </div>

            <div className={styles.content}>
                {/* Main content */}
                <div className={styles.main}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'activity' ? styles.tabActive : ''}`}
                            onClick={() => handleTabChange('activity')}
                        >
                            Activity
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'tasks' ? styles.tabActive : ''}`}
                            onClick={() => handleTabChange('tasks')}
                        >
                            Tasks
                        </button>
                    </div>

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div className={styles.tabContent}>
                            {activitiesLoading && activities.length === 0 ? (
                                <div className="app-loading-container">
                                    <div className={"spinner-container"}>
                                        <Preloader/>
                                    </div>
                                </div>
                            ) : activities.length > 0 ? (
                                <>
                                    <div className={styles.activitiesList}>
                                        {activities.map((activity) => {
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

                                            const duration = formatDuration(activity.time_duration);

                                            return (
                                                <div key={activity.id} className={`${styles.activityItem} ${activity.field_name === 'task' ? styles.center : ''}`}>
                                                    <div className={styles.activityIcon}>
                                                        {activity.type === 'comment' ? (
                                                            <MessageSquare size={14} />
                                                        ) : (
                                                            <GitPullRequestArrow size={14} />
                                                        )}
                                                    </div>
                                                    <div className={styles.activityContent}>
                                                        <div className={styles.activityHeader}>
                                                            <span className={styles.activityType}>
                                                                {activity.type === 'comment'
                                                                    ? 'Commented'
                                                                    : fieldLabels[activity.field_name] || `Changed ${activity.field_name}`
                                                                }
                                                                {activity.field_name !== 'task' && <span>in</span>}
                                                                <Link
                                                                    to={`/projects/${projectId}/task/${activity.task_id}`}
                                                                    className={styles.activityTaskLink}
                                                                >
                                                                    {activity.task?.title || 'Task'}
                                                                </Link>
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
                                                                            <span
                                                                                className={styles.changeBadge}
                                                                                style={{
                                                                                    backgroundColor: `${activity.old_value?.color}20`,
                                                                                    color: activity.old_value?.color,
                                                                                    borderColor: `${activity.old_value?.color}40`
                                                                                }}
                                                                            >
                                                                                {activity.old_value?.name || 'None'}
                                                                            </span>
                                                                                <span
                                                                                    className={styles.changeArrow}><MoveRight size={16}/></span>
                                                                                <span
                                                                                    className={styles.changeBadge}
                                                                                    style={{
                                                                                        backgroundColor: `${activity.new_value?.color}20`,
                                                                                        color: activity.new_value?.color,
                                                                                        borderColor: `${activity.new_value?.color}40`
                                                                                    }}
                                                                                >
                                                                                {activity.new_value?.name}
                                                                            </span>
                                                                            </>
                                                                        )}

                                                                        {activity.field_name === 'priority' && (
                                                                            <>
                                                                            <span
                                                                                className={`${styles.changePriority} ${styles[`priority${activity.old_value?.charAt(0).toUpperCase() + activity.old_value?.slice(1)}`] || ''}`}>
                                                                                <PriorityIcon priorityId={`${activity.old_value}`}/> {activity.old_value}
                                                                            </span>
                                                                                <span
                                                                                    className={styles.changeArrow}><MoveRight size={16} /> </span>
                                                                                <span
                                                                                    className={`${styles.changePriority} ${styles[`priority${activity.new_value?.charAt(0).toUpperCase() + activity.new_value?.slice(1)}`] || ''}`}>
                                                                                    <PriorityIcon priorityId={`${activity.new_value}`}/> {activity.new_value}
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
                                                                                <span
                                                                                    className={styles.changeArrow}>
                                                                                    <MoveRight size={16}/>
                                                                                </span>
                                                                                <span className={styles.changeText}>
                                                                                    {activity.new_value?.last_name
                                                                                        ? `${activity.new_value.last_name} ${activity.new_value.first_name}`
                                                                                        : 'Unassigned'}
                                                                                </span>
                                                                            </>
                                                                        )}

                                                                        {activity.field_name === 'title' && (
                                                                            <>
                                                                                <span
                                                                                    className={styles.changeTextOld}>{activity.old_value}</span>
                                                                                <span
                                                                                    className={styles.changeArrow}><MoveRight size={16} /> </span>
                                                                                <span
                                                                                    className={styles.changeText}>{activity.new_value}</span>
                                                                            </>
                                                                        )}

                                                                        {activity.field_name === 'subtask' && (
                                                                            <>
                                                                                <span className={styles.changeText}>
                                                                                    {'added subtask '}
                                                                                    <Link
                                                                                        to={`/projects/${projectId}/task/${activity.new_value.at(-1)?.id}`}
                                                                                        className={styles.activityTaskLink}>
                                                                                        {activity.new_value.at(-1)?.title}
                                                                                    </Link>
                                                                                </span>
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

                                                                        {activity.field_name === 'due_date' && (
                                                                            <>
                                                                                <span className={styles.changeTextOld}>
                                                                                    {activity.old_value ? new Date(activity.old_value).toLocaleDateString() : 'Not set'}
                                                                                </span>
                                                                                <span className={styles.changeArrow}><MoveRight size={16} /> </span>
                                                                                <span className={styles.changeText}>
                                                                                    {activity.new_value ? new Date(activity.new_value).toLocaleDateString() : 'Not set'}
                                                                                </span>
                                                                            </>
                                                                        )}

                                                                        {activity.field_name === 'start_date' && (
                                                                            <>
                                                                                <span className={styles.changeTextOld}>
                                                                                    {activity.old_value ? new Date(activity.old_value).toLocaleDateString() : 'Not set'}
                                                                                </span>
                                                                                <span className={styles.changeArrow}><MoveRight size={16} /></span>
                                                                                <span className={styles.changeText}>
                                                                                    {activity.new_value ? new Date(activity.new_value).toLocaleDateString() : 'Not set'}
                                                                                </span>
                                                                            </>
                                                                        )}

                                                                        {!['status', 'priority', 'assignee', 'title', 'task', 'subtask', 'description', 'start_date', 'due_date'].includes(activity.field_name) && (
                                                                            <span className={styles.changeText}>
                                                                            {activity.field_name} updated
                                                                        </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {totalActivitiesPages > 1 && (
                                        <div className={styles.pagination}>
                                            <button
                                                className={styles.pageBtn}
                                                onClick={() => loadActivities(activitiesOffset - ACTIVITIES_PER_PAGE)}
                                                disabled={activitiesOffset === 0 || activitiesLoading}
                                            >
                                                <ChevronLeft size={16}/>
                                            </button>
                                            <span className={styles.pageInfo}>
                                            {Math.floor(activitiesOffset / ACTIVITIES_PER_PAGE) + 1} / {totalActivitiesPages || 1}
                                        </span>
                                            <button
                                                className={styles.pageBtn}
                                                onClick={() => loadActivities(activitiesOffset + ACTIVITIES_PER_PAGE)}
                                                disabled={
                                                    activitiesOffset + ACTIVITIES_PER_PAGE >= activitiesTotal ||
                                                    activitiesLoading
                                                }
                                            >
                                                <ChevronRight size={16}/>
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Clock size={48}/>
                                    <h3>No activity yet</h3>
                                    <p>This user hasn't made any actions yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tasks Tab */}
                    {activeTab === 'tasks' && (
                        <div className={styles.tabContent}>
                            {tasksLoading ? (
                                <div className="app-loading-container">
                                    <div className={"spinner-container"}>
                                        <Preloader/>
                                    </div>
                                </div>
                            ) : tasks.length > 0 ? (
                                <>
                                    <div className={styles.tasksList}>
                                        {tasks.map((task) => (
                                            <Link
                                                key={task.id}
                                                to={`/projects/${projectId}/task/${task.id}`}
                                                className={styles.taskItem}
                                            >
                                                <div className={styles.taskHeader}>
                                                    <div className={styles.taskPriority}
                                                         style={{color: getPriorityColor(task.priority)}}>
                                                        {getPriorityIcon(task.priority)}
                                                        <span>{task.priority}</span>
                                                    </div>
                                                    <div className={styles.taskStatus} style={{
                                                        color: task.status?.color,
                                                        backgroundColor: `${task.status?.color}20`
                                                    }}>
                                                        <span>{task.status?.name}</span>
                                                    </div>
                                                </div>
                                                <h4 className={styles.taskTitle}>{task.title}</h4>
                                                {task.tags && task.tags.length > 0 && (
                                                    <div className={styles.taskTags}>
                                                        {task.tags.slice(0, 3).map((tag) => (
                                                            <span
                                                                key={tag.id}
                                                                className={styles.taskTag}
                                                                style={{
                                                                    backgroundColor: `${tag.color}20`,
                                                                    color: tag.color,
                                                                    borderColor: tag.color
                                                                }}
                                                            >
                                                                {tag.title}
                                                            </span>
                                                        ))}
                                                        {task.tags.length > 3 && (
                                                            <span className={styles.taskTagMore}>
                                                                +{task.tags.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className={styles.taskLastRow}>
                                                    <div className={styles.taskDueDate}>
                                                        <Calendar size={12}/>
                                                        <span>Start {new Date(task.start_date).toLocaleDateString()}</span>
                                                    </div>
                                                    {task.due_date && (
                                                        <div className={styles.taskDueDate}>
                                                        <Flag size={12}/>
                                                            <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                    {task.parent_task_id && (
                                                        <div className={styles.taskDueDate}>
                                                            <Blocks size={14}/>
                                                            <span>Subtask</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>

                                    {totalTasksPages > 1 && (
                                        <div className={styles.pagination}>
                                            <button
                                                className={styles.pageBtn}
                                                onClick={() => loadTasks(tasksPage - 1)}
                                                disabled={tasksPage === 1 || tasksLoading}
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className={styles.pageInfo}>
                                                {tasksPage} / {totalTasksPages}
                                            </span>
                                            <button
                                                className={styles.pageBtn}
                                                onClick={() => loadTasks(tasksPage + 1)}
                                                disabled={tasksPage === totalTasksPages || tasksLoading}
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className={styles.emptyState}>
                                    <CheckCircle size={48} />
                                    <h3>No tasks assigned</h3>
                                    <p>This user has no tasks assigned yet</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarSection}>
                        <div className={styles.profileInfo}>
                            <div className={styles.avatarContainer}>
                                <div
                                    className={styles.avatar}
                                    style={{backgroundColor: user.color || '#8B5CF6'}}
                                >
                                    {(user.last_name?.[0] || '') + (user.first_name?.[0] || '')}
                                </div>
                            </div>

                            <div className={styles.profileMeta}>
                                <h2 className={styles.userName}>
                                    {user.last_name} {user.first_name}
                                </h2>
                                <p className={styles.userNickname}>
                                    {member?.role_in_team || `@${user.nickname}`}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Информация */}
                    <div className={styles.sidebarSection}>
                        <h3 className={styles.sidebarTitle}>
                            <Info size={16}/>
                            Information
                        </h3>

                        <div className={styles.infoItem}>
                            <span><AtSign size={16}/> Username</span>
                            <span>@{user.nickname}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span><Mail size={16}/> Email</span>
                            <span>{user.email}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span><Calendar size={16}/> Registered</span>
                            <span>{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span><Calendar size={16}/> Updated</span>
                            <span>{new Date(user.updated_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Проектная информация */}
                    <div className={styles.sidebarSection}>
                        <h3 className={styles.sidebarTitle}>
                            <Hash size={16}/>
                            Project Info
                        </h3>

                        <div className={styles.infoItem}>
                            <span><ShieldUser size={20}/> Role</span>
                            <span className={styles.roleBadge}>
                                {member.permission_level === 'owner' ? 'Owner' :
                                    member.permission_level === 'admin' ? 'Admin' : 'Member'}
                            </span>
                        </div>
                        <div className={styles.infoItem}>
                            <span><Calendar size={16}/> Joined</span>
                            <span>{new Date(member.joined_at).toLocaleDateString()}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span><Key size={16}/> Permissions Granted</span>
                            <span>{new Date(member.granted_at).toLocaleDateString()}</span>
                        </div>
                        {member?.granted_by && (
                            <div className={styles.infoItem}>
                                <span><Handshake size={16}/> Granted By</span>
                                <Link
                                    to={`/projects/${projectId}/member/${member.granted_by_id}`}
                                    className={styles.linkToUser}
                                >
                                    {`${member.granted_by.last_name} ${member.granted_by.first_name}`}
                                </Link>
                            </div>
                        )}
                        {member?.last_seen_at && (
                            <div className={styles.infoItem}>
                                <span><Activity size={16}/> Last Visit</span>
                                <span>{formatTimeAgo(member.last_seen_at)}</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.sidebarSection}>
                        <h3 className={styles.sidebarTitle}>
                            <UserCog size={16}/>
                            Actions
                        </h3>
                        {isOwnProfile ? (
                            <div className={styles.actionButtons}>
                                <button
                                    className={styles.actionBtn}
                                    onClick={handleOpenEdit}
                                    disabled={actionLoading}
                                >
                                    <Pen size={16}/>
                                    Edit Profile
                                </button>
                                <button
                                    className={styles.actionBtn}
                                    disabled={actionLoading}
                                    onClick={onLogout}
                                >
                                    <LogOut size={16}/>
                                    Logout
                                </button>
                            </div>
                        ) : canManage ? (
                            <div className={styles.actionButtons}>
                                {member.permission_level !== 'admin' && (
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => setConfirmModal({
                                            title: 'Set Admin Permission',
                                            type: 'permissions-admin'
                                        })}
                                        disabled={actionLoading}
                                    >
                                        Promote to Admin
                                    </button>
                                )}
                                {member.permission_level === 'admin' && (
                                    <button
                                        className={`${styles.actionBtn}`}
                                        onClick={() => setConfirmModal({
                                            title: 'Set Member Permission',
                                            type: 'permissions-member'
                                        })}
                                        disabled={actionLoading}
                                    >
                                        Demote to Member
                                    </button>
                                )}
                                <button
                                    className={`${styles.actionBtn}`}
                                    onClick={() => setConfirmModal({
                                        title: 'Transfer Ownership',
                                        confirmVariant: 'danger',
                                        confirmText: 'Transfer Ownership',
                                        type: 'transfer-ownership'
                                    })}
                                    disabled={actionLoading}
                                >
                                    Transfer Ownership
                                </button>
                                <button
                                    className={`${styles.actionBtn}`}
                                    onClick={() => setConfirmModal({
                                        title: 'Remove Member',
                                        confirmVariant: 'danger',
                                        confirmText: 'Remove Member',
                                        type: 'remove-member'
                                    })}

                                    disabled={actionLoading}
                                >
                                    Remove from Project
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
            <ConfirmModal
                isOpen={!!confirmModal}
                title={confirmModal?.title}
                confirmVariant={confirmModal?.confirmVariant || 'primary'}
                confirmText={confirmModal?.confirmText}
                onClose={() => setConfirmModal(null)}
                onConfirm={() => {
                    if (confirmModal?.type === 'permissions-admin') {
                        handleChangePermissions(member?.user_id, 'admin');
                    } else if (confirmModal?.type === 'permissions-member') {
                        handleChangePermissions(member?.user_id, 'member');
                    } else if (confirmModal?.type === 'remove-member') {
                        handleRemoveMember(member?.user_id);
                    } else if (confirmModal?.type === 'transfer-ownership') {
                        handleTransferOwnership(member?.user_id);
                    }
                    setConfirmModal(null);
                }}
            >
                {confirmModal && (() => {
                    switch(confirmModal.type) {
                        case 'permissions-member':
                            return <MemberPermissionsContent member={member} />;
                        case 'permissions-admin':
                            return <AdminPermissionsContent member={member} />;
                        case 'remove-member':
                            return <RemoveMemberContent member={member} />;
                        case 'transfer-ownership':
                            return <TransferOwnershipContent member={member} />;
                        default:
                            return null;
                    }
                })()}
            </ConfirmModal>
            <ConfirmModal
                isOpen={isEditModalOpen}
                title="Edit Profile"
                confirmText="Save Changes"
                onClose={() => setIsEditModalOpen(false)}
                onConfirm={handleSaveProfile}
                isLoading={actionLoading}
            >
                <div className={styles.editProfileForm}>
                    <div className={styles.editFieldGroup}>
                        <label className={styles.editLabel}>Last Name</label>
                        <input
                            type="text"
                            className={styles.editInput}
                            value={editForm.last_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                            placeholder="Last name"
                        />
                    </div>

                    <div className={styles.editFieldGroup}>
                        <label className={styles.editLabel}>First Name</label>
                        <input
                            type="text"
                            className={styles.editInput}
                            value={editForm.first_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                            placeholder="First name"
                        />
                    </div>

                    <div className={styles.editFieldGroup}>
                        <label className={styles.editLabel}>Nickname</label>
                        <div className={styles.editInputWithPrefix}>
                            <span className={styles.editPrefix}>@</span>
                            <input
                                type="text"
                                className={styles.editInputPrefixed}
                                value={editForm.nickname}
                                onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                                placeholder="nickname"
                            />
                        </div>
                    </div>
                </div>
            </ConfirmModal>
        </div>
    );
}
