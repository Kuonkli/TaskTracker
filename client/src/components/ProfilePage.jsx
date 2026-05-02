import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Mail, Calendar, Clock, Tag, Loader,
    ChevronLeft, ChevronRight, MessageSquare,
    GitBranch, UserPlus, CheckCircle, AlertCircle,
    Pause, Play, Edit3, Trash2, Flag, AtSign, Blocks,
    LayersPlus, ShieldUser, Key, Handshake, UserCog,
    Activity, Hash, Info, Pen, LogOut
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { projectService } from '../services/projectService';
import Preloader, { PriorityIcon } from "./CommonComponents";
import styles from '../styles/ProfilePage.module.css';

const TASKS_PER_PAGE = 10;
const ACTIVITIES_PER_PAGE = 20;

export default function ProfilePage({ currentUser }) {
    const navigate = useNavigate();
    const { projectId, userId } = useParams();
    const { showToast, handleApiError } = useToast();

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

    const canManage = member && (
        member.permission_level === 'owner' ||
        member.permission_level === 'admin'
    );

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

    // Profile actions
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

    const handleRemoveMember = async () => {
        if (!window.confirm(`Are you sure you want to remove ${user.first_name} ${user.last_name} from the project?`)) {
            return;
        }

        try {
            setActionLoading(true);
            await projectService.removeMember(projectId, targetUserId);
            showToast('Member removed successfully', 'success');
            navigate(`/project/${projectId}/members`);
        } catch (error) {
            handleApiError(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTransferOwnership = async () => {
        if (!window.confirm(
            `Are you sure you want to transfer ownership to ${user.first_name} ${user.last_name}?\n\n` +
            'You will become an admin member.'
        )) {
            return;
        }

        try {
            setActionLoading(true);
            await projectService.transferOwnership(projectId, targetUserId);
            showToast('Ownership transferred successfully', 'success');
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

    const getStatusIcon = (statusType) => {
        switch (statusType) {
            case 'completed': return <CheckCircle size={14} />;
            case 'paused': return <Pause size={14} />;
            case 'progress': return <Play size={14} />;
            case 'cancelled': return <AlertCircle size={14} />;
            default: return <Clock size={14} />;
        }
    };

    const getActivityIcon = (type, fieldName) => {
        if (type === 'comment') return <MessageSquare size={16} />;

        switch (fieldName) {
            case 'status': return <GitBranch size={16} />;
            case 'assignee': return <UserPlus size={16} />;
            case 'priority': return <AlertCircle size={16} />;
            case 'title': return <Edit3 size={16} />;
            case 'description': return <Edit3 size={16} />;
            case 'task': return <LayersPlus size={16} />;
            case 'due_date': return <Flag size={16} />;
            case 'subtask': return <Blocks size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const getActivityColor = (type, fieldName) => {
        if (type === 'comment') return '#8B5CF6';
        switch (fieldName) {
            case 'task': return '#10B981';
            default: return '#6366F1';
        }
    };

    const formatActivityDescription = (activity) => {
        if (activity.type === 'comment') {
            return (
                <div className={styles.activityDescription}>
                    <span>commented on </span>
                    <Link
                        to={`/project/${projectId}/task/${activity.task_id}`}
                        className={styles.activityLink}
                    >
                        {activity.task?.title || 'task'}
                    </Link>
                </div>
            );
        }

        switch (activity.field_name) {
            case 'status':
                return (
                    <div className={styles.activityDescription}>
                        <span>changed status from </span>
                        <span
                            style={{
                                background: `${activity.old_value?.color}20`,
                                padding: '2px 8px',
                                borderRadius: '8px',
                                border: `1px solid ${activity.old_value?.color}50`,
                                color: activity.old_value?.color,
                                margin: '0 4px'
                            }}
                        >
                            {activity.old_value?.name}
                        </span>
                        <span> to </span>
                        <span
                            style={{
                                background: `${activity.new_value?.color}20`,
                                padding: '2px 4px',
                                borderRadius: '8px',
                                border: `1px solid ${activity.new_value?.color}50`,
                                color: activity.new_value?.color,
                                margin: '0 4px'
                            }}
                        >
                            {activity.new_value?.name}
                        </span>
                        <span> in </span>
                        <Link
                            to={`/project/${projectId}/task/${activity.task_id}`}
                            className={styles.activityLink}
                        >
                            {activity.task?.title || 'task'}
                        </Link>
                    </div>
                );
            case 'assignee':
                return (
                    <div className={styles.activityDescription}>
                        <span>changed assignee from </span>
                        <span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>
                            { activity.old_value?.last_name ? `${activity.old_value?.last_name} ${activity.old_value?.first_name} (@${activity.old_value?.nickname})` : 'Unassigned'}
                        </span>
                        <span> to </span>
                        <span style={{ fontWeight: 400, color: 'var(--text-primary)' }}>
                            { activity.new_value?.last_name ? `${activity.new_value?.last_name} ${activity.new_value?.first_name} (@${activity.new_value?.nickname})` : 'Unassigned'}
                        </span>
                        <span> in </span>
                        <Link
                            to={`/project/${projectId}/task/${activity.task_id}`}
                            className={styles.activityLink}
                        >
                            {activity.task?.title || 'task'}
                        </Link>
                    </div>
                );
            case 'priority':
                return (
                    <div className={styles.activityDescription}>
                        <span>changed priority from </span>
                        <span style={{
                            color: getPriorityColor(activity.old_value),
                            fontWeight: 500
                        }}>
                            {activity.old_value}
                        </span>
                        <span> to </span>
                        <span style={{
                            color: getPriorityColor(activity.new_value),
                            fontWeight: 500
                        }}>
                            {activity.new_value}
                        </span>
                        <span> in </span>
                        <Link
                            to={`/project/${projectId}/task/${activity.task_id}`}
                            className={styles.activityLink}
                        >
                            {activity.task?.title || 'task'}
                        </Link>
                    </div>
                );
            case 'task':
                return (
                    <div className={styles.activityDescription}>
                        <span>created task </span>
                        <Link
                            to={`/project/${projectId}/task/${activity.task_id}`}
                            className={styles.activityLink}
                        >
                            {activity.task?.title || 'task'}
                        </Link>
                    </div>
                );
            case 'title':
                return (
                    <div className={styles.activityDescription}>
                        <span>changed task title from</span>
                        <span style={{ margin: '0 4px', color: 'var(--text-primary)' }}> {activity.old_value} </span>
                        <span> to </span>
                        <span style={{ margin: '0 4px', color: 'var(--text-primary)' }}> {activity.new_value} </span>
                        <span> in </span>
                        <Link
                            to={`/project/${projectId}/task/${activity.task_id}`}
                            className={styles.activityLink}
                        >
                            {activity.task?.title || 'task'}
                        </Link>
                    </div>
                );
            default:
                return (
                    <div className={styles.activityDescription}>
                        <span>changed {activity.field_name} in </span>
                        <Link
                            to={`/project/${projectId}/task/${activity.task_id}`}
                            className={styles.activityLink}
                        >
                            {activity.task?.title || 'task'}
                        </Link>
                    </div>
                );
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
                    <ArrowLeft size={20} />
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
                                        {activities.map((activity) => (
                                            <div key={activity.id} className={styles.activityItem}>
                                                <div
                                                    className={styles.activityIcon}
                                                    style={{ backgroundColor: `${getActivityColor(activity.type, activity.field_name)}20` }}
                                                >
                                                    <div style={{ color: getActivityColor(activity.type, activity.field_name) }}>
                                                        {getActivityIcon(activity.type, activity.field_name)}
                                                    </div>
                                                </div>
                                                <div className={styles.activityContent}>
                                                    {formatActivityDescription(activity)}
                                                    <span className={styles.activityTime}>
                                                        {formatTimeAgo(activity.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={styles.pagination}>
                                        <button
                                            className={styles.pageBtn}
                                            onClick={() => loadActivities(activitiesOffset - ACTIVITIES_PER_PAGE)}
                                            disabled={activitiesOffset === 0 || activitiesLoading}
                                        >
                                            <ChevronLeft size={16} />
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
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Clock size={48} />
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
                                                to={`/project/${projectId}/task/${task.id}`}
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
                                    to={`/project/${projectId}/member/${member.granted_by_id}`}
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
                                    disabled={actionLoading}
                                >
                                    <Pen size={16}/>
                                    Edit Profile
                                </button>
                                <button
                                    className={styles.actionBtn}
                                    disabled={actionLoading}
                                >
                                    <LogOut size={16}/>
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className={styles.actionButtons}>
                                {member.permission_level !== 'admin' && (
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => handleChangeRole('admin')}
                                        disabled={actionLoading}
                                    >
                                        Promote to Admin
                                    </button>
                                )}
                                {member.permission_level === 'admin' && (
                                    <button
                                        className={`${styles.actionBtn}`}
                                        onClick={() => handleChangeRole('member')}
                                        disabled={actionLoading}
                                    >
                                        Demote to Member
                                    </button>
                                )}
                                <button
                                    className={`${styles.actionBtn}`}
                                    onClick={handleTransferOwnership}
                                    disabled={actionLoading}
                                >
                                    Transfer Ownership
                                </button>
                                <button
                                    className={`${styles.actionBtn}`}
                                    onClick={handleRemoveMember}
                                    disabled={actionLoading}
                                >
                                    Remove from Project
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}