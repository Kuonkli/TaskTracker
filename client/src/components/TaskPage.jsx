import React, {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams, Link} from 'react-router-dom';
import {
    ArrowLeft,
    Ban,
    Blocks,
    Calendar,
    CalendarCheck,
    CalendarClock,
    CalendarX,
    Check,
    CheckSquare, Info,
    Clock,
    CloudCheck,
    Flag,
    MessageCircle,
    MessageSquare,
    MoreVertical,
    MoveRight,
    Pause,
    Pen,
    Play,
    Plus,
    Redo2,
    RotateCcw,
    TrendingUp,
    User,
    UserX,
    X,
    Pencil,
    FileText,
    RefreshCw,
    Zap,
    Tag,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import CreateTaskModal from './CreateTaskModal';
import '../styles/TaskPage.css';
import AddAttachment from "./AddAttachment";
import Preloader, {CustomUserAvatar, PriorityIcon} from "./CommonComponents";
import CustomInputSelector from "./CustomInputSelector";
import {projectService} from "../services/projectService";

// Конфигурация кнопок
const STATUS_ACTIONS = {
    'todo': [
        { type: 'progress', label: 'Start work', icon: Play },
        { type: 'cancelled', label: 'Cancel', icon: Ban }
    ],
    'progress': [
        { type: 'todo', label: 'Reopen', icon: RotateCcw },
        { type: 'paused', label: 'Pause work', icon: Pause },
        { type: 'completed', label: 'Complete', icon: Check },
        { type: 'cancelled', label: 'Cancel', icon: Ban }
    ],
    'paused': [
        { type: 'todo', label: 'Reopen', icon: RotateCcw },
        { type: 'progress', label: 'Resume work', icon: Play },
        { type: 'completed', label: 'Complete', icon: Check },
        { type: 'cancelled', label: 'Cancel', icon: Ban }
    ],
    'completed': [
        { type: 'todo', label: 'Reopen', icon: RotateCcw },
        { type: 'progress', label: 'Restart', icon: Redo2 }
    ],
    'cancelled': [
        { type: 'todo', label: 'Reopen', icon: RotateCcw },
        { type: 'progress', label: 'Restart', icon: Redo2 }
    ]
};

export default function TaskPage({ currentUser }) {
    const { projectId, taskId } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activitiesState, setActivitiesState] = useState({
        all: { items: [], offset: 0, total: 0, hasMore: true, loading: false },
        comments: { items: [], offset: 0, total: 0, hasMore: true, loading: false },
        changes: { items: [], offset: 0, total: 0, hasMore: true, loading: false }
    });
    const [projectMembers, setProjectMembers] = useState([]);
    const [projectTags, setProjectTags] = useState([])
    const [projectStatuses, setProjectStatuses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [comment, setComment] = useState('');
    const [activeTab, setActiveTab] = useState('comments');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
    const [isTitleHovered, setIsTitleHovered] = useState(false);
    const [isDescriptionHovered, setIsDescriptionHovered] = useState(false);
    const [isAssigneeHovered, setAssigneeHovered] = useState(false);

    // Для бесконечного скролла
    const [loadingMore, setLoadingMore] = useState(false);
    const observerRef = useRef(null);
    const lastActivityRef = useRef(null);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isEditingAssignee, setIsEditingAssignee] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedAssignee, setEditedAssignee] = useState(null);

    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);

    // Загрузка данных задачи
    useEffect(() => {
        if (projectId && taskId) {
            setIsLoading(true);
            loadTaskData();
        }
    }, [projectId, taskId]);

    useEffect(() => {
        if (projectId) {
            loadProjectData()
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId && taskId && !isLoading) {
            loadActivities(true);
        }
    }, [activeTab, isLoading]);

    // Настройка Intersection Observer для бесконечного скролла
    useEffect(() => {
        const currentTabState = activitiesState[activeTab];

        if (!currentTabState.hasMore || currentTabState.loading || loadingMore) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && currentTabState.hasMore && !currentTabState.loading && !loadingMore) {
                    loadActivities(false); // load more
                }
            },
            { threshold: 0.1, rootMargin: "100px" }
        );

        if (lastActivityRef.current) {
            observer.observe(lastActivityRef.current);
        }

        return () => observer.disconnect();
    }, [activitiesState[activeTab].hasMore, activitiesState[activeTab].loading, activeTab, lastActivityRef.current]);

    const loadProjectData = async () => {
        try {
            const response = await projectService.getProjectDetails(projectId);
            setProjectTags(response.tags);
            if (response.members) {
                setProjectMembers(response.members);
            }
            if (response.statuses) {
                setProjectStatuses(response.statuses);
            }
        } catch (err) {
            console.error('Failed to load tags:', err);
        } finally {
            setIsLoading(false)
        }
    };

    const loadTaskData = async () => {
        setError(null);
        try {
            const response = await projectService.getTask(projectId, taskId);
            setTask(response);
            setEditedTitle(response.title);
            setEditedDescription(response.description || '');
            setEditedAssignee(response.assignee);
        } catch (err) {
            console.error('Failed to load task:', err);
            setError(err.message || 'Failed to load task');
        } finally {
            setIsLoading(false);
        }
    };

    // Новая функция загрузки активностей с пагинацией
    const loadActivities = async (reset = false) => {
        const currentState = activitiesState[activeTab];

        if (currentState.loading) return;

        const offset = reset ? 0 : currentState.offset;
        const limit = 30; // Загружаем по 30 записей за раз

        setActivitiesState(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], loading: true }
        }));

        if (!reset) {
            setLoadingMore(true);
        }

        try {
            let items = [];
            let total = 0;

            if (activeTab === 'changes') {
                const response = await projectService.getTaskChanges(projectId, taskId, "", limit, offset);
                items = (response.changes || []).map(item => ({ ...item, type: 'change' }));
                total = response.total || 0;
            }
            else if (activeTab === 'comments') {
                const response = await projectService.getTaskComments(projectId, taskId, limit, offset);
                items = (response.comments || []).map(item => ({ ...item, type: 'comment' }));
                total = response.total || 0;
            }
            else {
                const response = await projectService.getTaskActivities(projectId, taskId, limit, offset);
                items = response.activities || [];
                total = response.total || 0;
            }

            setActivitiesState(prev => ({
                ...prev,
                [activeTab]: {
                    items: reset ? items : [...prev[activeTab].items, ...items],
                    offset: offset + items.length,
                    total: total,
                    hasMore: (offset + items.length) < total,
                    loading: false
                }
            }));

        } catch (err) {
            console.error('Failed to load activities:', err);
            setActivitiesState(prev => ({
                ...prev,
                [activeTab]: { ...prev[activeTab], loading: false }
            }));
        } finally {
            if (!reset) {
                setLoadingMore(false);
            }
        }
    };

    const currentActivities = activitiesState[activeTab].items;
    const hasMore = activitiesState[activeTab].hasMore;
    const isLoadingActivities = activitiesState[activeTab].loading;

    const availableActions = task ? STATUS_ACTIONS[task.status?.status_type] || [] : [];

    const handleStatusActionClick = (action) => {
        const targetStatuses = projectStatuses.filter(
            status => status.status_type === action.type
        );

        if (targetStatuses?.length === 1) {
            handleStatusChange(targetStatuses[0]);
        } else {
            setSelectedAction(action);
            setIsStatusModalOpen(true);
        }
    };

    const handleStatusChange = async (targetStatus) => {
        try {
            await projectService.updateTaskStatus(projectId, taskId, targetStatus.id);
            setTask((prev) => ({
              ...prev,
              status: targetStatus,
            }))
            await loadActivities(true);
            await getTimeInStatus();
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleStartEditAssignee = () => {
        setIsEditingAssignee(true);
    };

    const handleCancelEditAssignee = () => {
        setIsEditingAssignee(false);
        setEditedAssignee(task?.assignee);
    };

    const handleAssignToCurrent = async () => {
        try {
            await projectService.updateTaskAssignee(projectId, taskId, currentUser.id || null);
            setEditedAssignee(currentUser || null)
            await loadActivities(true);
        } catch (err) {
            console.error('Failed to update assignee:', err);
        }
    }

    const handleSaveAssignee = async (assignee) => {
        setIsEditingAssignee(false);
        try {
            await projectService.updateTaskAssignee(projectId, taskId, assignee?.user.id || null);
            setEditedAssignee(assignee.user || null)
            await loadActivities(true);
        } catch (err) {
            console.error('Failed to update assignee:', err);
        }
    };

    const handleStartEditTitle = () => {
        setIsEditingTitle(true);
        setEditedTitle(task.title);
    };

    const handleSaveTitle = async () => {
        if (editedTitle.trim()) {
            try {
                await projectService.updateTask(projectId, taskId, { title: editedTitle.trim() });
                setTask((prev) => ({
                    ...prev,
                    title: editedTitle.trim(),
                }))
                await loadActivities(true);
            } catch (err) {
                console.error('Failed to update title:', err);
            }
        }
        setIsEditingTitle(false);
    };

    const handleCancelEditTitle = () => {
        setIsEditingTitle(false);
        setEditedTitle(task.title);
    };

    const handleStartEditDescription = () => {
        setIsEditingDescription(true);
        setEditedDescription(task.description || '');
    };

    const handleSaveDescription = async () => {
        try {
            await projectService.updateTask(projectId, taskId, { description: editedDescription });
            setTask((prev) => ({
                ...prev,
                description: editedDescription,
            }))
            await loadActivities(true);
        } catch (err) {
            console.error('Failed to update description:', err);
        }
        setIsEditingDescription(false);
    };

    const handleCancelEditDescription = () => {
        setIsEditingDescription(false);
        setEditedDescription(task.description || '');
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            handleCancelEditTitle();
        }
    };

    const handleDescriptionKeyDown = (e) => {
        if (e.key === 'Escape') {
            handleCancelEditDescription();
        }
    };

    const subtaskProgress = task?.subtasks?.length > 0
        ? Math.round((task?.subtasks.filter(st => st.status?.status_type === 'completed' || st.status?.status_type === 'cancelled')?.length / task?.subtasks?.length) * 100)
        : 0;

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (comment.trim()) {
            try {
                await projectService.createComment(projectId, taskId, comment);
                setComment('');
                await loadActivities();
            } catch (err) {
                console.error('Failed to add comment:', err);
            }
        }
    };

    const handleCreateSubtask = async (newTask) => {
        try {
            await loadTaskData();
            await loadActivities(true);
        } catch (err) {
            console.error('Failed to create subtask:', err);
        }
    };

    const handleAttachmentsChange = (newAttachments) => {
        setTask(prev => ({
            ...prev,
            attachments: newAttachments
        }));
    };

    const handleAddTag = async (tag) => {
        const tagsExist = task.tags && Array.isArray(task.tags);

        if (!tagsExist || !task.tags.some(t => t.id === tag.id)) {
            try {
                await projectService.addTagToTask(projectId, taskId, tag.id);
                await loadTaskData();
            } catch (err) {
                console.error('Failed to add tag:', err);
            }
        }
        setIsTagSelectorOpen(false);
    };

    const handleRemoveTag = async (tagId) => {
        try {
            await projectService.removeTagFromTask(projectId, taskId, tagId);
            await loadTaskData();
        } catch (err) {
            console.error('Failed to remove tag:', err);
        }
    };

    useEffect(() => {
        if (taskId && !isLoading) {
            getTimeInStatus();
        }
    }, [projectId, taskId, isLoading]);

    const [timeInStatus, setTimeInStatus] = useState('0m');
    const getTimeInStatus = async () => {
        if (!task || !task.id) setTimeInStatus('0m');
        try {
            const response = await projectService.getTaskChanges(projectId, taskId, "status");
            console.log(response);
            const statusChanges = response.changes || null

            let statusStartTime;
            if (statusChanges && statusChanges?.length > 0) {
                statusStartTime = new Date(statusChanges[0].created_at);
            } else {
                statusStartTime = new Date(task.created_at);
            }

            const now = new Date();
            const diffMs = now - statusStartTime;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            const remainingHours = diffHours % 24;

            if (diffDays > 0) { setTimeInStatus(`${diffDays}d ${remainingHours}h`); return }
            if (diffHours > 0) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60)) - diffHours * 60;
                setTimeInStatus(`${diffHours}h ${diffMinutes}m`);
                return
            }
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            setTimeInStatus(`${diffMinutes > 0 ? diffMinutes : 0}m`);
        } catch (err) {
            setTimeInStatus('0m')
            throw new Error("Error getting time in status: ", err);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="app-loading-container">
                <div className={"spinner-container"}>
                    <Preloader/>
                </div>
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="error-container">
                <p className="error-message">{error || 'Task not found'}</p>
                <button className="retry-btn" onClick={() => navigate(-1)}>
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="task-page">
                <div className="task-page-header">
                    <span className="back-link" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                        <span>Back</span>
                    </span>
                    <div className="header-actions">
                        <button className="icon-btn">
                            <MoreVertical size={18} />
                        </button>
                    </div>
                </div>

                <div className="task-page-content">
                    <div className="task-main">
                        {isEditingTitle ? (
                            <div className="title-edit-container">
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onKeyDown={handleTitleKeyDown}
                                    onBlur={handleSaveTitle}
                                    className="title-edit-input"
                                    autoFocus
                                    placeholder="Enter title..."
                                />
                                <div className="title-edit-actions">
                                    <button
                                        className="title-edit-save"
                                        onClick={handleSaveTitle}
                                        title="Save"
                                    >
                                        <CloudCheck size={16}/>
                                    </button>
                                    <button
                                        className="title-edit-cancel"
                                        onClick={handleCancelEditTitle}
                                        title="Cancel"
                                    >
                                        <X size={16}/>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <span
                                className={`task-title ${isTitleHovered ? 'hovered' : ''}`}
                                onMouseEnter={() => setIsTitleHovered(true)}
                                onMouseLeave={() => setIsTitleHovered(false)}
                            >
                                {task.title}
                                <div
                                    className={`edit-description-text ${isTitleHovered ? 'visible' : ''}`}
                                    onClick={handleStartEditTitle}
                                >
                                    <Pen size={16}/>
                                </div>
                            </span>
                        )}

                        <div className="task-actions-bar">
                            {/* Кнопка смены приоритета */}
                            <button
                                className="priority-action-btn"
                                onClick={() => setIsPriorityModalOpen(true)}
                            >
                                <MessageSquare size={16} />
                                Add Comment
                            </button>
                            <button
                                className="priority-action-btn"
                                onClick={() => setIsPriorityModalOpen(true)}
                            >
                                <TrendingUp size={16} />
                                Change Priority
                            </button>

                            {/* Кнопки статусов */}
                            <div className="status-actions-bar">
                                {availableActions && availableActions?.map(action => {
                                    const Icon = action.icon;
                                    return (
                                        <button
                                            key={action.type}
                                            className={`status-action-btn ${action.variant}`}
                                            onClick={() => handleStatusActionClick(action)}
                                        >
                                            <Icon size={16}/>
                                            <span>{action.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="task-section">
                            <h3>Details</h3>
                            {/* Details Block */}
                            <div className="details-block">
                                <div className="details-grid">
                                    <div className="detail-row">
                                        <span className="detail-label">Type</span>
                                        <div className="detail-value">
                                            {task.parent_task_id ? (
                                                <Blocks size={16}/>
                                            ) : (
                                                <CheckSquare size={16}/>
                                            )}
                                            <span>{task.parent_task_id ? 'Subtask' : 'Task'}</span>
                                        </div>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">Priority</span>
                                        <div className="detail-value">
                                            <PriorityIcon priorityId={task.priority} size={24}/>
                                            <span
                                                className={`task-detail-priority task-detail-priority-${task.priority}`}
                                            >
                                                {task.priority.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">Status</span>
                                        <div className="detail-value">
                                            <div
                                                className="detail-status-indicator"
                                                style={{backgroundColor: task.status.color}}
                                            />
                                            <span style={{
                                                color: task.status.color,
                                                fontWeight: 500
                                            }}>{task.status.name.toUpperCase()}</span>
                                        </div>
                                    </div>

                                    <div className="detail-row">
                                        <span className="detail-label">Time in status</span>
                                        <div className="detail-value">
                                            <Clock size={14}/>
                                            <span>{timeInStatus}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="tags-container">
                                        <span className="detail-label">Tags</span>
                                        {task.tags && task.tags?.map(tag => (
                                            <div
                                                key={tag.id}
                                                className="tag-chip"
                                                style={{
                                                    backgroundColor: `${tag.color}20`,
                                                    borderColor: tag.color,
                                                    color: tag.color
                                                }}
                                            >
                                                <span>{tag.title}</span>
                                                <X
                                                    size={12}
                                                    className={"tag-chip-cross"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveTag(tag.id);
                                                    }}
                                                />
                                            </div>
                                        ))}

                                        {isTagSelectorOpen ? (
                                            <div className="tag-selector-wrapper">
                                                <CustomInputSelector
                                                    availableItems={task.tags ? projectTags.filter(tag =>
                                                        !task.tags.some(t => t.id === tag.id)
                                                    ) : projectTags}
                                                    onSelect={handleAddTag}
                                                    placeholder="Search tags..."
                                                    renderItem={(tag) => (
                                                        <div className="details-selector-tag-renderer">
                                                            <span
                                                                className="details-selector-tag-color-dot"
                                                                style={{backgroundColor: tag.color || '#8B5CF6'}}
                                                            />
                                                            {tag.title}
                                                        </div>
                                                    )}
                                                    getItemId={(tag) => tag.id}
                                                    getItemName={(tag) => tag.title}
                                                    autoFocus={true}
                                                />
                                                <button
                                                    className="tag-selector-close"
                                                    onClick={() => setIsTagSelectorOpen(false)}
                                                >
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                        ) : (
                                            <span
                                                className={"add-tag-chip"}
                                                onClick={() => setIsTagSelectorOpen(true)}
                                            >
                                                + Add
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Description */}
                        <div className="task-section">
                            <div className="description-label-container"
                                 onMouseEnter={() => setIsDescriptionHovered(true)}
                                 onMouseLeave={() => setIsDescriptionHovered(false)}
                            >
                                <h3>Description</h3>
                                {!isEditingDescription && (
                                    <div
                                        className={`edit-description-text ${isDescriptionHovered ? 'visible' : ''}`}
                                        onClick={handleStartEditDescription}
                                    >
                                        <Pen size={16}/>
                                    </div>
                                )}
                            </div>

                            {isEditingDescription ? (
                                <div className="description-edit-container">
                                    <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        onKeyDown={handleDescriptionKeyDown}
                                        className="task-description-text-area description-editing"
                                        autoFocus
                                        placeholder="Enter description..."
                                    />
                                    <div className="description-edit-actions">
                                        <button
                                            className="description-edit-save"
                                            onClick={handleSaveDescription}
                                            title="Save"
                                        >
                                            <CloudCheck size={16}/>
                                        </button>
                                        <button
                                            className="description-edit-cancel"
                                            onClick={handleCancelEditDescription}
                                            title="Cancel"
                                        >
                                            <X size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="description-display"
                                    onMouseEnter={() => setIsDescriptionHovered(true)}
                                    onMouseLeave={() => setIsDescriptionHovered(false)}
                                >
                                    {task.description ||
                                        <span className="description-placeholder">No description</span>}
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        <div className="task-section">
                            <h3>Attachments</h3>
                            <AddAttachment
                                attachments={task.attachments || []}
                                onAttachmentsChange={handleAttachmentsChange}
                            />
                        </div>

                        {/* Subtasks */}
                        {!task.parent_task_id && (
                            <div className="task-section">
                                <div className="subtasks-header">
                                    <h3>Subtasks</h3>
                                    <button
                                        className="add-subtask-btn"
                                        onClick={() => setIsCreateModalOpen(true)}
                                    >
                                        <Plus size={16}/>
                                        <span>Add subtask</span>
                                    </button>
                                </div>

                                {!task.parent_task_id && task.subtasks && task?.subtasks.length > 0 && (
                                    <div className="subtasks-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{width: `${subtaskProgress}%`}}
                                            />
                                        </div>
                                        <span className="progress-text">{subtaskProgress}% complete</span>
                                    </div>
                                )}

                                <div className="subtasks-list">
                                    {task.subtasks && task?.subtasks.map(subtask => (
                                        <div key={subtask.id} className="subtask-item-new"
                                             onClick={() => navigate(`/project/${projectId}/task/${subtask.id}`)}>
                                            <div className={"subtask-icon-container"}>
                                                <Blocks size={14} className={"subtask-icon"}/>
                                            </div>
                                            <div className="subtask-content">
                                            <span className={subtask.status.status_type}>
                                                {subtask.title}
                                            </span>
                                                <div className="subtask-meta-new">
                                                    {subtask.assignee && (
                                                        <div className="subtask-assignee">
                                                            <CustomUserAvatar user={subtask.assignee}
                                                                              color={subtask.assignee.color}
                                                                              size={'2.5em'}
                                                                              fontSize={'10px'}/>
                                                            <span>{subtask.assignee.last_name} {subtask.assignee.first_name}</span>
                                                        </div>
                                                    )}

                                                    <span
                                                        className={`subtask-priority-indicator subtask-priority-${subtask.priority}`}>
                                                    <PriorityIcon priorityId={subtask.priority}/> {subtask.priority}
                                                </span>
                                                </div>
                                            </div>
                                            <div className={"subtask-status"} style={{position: 'relative'}}>
                                                <div
                                                    className="status-badge"
                                                    style={{
                                                        backgroundColor: subtask.status.color,
                                                        opacity: 0.2,
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0
                                                    }}
                                                />
                                                <span className="status-badge"
                                                      style={{color: subtask.status.color, position: 'relative'}}>
                                                {subtask.status.name}
                                            </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comments & Activity Section*/}
                        <div className="task-section">
                            <div className="comments-header">
                                <h3>Comments & Activity</h3>
                                <div className="comments-tabs">
                                    <button
                                        className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('comments')}
                                    >
                                        Comments
                                    </button>
                                    <button
                                        className={`tab ${activeTab === 'changes' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('changes')}
                                    >
                                        Changes
                                    </button>
                                    <button
                                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('all')}
                                    >
                                        All
                                    </button>
                                </div>
                            </div>

                            <div className="activities-list">
                                {isLoadingActivities && currentActivities.length === 0 ? (
                                    <div className="loading-activities">
                                        <Preloader size={"32px"} />
                                        <p>Loading {activeTab}...</p>
                                    </div>
                                ) : currentActivities.length === 0 ? (
                                    <div className="no-activities">
                                        <MessageSquare size={32}/>
                                        <p>No {activeTab === 'all' ? 'activities' : activeTab} yet</p>
                                    </div>
                                ) : (
                                    <>
                                        {currentActivities.map((activity, index) => {
                                            const isLast = index === currentActivities.length - 1;

                                            if (activity.type === 'comment') {
                                                return <CommentItem key={activity.id} activity={activity} ref={isLast ? lastActivityRef : null} />;
                                            }
                                            if (activity.type === 'change') {
                                                return <ChangeItem key={activity.id} activity={activity} ref={isLast ? lastActivityRef : null} />;
                                            }
                                            return null;
                                        })}

                                        {/* Индикатор загрузки следующих страниц */}
                                        {loadingMore && (
                                            <div className="loading-more">
                                                <Preloader size={"32px"}/>
                                            </div>
                                        )}

                                        {/* Кнопка "Load more" как альтернатива бесконечному скроллу */}
                                        {hasMore && !loadingMore && (
                                            <button
                                                className="load-more-btn"
                                                onClick={() => loadActivities(false)}
                                            >
                                                Load more ({currentActivities.length} / {activitiesState[activeTab].total})
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Форма добавления комментария */}
                            <div className="add-comment-container">
                                <button className="add-comment-btn">
                                    <MessageSquare size={16}/>
                                    Add comment
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="task-sidebar">
                        {/* Plan Section */}
                        <div className="sidebar-section">
                            <h4>Plan</h4>
                            <div className="detail-item">
                                <Calendar size={16}/>
                                <div className="detail-content">
                                    <span className="detail-label">Start Date</span>
                                    <span className="detail-value">{formatDate(task.start_date)}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <Flag size={16}/>
                                <div className="detail-content">
                                    <span className="detail-label">Due Date</span>
                                    <span className="detail-value">{formatDate(task.due_date)}</span>
                                </div>
                            </div>
                        </div>

                        {/* People Section */}
                        <div className="sidebar-section">
                            <h4>People</h4>
                            <div className="detail-item people-item">
                                <User size={16}/>
                                <div className="detail-content">
                                    <span className="detail-label">Assignee</span>

                                    {!isEditingAssignee ? (
                                        editedAssignee ? (
                                            <div
                                                className={`people-info assignee`}
                                                onMouseEnter={() => setAssigneeHovered(true)}
                                                onMouseLeave={() => setAssigneeHovered(false)}
                                            >
                                                <CustomUserAvatar user={editedAssignee} color={editedAssignee.color}
                                                                  size={'24px'}
                                                                  fontSize={'10px'}/>
                                                <span className="people-name">
                                                    {editedAssignee.last_name} {editedAssignee.first_name}
                                                </span>
                                                <div
                                                    className={`edit-description-text ${isAssigneeHovered ? 'visible' : ''}`}
                                                    onClick={() => {
                                                        handleStartEditAssignee()
                                                    }}
                                                >
                                                    <Pen size={16}/>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`people-info-unassigned-container`}>
                                                <div
                                                    className={`people-info assignee`}
                                                    onMouseEnter={() => setAssigneeHovered(true)}
                                                    onMouseLeave={() => setAssigneeHovered(false)}
                                                >
                                                    <UserX
                                                        size={32}
                                                        className={"unassigned-placeholder-icon"}
                                                    />
                                                    <span className="unassigned-placeholder-name">
                                                        Unassigned
                                                    </span>
                                                    <div
                                                        className={`edit-description-text ${isAssigneeHovered ? 'visible' : ''}`}
                                                        onClick={() => {
                                                            handleStartEditAssignee()
                                                        }}
                                                    >
                                                        <Pen size={16}/>
                                                    </div>
                                                </div>
                                                <span className={"people-assign-to-me"} onClick={handleAssignToCurrent}>Assign to me</span>
                                            </div>
                                        )
                                    ) : (
                                        <div className={"people-section-edit-assignee"}>
                                            <CustomInputSelector
                                                availableItems={projectMembers}
                                                defaultItem={{name: 'Unassigned'}}
                                                onDefaultSelect={() => {
                                                    handleSaveAssignee({user: {id: '00000000-0000-0000-0000-000000000000'}})
                                                }}
                                                onSelect={handleSaveAssignee}
                                                renderItem={(item) => {
                                                    return (
                                                        <div className="modal-assignee">
                                                            <CustomUserAvatar user={item.user} color={item.user.color}
                                                                              size={'24px'}
                                                                              fontSize={'10px'}/>
                                                            <span
                                                                className="modal-assignee-name">{item.user.last_name} {item.user.first_name}</span>
                                                        </div>
                                                    )
                                                }}
                                                renderDefaultItem={(item) => {
                                                    return (
                                                        <div className="modal-assignee">
                                                            <UserX size={18}/>
                                                            <span className="modal-assignee-name">{item.name}</span>
                                                        </div>
                                                    )
                                                }}
                                                placeholder="Search users..."
                                                getItemId={(member) => member.user.id}
                                                getItemName={(member) => member.user.first_name + ' ' + member.user.last_name}
                                            />
                                            <div
                                                className={`edit-description-text ${isEditingAssignee ? 'visible' : ''}`}
                                                onClick={() => {
                                                    handleCancelEditAssignee()
                                                }}
                                            >
                                                <X size={16}/>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                            <div className="detail-item people-item">
                                <User size={16}/>
                                <div className="detail-content">
                                    <span className="detail-label">Created by</span>
                                    <div className="people-info">
                                    <CustomUserAvatar user={task.creator} color={task.creator.color} size={'24px'}
                                                          fontSize={'10px'}/>
                                        <span
                                            className="people-name">{task.creator.last_name} {task.creator.first_name}</span>
                                        </div>
                                </div>
                            </div>
                        </div>

                        {/* Dates Section */}
                        <div className="sidebar-section">
                            <h4>Dates</h4>
                            <div className="detail-item">
                                <CalendarClock size={16}/>
                                <div className="detail-content">
                                    <span className="detail-label">Created</span>
                                    <span className="detail-value">{formatDate(task.created_at)}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <CalendarCheck size={16} />
                                <div className="detail-content">
                                    <span className="detail-label">Updated</span>
                                    <span className="detail-value">{formatDate(task.created_at)}</span>
                                </div>
                            </div>
                            {task.completed_at && (
                                <div className="detail-item">
                                    <CalendarX size={16} />
                                    <div className="detail-content">
                                        <span className="detail-label">Resolved</span>
                                        <span className="detail-value">{formatDate(task.completed_at)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreateTask={handleCreateSubtask}
                projectId={projectId}
                parentTaskId={taskId}
            />
        </>
    );
}

// Компонент для комментария
const CommentItem = ({ activity }) => {
    const user = activity.user;
    const time = new Date(activity.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="activity-item comment">
            <CustomUserAvatar
                user={user}
                color={user?.color}
                size="36px"
                fontSize="12px"
            />
            <div className="activity-content">
                <div className="activity-comment-header">
                    <span className="activity-user">
                        {user?.last_name} {user?.first_name}
                    </span>
                    <span className="activity-time">commented {time}</span>
                </div>
                <div className="activity-text">{activity.content}</div>
            </div>
        </div>
    );
};

const ChangeItem = ({ activity }) => {
    const { projectId } = useParams()
    const user = activity.user;
    const time = new Date(activity.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const fieldLabels = {
        task: 'Task created',
        status: 'Status',
        priority: 'Priority',
        assignee: 'Assignee',
        due_date: 'Due date',
        start_date: 'Start date',
        title: 'Title',
        description: 'Description'
    };

    const renderValue = (value, field) => {
        if (!value && field !== 'assignee') return <div className="change-value-null"><span>Not set</span></div>;

        switch(field) {
            case 'status':
                return (
                    <div className="change-status">
                        <span
                            style={{
                                backgroundColor: `${value.color}20`,
                                color: value.color,
                                border: `1px solid ${value.color}40`
                            }}
                        >
                            {value.name}
                        </span>
                    </div>
                );

            case 'priority':
                return (
                    <div className={`change-priority change-priority-${value}`}>
                        {value.toUpperCase()}
                    </div>
                );

            case 'subtask':
                return (
                    <div className={`change-subtasks`}>
                        {value.slice().reverse().map((item, index) => (
                            <Link to={`/project/${projectId}/task/${item.id}`}
                                  key={item.id}
                                  className={`change-subtask-item ${index === 0 ? 'new' : ''}`}
                            >
                                <span className={"subtask-item-title"}>{item.title}</span>
                                {index === 0 ? <span className={"new-subtask-badge"}>NEW</span> : null}
                            </Link>
                        ))}
                    </div>
                )

            case 'assignee':
                if (!value?.first_name) return <div className="change-assignee"> <span className="change-value-null">Unassigned</span> </div>;
                    return (
                    <div className="change-assignee">
                        <CustomUserAvatar user={value} color={value.color} size="24px" fontSize="10px" />
                        <span>{value.first_name} {value.last_name}</span>
                    </div>
                );

            case 'title':
                return (
                    <div className="change-title"> <span> {value} </span> </div>
                );

            case 'description':
                return (
                    <div className="change-description">
                        {value}
                    </div>
                );

            case 'task':
                return (
                    <div className="change-task-preview">
                        <div className={"change-task-preview-row title"}><strong>Title:</strong> <span> {value.title} </span> </div>
                        <div className={"change-task-preview-row description"}><strong>Description:</strong> <span> {value.description?.substring(0, 1000)} </span> </div>
                        <div className={"change-task-preview-row priority"}>
                            <strong>Priority:</strong>
                            <span
                                className={`task-priority-${value.priority}`}
                            >
                                <PriorityIcon priorityId={value.priority} size={18} />
                                <div>{value.priority.toUpperCase()}</div>
                            </span>
                        </div>
                        <div className={"change-task-preview-row status"}>
                            <strong>Status:</strong>
                            <span
                                style={{
                                    color: value.status.color,
                                    backgroundColor: `${value.status.color}20`,
                                }}
                            >
                                {value.status.name}
                            </span>
                        </div>
                        <div className={"change-task-preview-row assignee"}>
                            <strong>Assignee:</strong>
                            <span>
                                { value.assignee ? (
                                    <>
                                        <CustomUserAvatar user={value.assignee} color={value.color} size="24px" fontSize="10px" />
                                        <span>{value.assignee.last_name + " " + value.assignee.first_name}</span>
                                    </>
                                    ) : (
                                        <span style={{fontStyle:'italic'}}>Unassigned</span>
                                    )
                                }
                            </span>
                        </div>
                    </div>
                );

            default:
                return <span>{value}</span>;
        }
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

    const duration = formatDuration(activity.time_duration);

    return (
        <div className="activity-item change">
            <CustomUserAvatar
                user={user}
                color={user?.color}
                size="36px"
                fontSize="12px"
            />
            <div className="activity-content">
                <div className="activity-change-header">
                    <div className={"activity-header-left"}>
                        <span className="activity-user">
                            {user?.last_name} {user?.first_name}
                        </span>
                        <span className="activity-time">changed {time}</span>
                    </div>
                    <div className={"activity-header-right"}>
                        <span className="change-field-name">
                            {fieldLabels[activity.field_name] || activity.field_name}
                        </span>
                        {duration && (
                            <span className="activity-duration">
                            <Clock size={12} style={{marginRight: '4px'}}/>
                                {duration}
                        </span>
                        )}
                    </div>
                </div>

                <div className="change-values">
                    <div className="change-old-value">
                        <span className="change-label">From:</span>
                        {renderValue(activity.old_value, activity.field_name)}
                    </div>
                    <div className="change-arrow-container">
                        <div className="change-arrow">
                            <MoveRight size={20}/>
                        </div>
                    </div>
                    <div className="change-new-value">
                        <span className="change-label">To:</span>
                        {renderValue(activity.new_value, activity.field_name)}
                    </div>
                </div>

                {activity.description && (
                    <div className="change-comment">
                        <span className="change-comment-icon">
                            <Info size={14} />
                        </span>
                        <span>{activity.description}</span>
                    </div>
                )}
            </div>
        </div>
    );
};