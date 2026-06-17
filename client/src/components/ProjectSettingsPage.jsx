import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Trash2, AlertCircle, Settings,
    Users, GitBranch, Tag, LayoutGrid, Eye, EyeOff,
    Plus, Edit2, GripVertical, HelpCircle, Play, X,
    ChevronUp, ChevronDown, Shield, Crown, UserCog,
    UserPlus, Check, User, Grid3x2, StretchVertical, Columns3Cog, Rows3, UserMinus
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { projectService } from '../services/projectService';
import CustomInputSelector from './CustomInputSelector';
import CustomSelector from './CustomSelector';
import Preloader, {
    AdminPermissionsContent,
    CustomUserAvatar,
    InviteMemberContent,
    RemoveMemberContent,
    DeleteStatusContent,
    DeleteColumnContent,
    DeleteLaneContent, AddColumnContent
} from './CommonComponents';
import { PROJECT_COLORS } from '../assets/constants/colors';
import styles from '../styles/ProjectSettingsPage.module.css';
import ConfirmModal from "./modals/ConfirmModal";

const MAX_BOARD_COLUMNS = 5;

// Валидация правила (скопирована из CreateProjectPage)
const validateRuleSyntax = (ruleString) => {
    if (!ruleString || !ruleString.trim()) {
        return { valid: false, error: 'Rule cannot be empty' };
    }

    const trimmed = ruleString.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3 && !trimmed.includes('(')) {
        if (!trimmed.match(/^(\w+)\s+(=|!=|>|<|>=|<=|contains|not_contains|in|not_in|contains_any|contains_all|is_null|is_not_null)\s+(.+)$/)) {
            return {
                valid: false,
                error: 'Invalid rule format. Example: priority = critical'
            };
        }
    }

    const openCount = (trimmed.match(/\(/g) || []).length;
    const closeCount = (trimmed.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
        return { valid: false, error: 'Unbalanced parentheses' };
    }

    const validFields = [
        'priority', 'assignee', 'creator', 'title', 'description', 'status',
        'age_days', 'days_to_overdue', 'days_from_overdue', 'progress_days',
        'is_completed', 'is_overdue', 'has_due_date', 'has_assignee',
        'is_subtask', 'subtasks_count', 'subtasks_completed', 'tags',
        'todo_days', 'pause_days', 'complete_days', 'cancel_days',
        'days_from_start', 'days_to_start', 'comments_count', 'attachments_count',
        'is_cancelled'
    ];

    const fieldMatch = trimmed.match(/^(\w+)\s+/);
    if (fieldMatch && !validFields.includes(fieldMatch[1])) {
        return {
            valid: false,
            error: `Unknown field: ${fieldMatch[1]}`
        };
    }

    return { valid: true };
};

export default function ProjectSettingsPage({ user }) {
    const navigate = useNavigate();
    const { projectId } = useParams();
    const { showToast, handleApiError } = useToast();

    const [activeSection, setActiveSection] = useState('general');
    const [project, setProject] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [confirmModal, setConfirmModal] = useState(null);
    const [searchingStatus, setSearchingStatus] = useState(false);

    // General state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Workflow state
    const [statuses, setStatuses] = useState([]);
    const [lanes, setLanes] = useState([]);
    const [tags, setTags] = useState([]);
    const [newStatus, setNewStatus] = useState({ name: '', status_type: 'todo', color: '#8B5CF6'});
    const [newLane, setNewLane] = useState({ title: '', description: '', color: '#8B5CF6', ruleString: 'priority = medium' });
    const [newTag, setNewTag] = useState({ title: '', color: '#8B5CF6' });
    const [editingStatus, setEditingStatus] = useState(null);
    const [editingLane, setEditingLane] = useState(null);
    const [showRuleHelper, setShowRuleHelper] = useState(false);
    const [testingRule, setTestingRule] = useState(null);
    const [workflowTab, setWorkflowTab] = useState('statuses');

    // Members state
    const [showDropdown, setShowDropdown] = useState(null);
    const [inviteMode, setInviteMode] = useState(false);
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [newMember, setNewMember] = useState({
        user_id: '',
        role_in_team: '',
        permission_level: "member"
    });
    const [targetMember, setTargetMember] = useState({});

    const statusTypes = [
        { value: 'todo', label: 'To Do', description: 'Tasks yet to be started' },
        { value: 'progress', label: 'In Progress', description: 'Currently being worked on' },
        { value: 'paused', label: 'Paused', description: 'Temporarily on hold' },
        { value: 'completed', label: 'Completed', description: 'Successfully finished' },
        { value: 'cancelled', label: 'Cancelled', description: 'No longer needed' }
    ];

    const ruleExamples = [
        { label: 'Critical priority', rule: "priority = 'critical'" },
        { label: 'High priority', rule: "priority = 'high'" },
        { label: 'Assigned to me', rule: "assignee = 'nickname'" },
        { label: 'Urgent tag', rule: "tags contains 'urgent'" },
        { label: 'Overdue tasks', rule: 'is_overdue = true' },
        { label: 'Due in 7 days', rule: 'days_to_overdue <= 7' },
    ];

    const [statusTasksCount, setStatusTasksCount] = useState({});

    // ==================== DATA LOADING ====================
    const loadProjectData = useCallback(async () => {
        try {
            setLoading(true);
            const projectData = await projectService.getProjectDetails(projectId);
            const projectMembers = await projectService.getProjectMembers(projectId);
            setProject(projectData);
            setName(projectData.name);
            setDescription(projectData.description || '');

            // Статусы с информацией о колонках
            const projectStatuses = projectData.statuses || [];
            const boardStatuses = projectData.columns || [];
            const boardStatusIds = new Set(boardStatuses.map(col => col.status_id));

            setStatuses(projectStatuses.map((s, i) => ({
                ...s,
                showOnBoard: boardStatusIds.has(s.id),
                boardPosition: boardStatuses.find(col => col.status_id === s.id)?.position || i + 1
            })));

            // Линии с восстановлением строки правила из JSON
            setLanes((projectData.lanes || []).map(lane => ({
                ...lane,
                ruleString: extractRuleString(lane.rule_condition) || "priority = 'medium'"
            })));

            setTags(projectData.tags || []);
            setMembers(projectMembers || []);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    }, [projectId, handleApiError]);

    useEffect(() => {
        loadProjectData();
    }, [loadProjectData]);

    // ==================== GENERAL ====================
    const handleSaveGeneral = async () => {
        try {
            setSaving(true);
            await projectService.updateProject(projectId, { name, description });
            showToast('Project settings saved', 'success');
        } catch (error) {
            handleApiError(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProject = async () => {
        if (deleteConfirmText !== project?.name) {
            showToast('Please type the project name to confirm', 'warning');
            return;
        }
        try {
            await projectService.deleteProject(projectId);
            showToast('Project deleted', 'success');
            navigate('/');
        } catch (error) {
            handleApiError(error);
        }
    };

    // ==================== WORKFLOW – STATUSES ====================
    const addStatus = async () => {
        if (!newStatus.name.trim()) {
            showToast('Status name is required', 'warning');
            return;
        }
        if (statuses.some(s => s.name.toLowerCase() === newStatus.name.toLowerCase())) {
            showToast('Status with this name already exists', 'warning');
            return;
        }

        try {
            const created = await projectService.createStatus(projectId, {
                name: newStatus.name,
                status_type: newStatus.status_type,
                color: newStatus.color,
            });
            setStatuses(prev => [...prev, { ...created, showOnBoard: false, boardPosition: newStatus.showOnBoard ? getBoardColumnsCount() + 1 : 0 }]);
            setNewStatus({ name: '', status_type: 'todo', color: '#8B5CF6' });
            showToast('Status created', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const updateStatus = async (statusId, updates) => {
        try {
            const updated = await projectService.updateStatus(projectId, statusId, updates);
            setStatuses(prev => prev.map(s => s.id === statusId ? { ...s, ...updated } : s));
            setEditingStatus(null);
            showToast('Status updated', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const removeStatus = async (statusId) => {
        if (statuses.length <= 1) {
            showToast('Project must have at least one status', 'warning');
            return;
        }
        try {
            await projectService.deleteStatus(projectId, statusId);
            setStatuses(prev => prev.filter(s => s.id !== statusId));
            showToast('Status removed', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const toggleShowOnBoard = async (statusId) => {
        const status = statuses.find(s => s.id === statusId);
        const boardCount = getBoardColumnsCount();

        if (!status.showOnBoard && boardCount >= MAX_BOARD_COLUMNS) {
            showToast(`Maximum ${MAX_BOARD_COLUMNS} columns allowed`, 'warning');
            return;
        }

        try {
            if (status.showOnBoard) {
                const column = project?.columns?.find(c => c.status_id === statusId);
                if (column) {
                    await projectService.removeColumnFromBoard(projectId, column.id);
                }
                setStatuses(prev => prev.map(s =>
                    s.id === statusId ? { ...s, showOnBoard: false, boardPosition: 0 } : s
                ));
            } else {
                const newColumn = await projectService.addColumnToBoard(projectId, statusId);
                setStatuses(prev => prev.map(s =>
                    s.id === statusId ? { ...s, showOnBoard: true, boardPosition: newColumn.position } : s
                ));
            }
        } catch (error) {
            handleApiError(error);
        }
    };

    const moveBoardColumn = async (index, direction) => {
        const boardStatuses = statuses
            .filter(s => s.showOnBoard)
            .sort((a, b) => a.boardPosition - b.boardPosition);

        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < boardStatuses.length) {
            const reordered = [...boardStatuses];
            [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

            const positions = {};
            reordered.forEach((s, i) => {
                const column = project?.columns?.find(c => c.status_id === s.id);
                if (column) {
                    positions[column.id] = i + 1;
                }
            });

            try {
                await projectService.reorderColumns(projectId, positions);

                // Обновляем локально
                setStatuses(prev => {
                    const updated = [...prev];
                    const fromIdx = updated.findIndex(s => s.id === boardStatuses[index].id);
                    const toIdx = updated.findIndex(s => s.id === boardStatuses[newIndex].id);
                    if (fromIdx !== -1 && toIdx !== -1) {
                        const tempPos = updated[fromIdx].boardPosition;
                        updated[fromIdx] = { ...updated[fromIdx], boardPosition: updated[toIdx].boardPosition };
                        updated[toIdx] = { ...updated[toIdx], boardPosition: tempPos };
                    }
                    return updated;
                });
            } catch (error) {
                handleApiError(error);
            }
        }
    };

    const getBoardColumnsCount = () => statuses.filter(s => s.showOnBoard).length;

    // ==================== WORKFLOW – LANES ====================
    const addLane = async () => {
        if (!newLane.title.trim()) {
            showToast('Lane title is required', 'warning');
            return;
        }
        if (!newLane.ruleString.trim()) {
            showToast('Rule is required', 'warning');
            return;
        }
        const validation = validateRuleSyntax(newLane.ruleString);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            return;
        }

        try {
            const created = await projectService.createLane(projectId, {
                title: newLane.title,
                description: newLane.description,
                color: newLane.color,
                rule_condition: newLane.ruleString,
                position: lanes.length + 1
            });
            setLanes(prev => [...prev, { ...created, ruleString: newLane.ruleString }]);
            setNewLane({ title: '', description: '', color: '#8B5CF6', ruleString: 'priority = medium' });
            showToast('Lane created', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const updateLane = async (laneId, updates) => {
        if (updates.ruleString) {
            const validation = validateRuleSyntax(updates.ruleString);
            if (!validation.valid) {
                showToast(validation.error, 'error');
                return;
            }
        }
        try {
            const updated = await projectService.updateLane(projectId, laneId, {
                ...updates,
                rule_condition: updates.ruleString
            });
            setLanes(prev => prev.map(l => l.id === laneId ? { ...l, ...updated, ruleString: updates.ruleString || l.ruleString } : l));
            setEditingLane(null);
            showToast('Lane updated', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const removeLane = async (laneId) => {
        try {
            await projectService.deleteLane(projectId, laneId);
            setLanes(prev => prev.filter(l => l.id !== laneId));
            showToast('Lane removed', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const moveLane = async (index, direction) => {
        const newLanes = [...lanes];
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < newLanes.length) {
            // Меняем местами для получения нового порядка
            [newLanes[index], newLanes[newIndex]] = [newLanes[newIndex], newLanes[index]];
            const laneIds = newLanes.map(l => l.id);

            try {
                // Отправляем просто массив ID в новом порядке
                await projectService.reorderLanes(projectId, laneIds);

                // Локально обновляем для быстрого UI
                setLanes(prev => {
                    const updated = [...prev];
                    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
                    return updated.map((l, i) => ({ ...l, position: i + 1 }));
                });
            } catch (error) {
                handleApiError(error);
            }
        }
    };

    const testRule = async (ruleString) => {
        try {
            setTestingRule(ruleString);
            const validation = validateRuleSyntax(ruleString);
            if (validation.valid) {
                showToast('Rule syntax is valid!', 'success');
            } else {
                showToast(validation.error, 'error');
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setTestingRule(null);
        }
    };

    // ==================== WORKFLOW – TAGS ====================
    const handleCreateTag = async () => {
        if (!newTag.title.trim()) return;
        try {
            const created = await projectService.createTag(projectId, { title: newTag.title, color: newTag.color });
            setTags(prev => [...prev, created]);
            setNewTag({ title: '', color: '#8B5CF6' });
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleDeleteTag = async (tagId) => {
        try {
            await projectService.deleteTag(projectId, tagId);
            setTags(prev => prev.filter(t => t.id !== tagId));
        } catch (error) {
            handleApiError(error);
        }
    };

    // ==================== MEMBERS ====================
    const handleInviteUser = async (invitedUser) => {
        try {
            const added = await projectService.addMember(projectId, {
                user_id: invitedUser.id,
                role_in_team: invitedUser.role_in_team,
                permission_level: invitedUser.permission_level,
            });
            setMembers(prev => [...prev, { ...added.member, user: invitedUser }]);
            setInviteMode(false);
            showToast('Member added', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const [inviteRole, setInviteRole] = useState('');
    const [invitePermission, setInvitePermission] = useState('member');
    const [inviteTarget, setInviteTarget] = useState(null);

    const handleChangePermissions = async (userId, newRole) => {
        try {
            await projectService.updateMember(projectId, userId, { permission_level: newRole });
            setMembers(prev => prev.map(m =>
                m.user_id === userId ? { ...m, permission_level: newRole } : m
            ));
            showToast('Permissions updated', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleRemoveMember = async (userId) => {
        try {
            await projectService.removeMember(projectId, userId);
            setMembers(prev => prev.filter(m => m.user_id !== userId));
            showToast('Member removed', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleTransferOwnership = async (userId) => {
        try {
            await projectService.transferOwnership(projectId, userId);
            await loadProjectData();
            showToast('Ownership transferred', 'success');
        } catch (error) {
            handleApiError(error);
        }
    };

    const useDebounce = (value, delay) => {

        const [debouncedValue, setDebouncedValue] = useState(value);
        useEffect(() => {
            const timer = setTimeout(() => {
                setDebouncedValue(value);
            }, delay);

            return () => {
                clearTimeout(timer);
            };
        }, [value, delay]);

        return debouncedValue;

    };

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const searchUsers = async (query) => {
        if (!query.trim()) {
            setUserSearchResults([]);
            setSearchingStatus('default');
            return;
        }

        try {
            const results = await projectService.searchUsers(query);
            const filtered = results.users.filter(u => !members.some(m => m.user_id === u.id));

            if (filtered.length > 0) {
                setUserSearchResults(filtered);
                setSearchingStatus('found');
            } else {
                setUserSearchResults([]);
                setSearchingStatus('notFound');
            }
        } catch (error) {
            setUserSearchResults([]);
            setSearchingStatus('notFound');
        }
    };

    useEffect(() => {
        if (searchQuery.trim()) {
            setSearchingStatus('searching');
        } else {
            setSearchingStatus('default');
            setUserSearchResults([]);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (debouncedSearchQuery.trim()) {
            searchUsers(debouncedSearchQuery);
        } else {
            setUserSearchResults([]);
            setSearchingStatus('default');
        }
    }, [debouncedSearchQuery]);

    // ==================== HELPERS ====================
    const extractRuleString = (ruleJSON) => {
        if (!ruleJSON) return '';

        try {
            const rule = typeof ruleJSON === 'string' ? JSON.parse(ruleJSON) : ruleJSON;
            return buildRuleString(rule);
        } catch {
            return String(ruleJSON);
        }
    };

    const buildRuleString = (node, parentLogic = null) => {
        // Базовый случай: простое условие
        if (node.field && node.operator) {
            const value = node.value !== undefined && node.value !== null ? node.value : '';

            // Для булевых значений не нужны кавычки
            if (value === true || value === false) {
                return `${node.field} ${node.operator} ${value}`;
            }

            // Для операторов is_null / is_not_null не нужно значение
            if (node.operator === 'is_null' || node.operator === 'is_not_null') {
                return `${node.field} ${node.operator}`;
            }

            // Для contains/in и подобных — значение в кавычках
            return `${node.field} ${node.operator} '${value}'`;
        }

        // Рекурсивный случай: составное условие
        if (node.logic && (node.condition_1 || node.condition_2)) {
            const parts = [];

            if (node.condition_1) {
                parts.push(buildRuleString(node.condition_1, node.logic));
            }

            if (node.condition_2) {
                parts.push(buildRuleString(node.condition_2, node.logic));
            }

            if (parts.length === 0) return '';

            const logic = node.logic.toUpperCase();
            let result = parts.join(` ${logic} `);

            // Используем флаг isBraced для определения нужны ли скобки
            if (node.is_braced) {
                result = `(${result})`;
            }

            return result;
        }

        // Если что-то пошло не так — возвращаем JSON строку
        return JSON.stringify(node);
    };

    const isOnline = (lastSeenAt) => {
        if (!lastSeenAt) return false;
        return Date.now() - new Date(lastSeenAt).getTime() < 3 * 60 * 1000;
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const diff = Math.floor((Date.now() - date) / 1000);
        if (diff < 60 * 3) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const renderColorOption = (color) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '6px', backgroundColor: color.hex }} />
            <span>{color.label}</span>
        </div>
    );

    const renderSelectedColor = (color) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '6px', backgroundColor: color.hex }} />
            <span>{color.label}</span>
        </div>
    );

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showDropdown) setShowDropdown(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showDropdown]);

    const fetchStatusTasksCount = async (statusId) => {
        try {
            const queryString = `page=1&len=15&statusIds=${statusId}`;
            const response = await projectService.getAllTasks(projectId, queryString);

            setStatusTasksCount(prev => ({
                ...prev,
                [statusId]: response?.total || 0
            }));
            return response?.total || 0;
        } catch (error) {
            return 0;
        }
    };

    if (loading) {
        return (
            <div className="app-loading-container">
                <Preloader />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <span className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                    <span>Back</span>
                </span>
            </div>

            <div className={styles.content}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    {[
                        { id: 'general', label: 'General', icon: Settings },
                        { id: 'workflow', label: 'Workflow', icon: Grid3x2 },
                        { id: 'members', label: 'Members', icon: Users },
                    ].map(section => (
                        <button
                            key={section.id}
                            className={`${styles.sidebarItem} ${activeSection === section.id ? styles.sidebarItemActive : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <section.icon size={18} />
                            <span>{section.label}</span>
                        </button>
                    ))}
                </div>

                <div className={styles.main}>
                    {/* ==================== GENERAL ==================== */}
                    {activeSection === 'general' && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h2>General Settings</h2>
                                    <p>Manage basic project information</p>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Project Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className={styles.textarea}
                                    rows={4}
                                />
                            </div>
                            <button className={styles.saveBtn} onClick={handleSaveGeneral} disabled={saving}>
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>

                            {/* Danger Zone */}
                            <div className={styles.dangerZone}>
                                <div className={styles.dangerZoneHeader}>
                                    <AlertCircle size={20} />
                                    <div>
                                        <h3>Delete Project</h3>
                                        <p>Once deleted, it's gone forever. All tasks, comments, and files will be permanently removed.</p>
                                    </div>
                                </div>
                                <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                                    <Trash2 size={16} />
                                    Delete this project
                                </button>
                            </div>

                            {/* Delete Confirmation Modal */}
                            {showDeleteConfirm && (
                                <div className={styles.overlay} onClick={() => setShowDeleteConfirm(false)}>
                                    <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
                                        <div className={styles.confirmHeader}>
                                            <h3>Delete Project</h3>
                                            <button onClick={() => setShowDeleteConfirm(false)}><X size={18} /></button>
                                        </div>
                                        <div className={styles.confirmBody}>
                                            <p>Are you sure you want to delete <strong>{project?.name}</strong>?</p>
                                            <p className={styles.dangerText}>This action cannot be undone.</p>
                                            <div className={styles.confirmInput}>
                                                <label>Type <strong>{project?.name}</strong> to confirm:</label>
                                                <input
                                                    type="text"
                                                    placeholder="Project name"
                                                    value={deleteConfirmText}
                                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.confirmActions}>
                                            <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                            <button
                                                className={styles.deleteConfirmBtn}
                                                onClick={handleDeleteProject}
                                                disabled={deleteConfirmText !== project?.name}
                                            >
                                                Delete Project
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== WORKFLOW ==================== */}
                    {activeSection === 'workflow' && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h2>Workflow Settings</h2>
                                    <p>Configure statuses, lanes, and tags</p>
                                </div>
                            </div>

                            <div className={styles.workflowTabs}>
                                {['statuses', 'lanes', 'tags'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`${styles.workflowTab} ${workflowTab === tab ? styles.workflowTabActive : ''}`}
                                        onClick={() => setWorkflowTab(tab)}
                                    >
                                        {tab === 'statuses' && <><Columns3Cog size={14} /> Statuses & Columns</>}
                                        {tab === 'lanes' && <><Rows3 size={14} /> Smart Lanes</>}
                                        {tab === 'tags' && <><Tag size={14} /> Tags</>}
                                    </button>
                                ))}
                            </div>

                            {/* Statuses & Columns */}
                            {workflowTab === 'statuses' && (
                                <div className={styles.workflowContent}>
                                    <div className={styles.boardColumnsInfo}>
                                        <LayoutGrid size={16} />
                                        <span>Columns on board: <strong>{getBoardColumnsCount()}</strong> / {MAX_BOARD_COLUMNS}</span>
                                        {getBoardColumnsCount() === MAX_BOARD_COLUMNS && (
                                            <span className={styles.maxColumnsWarning}>
                                                <AlertCircle size={14} /> Maximum reached
                                            </span>
                                        )}
                                    </div>

                                    {/* All Statuses */}
                                    <div className={styles.sectionLabel}>All Statuses</div>
                                    <div className={styles.statusesList}>
                                        {statuses.map((status, index) => (
                                            <div key={status.id} className={styles.statusItem}>
                                                {editingStatus === status.id ? (
                                                    <div className={styles.statusEditForm}>
                                                        <div className={styles.formRow}>
                                                            <div className={styles.colorPickerContainer}>
                                                                <div className={styles.colorPreview}
                                                                     style={{backgroundColor: status.color}}/>
                                                                <CustomInputSelector
                                                                    availableItems={PROJECT_COLORS}
                                                                    onSelect={(color) => {
                                                                        setStatuses(prev => prev.map(s => s.id === status.id ? {
                                                                            ...s,
                                                                            color: color.hex
                                                                        } : s));
                                                                    }}
                                                                    defaultItem={PROJECT_COLORS.find(c => c.hex === status.color) || PROJECT_COLORS[0]}
                                                                    renderItem={renderColorOption}
                                                                    renderDefaultItem={renderSelectedColor}
                                                                    getItemId={(c) => c.name}
                                                                    getItemName={(c) => c.label}
                                                                    placeholder="Search color..."
                                                                    wrapperClassName={styles.colorPickerWrapper}
                                                                    inputClassName={styles.colorPickerInput}
                                                                    dropdownClassName={styles.colorPickerDropdown}
                                                                />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                className={styles.addInput}
                                                                value={status.name}
                                                                onChange={(e) => {
                                                                    setStatuses(prev => prev.map(s => s.id === status.id ? {
                                                                        ...s,
                                                                        name: e.target.value
                                                                    } : s));
                                                                }}
                                                                placeholder="Status name"
                                                                autoFocus
                                                            />
                                                            <CustomSelector
                                                                items={statusTypes}
                                                                selectedIndex={statusTypes.findIndex(t => t.value === status.status_type)}
                                                                onSelect={(type) => {
                                                                    setStatuses(prev => prev.map(s => s.id === status.id ? {
                                                                        ...s,
                                                                        status_type: type.value
                                                                    } : s));
                                                                }}
                                                                renderItem={(type) => (
                                                                    <div>
                                                                        <span style={{fontSize: '14px'}}>{type.label}</span>
                                                                        <span style={{fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '8px'}}>{type.description}</span>
                                                                    </div>
                                                                )}
                                                                getItemId={(type) => type.value}
                                                                getItemName={(type) => type.label}
                                                                placeholder="Select type..."
                                                                buttonClassName={styles.addSelect}
                                                            />
                                                        </div>
                                                        <div className={styles.editActions}>
                                                            <button className={styles.saveEdit}
                                                                    onClick={() => updateStatus(status.id, {
                                                                        name: status.name,
                                                                        status_type: status.status_type,
                                                                        color: status.color
                                                                    })}>
                                                                <Save size={14}/> Save
                                                            </button>
                                                            <button className={styles.cancelEdit}
                                                                    onClick={() => setEditingStatus(null)}>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={styles.statusColor} style={{backgroundColor: status.color}}/>
                                                        <div className={styles.statusInfo}>
                                                            <span className={styles.statusName}>{status.name}</span>
                                                            <span className={styles.statusType}>
                                                                {statusTypes.find(t => t.value === status.status_type)?.label}
                                                            </span>
                                                        </div>
                                                        <div className={styles.statusActions}>
                                                            {!status.showOnBoard ? (
                                                                <button
                                                                    className={styles.addToBoardBtn}
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            type: 'add-column',
                                                                            targetId: status.id
                                                                        });
                                                                    }}
                                                                    title="Add to board"
                                                                >
                                                                    <Plus size={14}/> Add to board
                                                                </button>
                                                            ) : (
                                                                <span className={styles.onBoardBadge}>
                                                                    Column
                                                                </span>
                                                            )}
                                                            <button className={styles.editBtn}
                                                                    onClick={() => setEditingStatus(status.id)}>
                                                                <Edit2 size={14}/>
                                                            </button>
                                                            <button className={styles.removeBtn}
                                                                    onClick={async () => {
                                                                        if (statuses.length <= 1) {
                                                                            showToast('Project must have at least one status', 'warning');
                                                                            return;
                                                                        }
                                                                        const count = await fetchStatusTasksCount(status.id);
                                                                        setStatusTasksCount(count)

                                                                        setConfirmModal({
                                                                            title: 'Delete Status',
                                                                            confirmVariant: 'danger',
                                                                            confirmText: 'Delete Status',
                                                                            confirmDisabled: count > 0,
                                                                            type: 'delete-status',
                                                                            targetId: status.id,
                                                                        });
                                                                    }}>
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Status */}
                                    <div className={styles.addSection}>
                                        <div className={styles.addStatusForm}>
                                            <div className={styles.colorPickerContainer}>
                                                <div className={styles.colorPreview}
                                                     style={{backgroundColor: newStatus.color}}/>
                                                <CustomInputSelector
                                                    availableItems={PROJECT_COLORS}
                                                    onSelect={(color) => setNewStatus({...newStatus, color: color.hex})}
                                                    defaultItem={PROJECT_COLORS.find(c => c.hex === newStatus.color) || PROJECT_COLORS[0]}
                                                    renderItem={renderColorOption}
                                                    renderDefaultItem={renderSelectedColor}
                                                    getItemId={(c) => c.name}
                                                    getItemName={(c) => c.label}
                                                    placeholder="Search color..."
                                                    wrapperClassName={styles.colorPickerWrapper}
                                                    inputClassName={styles.colorPickerInput}
                                                    dropdownClassName={styles.colorPickerDropdown}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className={styles.addStatusInput}
                                                placeholder="Status name"
                                                value={newStatus.name}
                                                onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                                                onKeyPress={(e) => e.key === 'Enter' && addStatus()}
                                            />
                                            <CustomSelector
                                                items={statusTypes}
                                                selectedIndex={statusTypes.findIndex(t => t.value === newStatus.status_type)}
                                                onSelect={(type) => setNewStatus({ ...newStatus, status_type: type.value })}
                                                renderItem={(type) => (
                                                    <div>
                                                        <span style={{ fontSize: '14px' }}>{type.label}</span>
                                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>{type.description}</span>
                                                    </div>
                                                )}
                                                getItemId={(type) => type.value}
                                                getItemName={(type) => type.label}
                                                placeholder="Select type..."
                                                buttonClassName={styles.addSelect}
                                            />
                                            <button className={styles.addBtn} onClick={addStatus}>
                                                <Plus size={16} /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Board Columns Order */}
                                    <div className={styles.sectionLabel} style={{marginTop: '24px'}}>Board Columns
                                        Order
                                    </div>
                                    <div className={styles.statusesList}>
                                        {statuses
                                            .filter(s => s.showOnBoard)
                                            .sort((a, b) => a.boardPosition - b.boardPosition)
                                            .map((status, index, arr) => (
                                                <div key={status.id} className={styles.statusItem}>
                                                    <div className={styles.dragHandle}>
                                                        <GripVertical size={16}/>
                                                    </div>
                                                    <div className={styles.statusColor}
                                                         style={{backgroundColor: status.color}}/>
                                                    <div className={styles.statusInfo}>
                                                        <span className={styles.statusName}>{status.name}</span>
                                                    </div>
                                                    <div className={styles.statusActions}>
                                                        <button
                                                            className={styles.moveBtn}
                                                            onClick={() => moveBoardColumn(index, -1)}
                                                            disabled={index === 0}
                                                        >
                                                            <ChevronUp size={16}/>
                                                        </button>
                                                        <button
                                                            className={styles.moveBtn}
                                                            onClick={() => moveBoardColumn(index, 1)}
                                                            disabled={index === arr.length - 1}
                                                        >
                                                            <ChevronDown size={16} />
                                                        </button>
                                                        <button className={styles.removeBtn}
                                                                onClick={() => {
                                                                    setConfirmModal({
                                                                        title: 'Remove Column',
                                                                        confirmVariant: 'danger',
                                                                        confirmText: 'Remove Column',
                                                                        type: 'delete-column',
                                                                        targetId: status.id,
                                                                    });
                                                                }}
                                                                title="Remove from board"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        {statuses.filter(s => s.showOnBoard).length === 0 && (
                                            <div className={styles.emptyBoardMessage}>
                                                <LayoutGrid size={20}/>
                                                <span>No columns on board</span>
                                                <p>Click "Add to board" on statuses above</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Smart Lanes */}
                            {workflowTab === 'lanes' && (
                                <div className={styles.workflowContent}>
                                    <div className={styles.laneSectionLabel}>
                                        <div className={styles.sectionLabel}>Smart Lanes</div>
                                        <button className={styles.helpBtn}
                                                onClick={() => setShowRuleHelper(!showRuleHelper)}>
                                            <HelpCircle size={16}/> Rule Syntax Help
                                        </button>
                                    </div>
                                    {showRuleHelper && (
                                        <div className={styles.ruleHelper}>
                                            <div className={styles.helperHeader}>
                                                <h4>Rule Examples</h4>
                                                <button className={styles.closeHelper} onClick={() => setShowRuleHelper(false)}><X size={16} /></button>
                                            </div>
                                            {ruleExamples.map((ex, i) => (
                                                <div key={i} className={styles.ruleExample}>
                                                    <code>{ex.rule}</code>
                                                    <span>{ex.label}</span>
                                                    <button onClick={() => { setNewLane(prev => ({ ...prev, ruleString: ex.rule })); setShowRuleHelper(false); }}>
                                                        Use
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className={styles.lanesList}>
                                        {lanes.map((lane, index) => (
                                            <div key={lane.id} className={styles.laneItem}>
                                                {editingLane === lane.id ? (
                                                    <div className={styles.laneEditForm}>
                                                        <div className={styles.formRow}>
                                                            <div className={styles.colorPickerContainer}>
                                                                <div className={styles.colorPreview} style={{ backgroundColor: lane.color }} />
                                                                <CustomInputSelector
                                                                    availableItems={PROJECT_COLORS}
                                                                    onSelect={(color) => {
                                                                        setLanes(prev => prev.map(l => l.id === lane.id ? { ...l, color: color.hex } : l));
                                                                    }}
                                                                    defaultItem={PROJECT_COLORS.find(c => c.hex === lane.color) || PROJECT_COLORS[0]}
                                                                    renderItem={renderColorOption}
                                                                    renderDefaultItem={renderSelectedColor}
                                                                    getItemId={(c) => c.name}
                                                                    getItemName={(c) => c.label}
                                                                    placeholder="Search color..."
                                                                    wrapperClassName={styles.colorPickerWrapper}
                                                                    inputClassName={styles.colorPickerInput}
                                                                    dropdownClassName={styles.colorPickerDropdown}
                                                                />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                className={styles.editInput}
                                                                value={lane.title}
                                                                onChange={(e) => {
                                                                    setLanes(prev => prev.map(l => l.id === lane.id ? { ...l, title: e.target.value } : l));
                                                                }}
                                                                placeholder="Lane title"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <textarea
                                                            className={styles.editTextarea}
                                                            value={lane.description}
                                                            onChange={(e) => {
                                                                setLanes(prev => prev.map(l => l.id === lane.id ? { ...l, description: e.target.value } : l));
                                                            }}
                                                            placeholder="Description"
                                                            rows={2}
                                                        />
                                                        <input
                                                            className={styles.editInput}
                                                            value={lane.ruleString}
                                                            onChange={(e) => {
                                                                setLanes(prev => prev.map(l => l.id === lane.id ? { ...l, ruleString: e.target.value } : l));
                                                            }}
                                                            placeholder="Rule (e.g., priority = critical)"
                                                        />
                                                        <div className={styles.editActions}>
                                                            <button className={styles.testRuleBtn} onClick={() => testRule(lane.ruleString)} disabled={testingRule === lane.ruleString}>
                                                                <Play size={14} /> Test
                                                            </button>
                                                            <button className={styles.saveEdit} onClick={() => updateLane(lane.id, { title: lane.title, description: lane.description, color: lane.color, ruleString: lane.ruleString })}>
                                                                Save
                                                            </button>
                                                            <button className={styles.cancelEdit} onClick={() => setEditingLane(null)}>Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={styles.dragHandle}>
                                                            <GripVertical size={16} />
                                                        </div>
                                                        <div className={styles.laneColor} style={{ backgroundColor: lane.color }} />
                                                        <div className={styles.laneInfo}>
                                                            <span className={styles.laneName}>{lane.title}</span>
                                                            <span className={styles.laneDescription}>{lane.description}</span>
                                                            <code className={styles.laneRule}>{lane.ruleString}</code>
                                                        </div>
                                                        <div className={styles.laneActions}>
                                                            <button className={styles.moveBtn} onClick={() => moveLane(index, -1)} disabled={index === 0}>
                                                                <ChevronUp size={16} />
                                                            </button>
                                                            <button className={styles.moveBtn} onClick={() => moveLane(index, 1)} disabled={index === lanes.length - 1}>
                                                                <ChevronDown size={16} />
                                                            </button>
                                                            <button className={styles.editBtn} onClick={() => setEditingLane(lane.id)}>
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button className={styles.removeBtn}
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            title: 'Delete Lane',
                                                                            confirmVariant: 'danger',
                                                                            confirmText: 'Delete Lane',
                                                                            type: 'delete-lane',
                                                                            targetId: lane.id,
                                                                            body: () => <DeleteLaneContent lane={lane}/>
                                                                        });
                                                                    }}>
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Lane */}
                                    <div className={styles.addSection}>
                                        <div className={styles.addLaneForm}>
                                            <div className={styles.formRow}>
                                                <div className={styles.colorPickerContainer}>
                                                    <div className={styles.colorPreview} style={{ backgroundColor: newLane.color }} />
                                                    <CustomInputSelector
                                                        availableItems={PROJECT_COLORS}
                                                        onSelect={(color) => setNewLane({ ...newLane, color: color.hex })}
                                                        defaultItem={PROJECT_COLORS.find(c => c.hex === newLane.color) || PROJECT_COLORS[0]}
                                                        renderItem={renderColorOption}
                                                        renderDefaultItem={renderSelectedColor}
                                                        getItemId={(c) => c.name}
                                                        getItemName={(c) => c.label}
                                                        placeholder="Search color..."
                                                        wrapperClassName={styles.colorPickerWrapper}
                                                        inputClassName={styles.colorPickerInput}
                                                        dropdownClassName={styles.colorPickerDropdown}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    className={styles.addInput}
                                                    placeholder="Lane title"
                                                    value={newLane.title}
                                                    onChange={(e) => setNewLane({ ...newLane, title: e.target.value })}
                                                />
                                            </div>
                                            <textarea
                                                className={styles.addTextarea}
                                                placeholder="Description"
                                                value={newLane.description}
                                                onChange={(e) => setNewLane({ ...newLane, description: e.target.value })}
                                                rows={2}
                                            />
                                            <input
                                                className={styles.addInput}
                                                placeholder="Rule (e.g., priority = high)"
                                                value={newLane.ruleString}
                                                onChange={(e) => setNewLane({ ...newLane, ruleString: e.target.value })}
                                            />
                                            <div className={styles.formRow}>
                                                <button className={styles.testRuleBtn} onClick={() => testRule(newLane.ruleString)} disabled={testingRule === newLane.ruleString}>
                                                    <Play size={14} /> Test Rule
                                                </button>
                                                <button className={styles.addBtn} onClick={addLane}>
                                                    <Plus size={16} /> Add Lane
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {workflowTab === 'tags' && (
                                <div className={styles.workflowContent}>
                                    <div className={styles.tagsGrid}>
                                        {tags.map(tag => (
                                            <div key={tag.id} className={styles.tagChip}
                                                 style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color, color: tag.color }}>
                                                <span>{tag.title}</span>
                                                <X size={12} onClick={() => handleDeleteTag(tag.id)} className={styles.tagRemove} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.addTagForm}>
                                        <div className={styles.colorPickerContainer}>
                                            <div className={styles.colorPreview}
                                                 style={{backgroundColor: newTag.color}}/>
                                            <CustomInputSelector
                                                availableItems={PROJECT_COLORS}
                                                onSelect={(color) => setNewTag({...newTag, color: color.hex})}
                                                defaultItem={PROJECT_COLORS.find(c => c.hex === newTag.color) || PROJECT_COLORS[0]}
                                                renderItem={renderColorOption}
                                                renderDefaultItem={renderSelectedColor}
                                                getItemId={(c) => c.name}
                                                getItemName={(c) => c.label}
                                                placeholder="Search color..."
                                                wrapperClassName={styles.colorPickerWrapper}
                                                inputClassName={styles.colorPickerInput}
                                                dropdownClassName={styles.colorPickerDropdown}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Tag name"
                                            value={newTag.title}
                                            onChange={(e) => setNewTag({...newTag, title: e.target.value})}
                                            onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                                            className={styles.tagNameInput}
                                        />
                                        <button onClick={handleCreateTag} className={styles.addBtn}>
                                            <Plus size={16}/> Add
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== MEMBERS ==================== */}
                    {activeSection === 'members' && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h2>Members</h2>
                                    <p>Manage project members and their roles</p>
                                </div>
                                <button className={styles.inviteBtn} onClick={() => setInviteMode(!inviteMode)}>
                                    <UserPlus size={16}/> Invite Member
                                </button>
                            </div>

                            {inviteMode && (
                                <div className={styles.inviteForm}>
                                    <div className={styles.inviteInputWrapper}>
                                        <input
                                            type="text"
                                            placeholder="Search by nickname or email..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                            }}
                                            className={styles.inviteSearchInput}
                                        />
                                    </div>
                                    <button className={styles.cancelInviteBtn} onClick={() => {
                                        setInviteMode(false)
                                        setSearchQuery('')
                                        setUserSearchResults([])
                                    }}>
                                        <X size={16}/>
                                    </button>
                                    {searchingStatus !== 'default' && (
                                        <div className={styles.searchDropdown}>
                                            {searchingStatus === 'searching' ? (
                                                <div className={styles.searchSpinner}>
                                                    <Preloader size={24}/>
                                                </div>
                                            ) : searchingStatus === 'found' && userSearchResults.length > 0 ? (
                                                userSearchResults.map(u => (
                                                    <div key={u.id} className={styles.searchUserItem}
                                                         onClick={() => {
                                                             setInviteTarget(u);
                                                             setInviteRole('');
                                                             setInvitePermission('member');
                                                             setSearchQuery('')
                                                             setConfirmModal({
                                                                 title: 'Invite User',
                                                                 confirmText: 'Invite',
                                                                 type: 'invite-member'
                                                             });
                                                         }}
                                                    >
                                                        <CustomUserAvatar user={u} color={u.color} size="32px" fontSize="10px"/>
                                                        <div className={styles.searchUserContent}>
                                                            <span className={styles.searchUserName}>{u.last_name} {u.first_name}</span>
                                                            <span className={styles.searchUserNickname}>@{u.nickname}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : searchingStatus === 'notFound' ? (
                                                <div className={styles.searchEmpty}>
                                                    <span>No users found</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div
                                className={`${styles.membersStats} ${inviteMode && searchingStatus !== 'default' ? styles.inviteMode : ''}`}>
                                <div className={styles.statItem}><span
                                    className={styles.statValue}>{members.length}</span><span
                                    className={styles.statLabel}>Total</span></div>
                                <div className={styles.statItem}><span
                                    className={styles.statValue}>{members.filter(m => m.permission_level === 'owner').length}</span><span
                                    className={styles.statLabel}>Owner</span></div>
                                <div className={styles.statItem}><span
                                    className={styles.statValue}>{members.filter(m => m.permission_level === 'admin').length}</span><span
                                    className={styles.statLabel}>Admins</span></div>
                                <div className={styles.statItem}><span
                                    className={styles.statValue}>{members.filter(m => m.permission_level === 'member').length}</span><span
                                    className={styles.statLabel}>Members</span></div>
                            </div>

                            <div
                                className={`${styles.membersList} ${inviteMode && searchingStatus !== 'default' ? styles.inviteMode : ''}`}>
                                {(() => {
                                    const contextMember = members.find(m => m.user_id === user?.id);
                                    const isCurrentOwner = project?.owner_id === user?.id;
                                    const isCurrentAdmin = !isCurrentOwner && contextMember?.permission_level === 'admin';
                                    const canManageAny = isCurrentOwner || isCurrentAdmin;

                                    const roleOrder = {owner: 0, admin: 1, member: 2};

                                    const sorted = [...members].sort((a, b) => {
                                        const aOnline = isOnline(a.last_seen_at) ? 0 : 1;
                                        const bOnline = isOnline(b.last_seen_at) ? 0 : 1;
                                        if (aOnline !== bOnline) return aOnline - bOnline;
                                        const aRole = roleOrder[a.permission_level] ?? 99;
                                        const bRole = roleOrder[b.permission_level] ?? 99;
                                        return aRole - bRole;
                                    });

                                    return sorted.map(member => {
                                        const isCurrentUser = user?.id === member.user_id;
                                        const isOwner = member.permission_level === 'owner';
                                        const isAdmin = member.permission_level === 'admin';
                                        const canManage = !isCurrentUser && canManageAny;

                                        return (
                                            <div key={member.user_id}
                                                 className={`${styles.memberItem} ${isCurrentUser ? styles.currentUser : ''}`}>
                                                <div className={styles.memberAvatar}>
                                                    <CustomUserAvatar user={member.user} color={member.user.color}
                                                                      size="44px" fontSize="16px"/>
                                                    <span className={`${styles.onlineDot} ${isOnline(member.last_seen_at) ? styles.online : ''}`}/>
                                                </div>
                                                <div className={styles.memberInfo}>
                                                    <div className={styles.memberTopRow}>
                                                        <span className={styles.memberName}>
                                                            {member.user.last_name} {member.user.first_name}
                                                        </span>
                                                        <span
                                                            className={`${styles.roleBadge} ${isOwner ? styles.ownerBadge : ''} ${isAdmin ? styles.adminBadge : ''}`}>
                                                            {isOwner && <Crown size={12}/>}
                                                            {isAdmin && <Shield size={12}/>}
                                                            {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member'}
                                                        </span>
                                                        {isCurrentUser && <span className={styles.youBadge}>You</span>}
                                                    </div>
                                                    <div className={styles.memberBottomRow}>
                                                        <span
                                                            className={styles.memberNickname}>@{member.user.nickname}</span>
                                                        <span className={styles.memberEmail}>{member.user.email}</span>
                                                    </div>
                                                    <div className={styles.memberMeta}>
                                                        {member.role_in_team && <span>{member.role_in_team} ·</span>}
                                                        <span> Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                                                        {member.last_seen_at ?
                                                            <span> · Last seen {formatTimeAgo(member.last_seen_at)}</span>
                                                            :
                                                            <span> · Last seen long ago</span>
                                                        }
                                                    </div>
                                                </div>
                                                {canManage && (
                                                    <div className={styles.memberActions}>
                                                        <div className={styles.memberActionsDropdown}>
                                                            <button
                                                                className={styles.memberActionBtn}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    showDropdown === member.user_id ? setShowDropdown(null) : setShowDropdown(member.user_id);
                                                                }}
                                                            >
                                                                <UserCog size={16}/>
                                                            </button>
                                                            {showDropdown === member.user_id && (
                                                                <div className={styles.dropdownContent}>
                                                                    {!isAdmin && (
                                                                        <button onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setTargetMember(member);
                                                                            setConfirmModal({
                                                                                title: 'Set Admin Permission',
                                                                                type: 'change-permissions'
                                                                            })
                                                                            setShowDropdown(null)
                                                                        }}>
                                                                            <Shield size={14}/> Set as Admin
                                                                        </button>
                                                                    )}
                                                                    {isAdmin && (
                                                                        <button onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleChangePermissions(member.user_id, 'member');
                                                                            setShowDropdown(null)
                                                                        }}>
                                                                            <User size={14}/> Set as Member
                                                                        </button>
                                                                    )}
                                                                    {!isOwner && (
                                                                        <button onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleTransferOwnership(member.user_id);
                                                                            setShowDropdown(null);
                                                                        }}>
                                                                            <Crown size={14}/> Transfer Ownership
                                                                        </button>
                                                                    )}
                                                                    <button className={styles.removeMemberBtn}
                                                                        onClick={() => {
                                                                            setTargetMember(member);
                                                                            setConfirmModal({
                                                                                title: 'Remove Member',
                                                                                confirmVariant: 'danger',
                                                                                confirmText: 'Remove Member',
                                                                                type: 'remove-member'
                                                                            })
                                                                        }}>
                                                                        <Trash2 size={16}/> Remove Member
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {isOwner && !isCurrentUser &&
                                                    <div className={styles.ownerBadgeLarge}><Crown size={16}/></div>}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                </div>
                <ConfirmModal
                    isOpen={!!confirmModal}
                    title={confirmModal?.title}
                    confirmVariant={confirmModal?.confirmVariant || 'primary'}
                    confirmText={confirmModal?.confirmText}
                    disabled={confirmModal?.confirmDisabled}
                    onClose={() => setConfirmModal(null)}
                    onConfirm={() => {
                        const { type, targetId } = confirmModal || {};

                        switch(type) {
                            case 'invite-member':
                                handleInviteUser({
                                    ...inviteTarget,
                                    role_in_team: inviteRole || null,
                                    permission_level: invitePermission
                                });
                                setInviteMode(false);
                                break;
                            case 'remove-member':
                                handleRemoveMember(targetMember?.user_id);
                                break;
                            case 'change-permissions':
                                handleChangePermissions(targetMember?.user_id, 'admin');
                                break;
                            case 'add-column':
                                toggleShowOnBoard(targetId);
                                break;
                            case 'delete-status':
                                removeStatus(targetId);
                                break;
                            case 'delete-column':
                                toggleShowOnBoard(targetId);
                                break;
                            case 'delete-lane':
                                removeLane(targetId);
                                break;
                        }
                        setConfirmModal(null);
                    }}
                >
                    {(() => {
                        if (!confirmModal) return null;

                        const { type, targetId } = confirmModal;
                        const targetStatus = statuses.find(s => s.id === targetId);
                        const targetLane = lanes.find(l => l.id === targetId);

                        switch(type) {
                            case 'invite-member':
                                return (
                                    <InviteMemberContent
                                        member={inviteTarget}
                                        inviteRole={inviteRole}
                                        invitePermission={invitePermission}
                                        onRoleChange={setInviteRole}
                                        onPermissionChange={setInvitePermission}
                                    />
                                );
                            case 'add-column':
                                return <AddColumnContent status={targetStatus} />;
                            case 'remove-member':
                                return <RemoveMemberContent member={targetMember} />;
                            case 'change-permissions':
                                return <AdminPermissionsContent member={targetMember} />;
                            case 'delete-status':
                                return <DeleteStatusContent status={targetStatus} projectId={projectId} tasksCount={statusTasksCount || 0} />;
                            case 'delete-column':
                                return <DeleteColumnContent status={targetStatus} />;
                            case 'delete-lane':
                                return <DeleteLaneContent lane={targetLane} />;
                            default:
                                return null;
                        }
                    })()}
                </ConfirmModal>
            </div>
        </div>
    );
}

