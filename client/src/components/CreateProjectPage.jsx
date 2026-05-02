import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Trash2,
    GripVertical,
    Save,
    ChevronRight,
    ChevronLeft,
    Edit2,
    HelpCircle,
    Play,
    X, AlertCircle, LayoutGrid, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import styles from '../styles/CreateProjectPage.module.css';
import CustomSelector from "./CustomSelector";
import CustomInputSelector from "./CustomInputSelector";
import {PROJECT_COLORS} from "../assets/constants/colors";
import {projectService} from "../services/projectService";

// Валидация правила на фронтенде (базовая проверка синтаксиса)
const validateRuleSyntax = (ruleString) => {
    if (!ruleString || !ruleString.trim()) {
        return { valid: false, error: 'Rule cannot be empty' };
    }

    const trimmed = ruleString.trim();

    // Проверяем базовую структуру: field operator value
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3 && !trimmed.includes('(')) {
        // Простое условие должно иметь минимум 3 части
        if (!trimmed.match(/^(\w+)\s+(=|!=|>|<|>=|<=|contains|not_contains|in|not_in|contains_any|contains_all|is_null|is_not_null)\s+(.+)$/)) {
            return {
                valid: false,
                error: 'Invalid rule format. Example: priority = critical'
            };
        }
    }

    // Проверяем баланс скобок
    const openCount = (trimmed.match(/\(/g) || []).length;
    const closeCount = (trimmed.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
        return { valid: false, error: 'Unbalanced parentheses' };
    }

    // Проверяем допустимые поля
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

export default function CreateProjectPage({ user, onProjectCreated }) {
    const navigate = useNavigate();
    const { showToast, handleApiError } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRuleHelper, setShowRuleHelper] = useState(false);
    const [testingRule, setTestingRule] = useState(null);

    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        statuses: [
            { tempId: 'status-1', name: 'To Do', status_type: 'todo', color: '#6B7280', showOnBoard: true, boardPosition: 1 },
            { tempId: 'status-2', name: 'In Progress', status_type: 'progress', color: '#3B82F6', showOnBoard: true, boardPosition: 2 },
            { tempId: 'status-3', name: 'In Review', status_type: 'progress', color: '#8B5CF6', showOnBoard: true, boardPosition: 3 },
            { tempId: 'status-4', name: 'Done', status_type: 'completed', color: '#10B981', showOnBoard: true, boardPosition: 4 }
        ],
        lanes: [
            {
                tempId: 'lane-1',
                title: 'Critical',
                description: 'Critical priority tasks',
                color: '#EF4444',
                position: 1,
                ruleString: "priority = 'critical'"
            },
            {
                tempId: 'lane-2',
                title: 'High',
                description: 'High priority tasks',
                color: '#F97316',
                position: 2,
                ruleString: "priority = 'high'"
            },
            {
                tempId: 'lane-3',
                title: 'Medium',
                description: 'Medium priority tasks',
                color: '#EAB308',
                position: 3,
                ruleString: "priority = 'medium'"
            },
            {
                tempId: 'lane-4',
                title: 'Low',
                description: 'Low priority tasks',
                color: '#6B7280',
                position: 4,
                ruleString: "priority = 'low'"
            }
        ],
        tags: [
            { tempId: 'tag-1', title: 'urgent', color: '#EF4444' },
            { tempId: 'tag-2', title: 'feature', color: '#3B82F6' },
            { tempId: 'tag-3', title: 'bug', color: '#DC2626' },
            { tempId: 'tag-4', title: 'docs', color: '#8B5CF6' }
        ]
    });

    const [newStatus, setNewStatus] = useState({
        name: '',
        status_type: 'todo',
        color: '#8B5CF6',
        showOnBoard: true
    });
    const [newLane, setNewLane] = useState({
        title: '',
        description: '',
        color: '#8B5CF6',
        ruleString: 'priority = medium'
    });
    const [newTag, setNewTag] = useState({ title: '', color: '#8B5CF6' });

    const [editingStatus, setEditingStatus] = useState(null);
    const [editingLane, setEditingLane] = useState(null);

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
        { label: 'In progress > 5 days', rule: 'progress_days > 5' },
        { label: 'Complex rule', rule: '(priority = critical OR priority = high) AND is_overdue = false' }
    ];

    const handleCreateProject = async () => {
        setIsSubmitting(true);

        try {
            // Проверяем что хотя бы один статус отображается на доске
            if (getBoardColumnsCount() === 0) {
                showToast('At least one status must be visible on board', 'warning');
                setIsSubmitting(false);
                return;
            }

            // Валидируем все правила перед отправкой
            for (const lane of projectData.lanes) {
                const validation = validateRuleSyntax(lane.ruleString);
                if (!validation.valid) {
                    showToast(`Invalid rule in lane "${lane.title}": ${validation.error}`, 'error');
                    setIsSubmitting(false);
                    return;
                }
            }

            // Формируем статусы для отправки
            // Статусам, которые будут на доске, добавляем board_position
            const statuses = projectData.statuses
                .sort((a, b) => {
                    // Сортируем: сначала те что на доске по boardPosition, потом скрытые
                    if (a.showOnBoard && b.showOnBoard) {
                        return a.boardPosition - b.boardPosition;
                    }
                    if (a.showOnBoard) return -1;
                    if (b.showOnBoard) return 1;
                    return 0;
                })
                .map(status => {
                    const baseStatus = {
                        name: status.name,
                        status_type: status.status_type,
                        color: status.color
                    };

                    // Если статус отображается на доске, добавляем board_position
                    if (status.showOnBoard) {
                        return {
                            ...baseStatus,
                            board_position: status.boardPosition
                        };
                    }

                    return baseStatus;
                });

            // Формируем линии для отправки
            const lanes = projectData.lanes.map(({ tempId, ...lane }) => ({
                title: lane.title,
                description: lane.description || '',
                color: lane.color,
                position: lane.position,
                rule_condition: lane.ruleString // Бэкенд сам преобразует в JSON через парсер
            }));

            // Формируем теги для отправки
            const tags = projectData.tags.map(({ tempId, ...tag }) => ({
                title: tag.title,
                color: tag.color
            }));

            const payload = {
                name: projectData.name,
                description: projectData.description || '',
                statuses: statuses,
                lanes: lanes,
                tags: tags
            };

            const response = await projectService.createProject(payload)

            if (!response.ok) {
                const errorData = await response.json();
                throw { response: { data: errorData } };
            }

            const newProject = await response.json();
            showToast('Project created successfully!', 'success');
            onProjectCreated?.(newProject);
            navigate(`/project/${newProject.id}/board`);
        } catch (error) {
            handleApiError(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Тестирование правила (можно добавить эндпоинт для тестирования)
    const testRule = async (ruleString) => {
        try {
            setTestingRule(ruleString);
            // Здесь можно добавить API вызов для тестирования правила
            // const response = await fetch('/api/rules/test', {
            //     method: 'POST',
            //     body: JSON.stringify({ rule: ruleString })
            // });

            // Пока просто показываем, что правило валидно
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

    // Status management
    const addStatus = () => {
        if (!newStatus.name.trim()) {
            showToast('Status name is required', 'warning');
            return;
        }

        // Проверяем лимит только если новый статус будет на доске
        if (newStatus.showOnBoard && getBoardColumnsCount() >= MAX_BOARD_COLUMNS) {
            showToast(`Maximum ${MAX_BOARD_COLUMNS} columns allowed on board`, 'warning');
            return;
        }

        if (projectData.statuses.some(s => s.name.toLowerCase() === newStatus.name.toLowerCase())) {
            showToast('Status with this name already exists', 'warning');
            return;
        }

        // Вычисляем следующий boardPosition если статус будет на доске
        const nextBoardPosition = newStatus.showOnBoard
            ? projectData.statuses.filter(s => s.showOnBoard).length + 1
            : 0;

        setProjectData(prev => ({
            ...prev,
            statuses: [
                ...prev.statuses,
                {
                    tempId: `status-${Date.now()}`,
                    ...newStatus,
                    boardPosition: nextBoardPosition
                }
            ]
        }));
        setNewStatus({ name: '', status_type: 'todo', color: '#8B5CF6', showOnBoard: true });
    };

    const updateStatus = (tempId, updates) => {
        setProjectData(prev => ({
            ...prev,
            statuses: prev.statuses.map(s =>
                s.tempId === tempId ? { ...s, ...updates } : s
            )
        }));
        setEditingStatus(null);
    };

    const removeStatus = (tempId) => {
        if (projectData.statuses.length <= 1) {
            showToast('Project must have at least one status', 'warning');
            return;
        }
        setProjectData(prev => ({
            ...prev,
            statuses: prev.statuses.filter(s => s.tempId !== tempId)
        }));
    };

    const moveStatus = (index, direction) => {
        const newStatuses = [...projectData.statuses];
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < newStatuses.length) {
            [newStatuses[index], newStatuses[newIndex]] = [newStatuses[newIndex], newStatuses[index]];
            newStatuses.forEach((status, i) => { status.position = i + 1; });
            setProjectData(prev => ({ ...prev, statuses: newStatuses }));
        }
    };

    const MAX_BOARD_COLUMNS = 5;

    const getBoardColumnsCount = () => {
        return projectData.statuses.filter(s => s.showOnBoard).length;
    };

    const toggleShowOnBoard = (tempId) => {
        const status = projectData.statuses.find(s => s.tempId === tempId);
        const currentBoardColumns = getBoardColumnsCount();

        if (!status.showOnBoard && currentBoardColumns >= MAX_BOARD_COLUMNS) {
            showToast(`Maximum ${MAX_BOARD_COLUMNS} columns allowed on board`, 'warning');
            return;
        }

        setProjectData(prev => {
            const newShowOnBoard = !status.showOnBoard;
            let newBoardPosition = status.boardPosition;

            if (newShowOnBoard) {
                // Добавляем в конец списка колонок
                newBoardPosition = prev.statuses.filter(s => s.showOnBoard).length + 1;
            }

            const updatedStatuses = prev.statuses.map(s => {
                if (s.tempId === tempId) {
                    return { ...s, showOnBoard: newShowOnBoard, boardPosition: newBoardPosition };
                }
                // Если убрали статус с доски, сдвигаем позиции остальных
                if (!newShowOnBoard && s.showOnBoard && s.boardPosition > status.boardPosition) {
                    return { ...s, boardPosition: s.boardPosition - 1 };
                }
                return s;
            });

            return { ...prev, statuses: updatedStatuses };
        });
    };

    const moveBoardColumn = (index, direction) => {
        const boardStatuses = projectData.statuses
            .filter(s => s.showOnBoard)
            .sort((a, b) => a.boardPosition - b.boardPosition);

        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < boardStatuses.length) {
            // Меняем местами boardPosition
            const tempPosition = boardStatuses[index].boardPosition;

            setProjectData(prev => ({
                ...prev,
                statuses: prev.statuses.map(s => {
                    if (s.tempId === boardStatuses[index].tempId) {
                        return { ...s, boardPosition: boardStatuses[newIndex].boardPosition };
                    }
                    if (s.tempId === boardStatuses[newIndex].tempId) {
                        return { ...s, boardPosition: tempPosition };
                    }
                    return s;
                })
            }));
        }
    };

    // Lane management
    const addLane = () => {
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

        setProjectData(prev => ({
            ...prev,
            lanes: [
                ...prev.lanes,
                {
                    tempId: `lane-${Date.now()}`,
                    ...newLane,
                    position: prev.lanes.length + 1
                }
            ]
        }));
        setNewLane({
            title: '',
            description: '',
            color: '#8B5CF6',
            ruleString: 'priority = medium'
        });
    };

    const updateLane = (tempId, updates) => {
        if (updates.ruleString) {
            const validation = validateRuleSyntax(updates.ruleString);
            if (!validation.valid) {
                showToast(validation.error, 'error');
                return;
            }
        }

        setProjectData(prev => ({
            ...prev,
            lanes: prev.lanes.map(l =>
                l.tempId === tempId ? { ...l, ...updates } : l
            )
        }));
        setEditingLane(null);
    };

    const removeLane = (tempId) => {
        setProjectData(prev => ({
            ...prev,
            lanes: prev.lanes.filter(l => l.tempId !== tempId)
        }));
    };

    const moveLane = (index, direction) => {
        const newLanes = [...projectData.lanes];
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < newLanes.length) {
            [newLanes[index], newLanes[newIndex]] = [newLanes[newIndex], newLanes[index]];
            newLanes.forEach((lane, i) => { lane.position = i + 1; });
            setProjectData(prev => ({ ...prev, lanes: newLanes }));
        }
    };

    // Tag management
    const addTag = () => {
        if (!newTag.title.trim()) {
            showToast('Tag name is required', 'warning');
            return;
        }

        if (projectData.tags.some(t => t.title.toLowerCase() === newTag.title.toLowerCase())) {
            showToast('Tag with this name already exists', 'warning');
            return;
        }

        setProjectData(prev => ({
            ...prev,
            tags: [...prev.tags, { tempId: `tag-${Date.now()}`, ...newTag }]
        }));
        setNewTag({ title: '', color: '#8B5CF6' });
    };

    const removeTag = (tempId) => {
        setProjectData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t.tempId !== tempId)
        }));
    };

    // Функция для рендера цвета в селекторе
    const renderColorOption = (color) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                backgroundColor: color.hex,
                flexShrink: 0
            }} />
            <span>{color.label}</span>
            <span style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.4)',
                fontFamily: 'monospace'
            }}>
            {color.hex}
        </span>
        </div>
    );

    // Функция для рендера выбранного цвета (без хэша)
    const renderSelectedColor = (color) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                backgroundColor: color.hex,
                flexShrink: 0
            }} />
            <span>{color.label}</span>
        </div>
    );

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/')}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>Create New Project</h1>
                    <div className={styles.stepIndicator}>
                        <span className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>1</span>
                        <ChevronRight size={16} className={styles.stepArrow} />
                        <span className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>2</span>
                        <ChevronRight size={16} className={styles.stepArrow} />
                        <span className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>3</span>
                        <ChevronRight size={16} className={styles.stepArrow} />
                        <span className={`${styles.step} ${step >= 4 ? styles.active : ''}`}>4</span>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className={styles.setupStep}>
                        <div className={styles.stepHeader}>
                            <h2 className={styles.stepTitle}>Project Details</h2>
                            <p className={styles.stepDescription}>Give your project a name and description</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Project Name <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                className={styles.input}
                                value={projectData.name}
                                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                                placeholder="e.g., Mobile App Development"
                                autoFocus
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={projectData.description}
                                onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                                placeholder="What is this project about?"
                                rows={4}
                            />
                        </div>

                        <div className={styles.stepActions}>
                            <div></div>
                            <button
                                className={styles.nextBtn}
                                onClick={() => setStep(2)}
                                disabled={!projectData.name.trim() || isSubmitting}
                            >
                                Next: Statuses
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Statuses & Board Columns */}
                {step === 2 && (
                    <div className={styles.setupStep}>
                        <div className={styles.stepHeader}>
                            <h2 className={styles.stepTitle}>Workflow Statuses & Board Columns</h2>
                            <p className={styles.stepDescription}>
                                Create all project statuses, then choose which ones appear on the board and set their order
                            </p>
                        </div>

                        {/* Все статусы проекта */}
                        <div className={styles.sectionHeader}>
                            <h3 className={styles.sectionTitle}>All Statuses</h3>
                            <span className={styles.sectionHint}>Define all possible task states</span>
                        </div>

                        <div className={styles.itemsList}>
                            {projectData.statuses.map((status) => (
                                <div key={status.tempId} className={styles.listItem}>
                                    {editingStatus === status.tempId ? (
                                        <div className={styles.itemEditForm}>
                                            <div className={styles.colorPickerContainer}>
                                                <div
                                                    className={styles.colorPickerColor}
                                                    style={{backgroundColor: status.color}}
                                                />
                                                {/* CustomInputSelector для цвета */}
                                                <CustomInputSelector
                                                    availableItems={PROJECT_COLORS}
                                                    onSelect={(color) => {
                                                        const updated = {...status, color: color.hex};
                                                        setProjectData(prev => ({
                                                            ...prev,
                                                            statuses: prev.statuses.map(s =>
                                                                s.tempId === status.tempId ? updated : s
                                                            )
                                                        }));
                                                    }}
                                                    defaultItem={PROJECT_COLORS.find(c => c.hex === status.color) || PROJECT_COLORS[0]}
                                                    renderItem={renderColorOption}
                                                    renderDefaultItem={renderSelectedColor}
                                                    getItemId={(color) => color.name}
                                                    getItemName={(color) => color.label}
                                                    placeholder="Search color..."
                                                    wrapperClassName={styles.colorPicker}
                                                    inputClassName={styles.colorPickerInput}
                                                    dropdownClassName={styles.colorPickerDropdown}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className={styles.editInput}
                                                value={status.name}
                                                onChange={(e) => {
                                                    const updated = { ...status, name: e.target.value };
                                                    setProjectData(prev => ({
                                                        ...prev,
                                                        statuses: prev.statuses.map(s =>
                                                            s.tempId === status.tempId ? updated : s
                                                        )
                                                    }));
                                                }}
                                                autoFocus
                                            />
                                            <CustomSelector
                                                items={statusTypes}
                                                selectedIndex={statusTypes.findIndex(t => t.value === status.status_type)}
                                                onSelect={(type) => {
                                                    const updated = { ...status, status_type: type.value };
                                                    setProjectData(prev => ({
                                                        ...prev,
                                                        statuses: prev.statuses.map(s =>
                                                            s.tempId === status.tempId ? updated : s
                                                        )
                                                    }));
                                                }}
                                                renderItem={(type) => (
                                                    <div>
                                                        <span style={{ fontSize: '14px' }}>{type.label}</span>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            color: 'rgba(255, 255, 255, 0.4)',
                                                            marginLeft: '8px'
                                                        }}>
                                                            {type.description}
                                                        </span>
                                                    </div>
                                                )}
                                                getItemId={(type) => type.value}
                                                getItemName={(type) => type.label}
                                                placeholder="Select type..."
                                                buttonClassName={styles.editSelect}
                                            />
                                            <button
                                                className={styles.saveEdit}
                                                onClick={() => setEditingStatus(null)}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className={styles.itemColor}
                                                style={{backgroundColor: status.color}}
                                            />
                                            <div className={styles.itemInfo}>
                                                <span className={styles.itemName}>{status.name}</span>
                                                <span className={styles.itemMeta}>
                                                    {statusTypes.find(t => t.value === status.status_type)?.label}
                                                </span>
                                            </div>
                                            <div className={styles.itemActions}>
                                                <button
                                                    className={styles.toggleBoardBtn}
                                                    onClick={() => toggleShowOnBoard(status.tempId)}
                                                    title={status.showOnBoard ? 'Show on board' : 'Hidden from board'}
                                                >
                                                    {status.showOnBoard ? <Eye size={14}/> : <EyeOff size={14}/>}
                                                </button>
                                                <button
                                                    className={styles.editBtn}
                                                    onClick={() => setEditingStatus(status.tempId)}
                                                >
                                                    <Edit2 size={14}/>
                                                </button>
                                                <button
                                                    className={styles.removeBtn}
                                                    onClick={() => removeStatus(status.tempId)}
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.addItem}>
                            <h4 className={styles.addTitle}>Add New Status</h4>
                            <div className={styles.addForm}>
                                <div className={styles.addStatusForm}>
                                    <div className={styles.colorPickerContainer}>
                                        <div
                                            className={styles.colorPickerColor}
                                            style={{backgroundColor: newStatus.color}}
                                        />
                                        {/* CustomInputSelector для цвета */}
                                        <CustomInputSelector
                                            availableItems={PROJECT_COLORS}
                                            onSelect={(color) => setNewStatus({...newStatus, color: color.hex})}
                                            defaultItem={PROJECT_COLORS.find(c => c.hex === newStatus.color) || PROJECT_COLORS[0]}
                                            renderItem={renderColorOption}
                                            renderDefaultItem={renderSelectedColor}
                                            getItemId={(color) => color.name}
                                            getItemName={(color) => color.label}
                                            placeholder="Search color..."
                                            inputClassName={styles.colorPicker}
                                            dropdownClassName={styles.colorPickerDropdown}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className={styles.addInput}
                                        placeholder="Status name"
                                        value={newStatus.name}
                                        onChange={(e) => setNewStatus({...newStatus, name: e.target.value})}
                                        onKeyPress={(e) => e.key === 'Enter' && addStatus()}
                                    />
                                    {/* CustomSelector для status_type */}
                                    <CustomSelector
                                        items={statusTypes}
                                        selectedIndex={statusTypes.findIndex(t => t.value === newStatus.status_type)}
                                        onSelect={(type) => setNewStatus({...newStatus, status_type: type.value})}
                                        renderItem={(type) => (
                                            <div>
                                                <span style={{fontSize: '14px'}}>{type.label}</span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: 'rgba(255, 255, 255, 0.4)',
                                                    marginLeft: '8px'
                                                }}>
                                                {type.description}
                                            </span>
                                            </div>
                                        )}
                                        getItemId={(type) => type.value}
                                        getItemName={(type) => type.label}
                                        placeholder="Select type..."
                                        buttonClassName={styles.addSelect}
                                    />
                                    <button
                                        type="button"
                                        className={`${styles.toggleBoardBtn} ${styles.addFormToggle}`}
                                        onClick={() => setNewStatus({
                                            ...newStatus,
                                            showOnBoard: !newStatus.showOnBoard
                                        })}
                                        title={newStatus.showOnBoard ? 'Will show on board' : 'Will be hidden'}
                                    >
                                        {newStatus.showOnBoard ? <Eye size={16}/> : <EyeOff size={16}/>}
                                    </button>
                                    <button className={styles.addBtn} onClick={addStatus}>
                                        <Plus size={16}/>
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Колонки на доске */}
                        <div className={styles.sectionHeader} style={{marginTop: '32px'}}>
                            <h3 className={styles.sectionTitle}>Board Columns Order</h3>
                            <span className={styles.sectionHint}>Drag to reorder columns on the board</span>
                        </div>

                        <div className={styles.boardColumnsInfo}>
                            <div className={styles.columnsCounter}>
                                <LayoutGrid size={16}/>
                                <span>
                                    Columns on board: <strong>{getBoardColumnsCount()}</strong> / {MAX_BOARD_COLUMNS}
                                </span>
                            </div>
                            {getBoardColumnsCount() === MAX_BOARD_COLUMNS && (
                                <div className={styles.maxColumnsWarning}>
                                    <AlertCircle size={14}/>
                                    <span>Maximum columns reached</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.itemsList}>
                            {projectData.statuses
                                .filter(s => s.showOnBoard)
                                .sort((a, b) => a.boardPosition - b.boardPosition)
                                .map((status, index) => (
                                    <div key={status.tempId} className={styles.listItem}>
                                        <div className={styles.dragHandle}>
                                            <GripVertical size={16}/>
                                        </div>
                                        <div
                                            className={styles.itemColor}
                                            style={{backgroundColor: status.color}}
                                        />
                                        <div className={styles.itemInfo}>
                                            <span className={styles.itemName}>{status.name}</span>
                                            <span className={styles.itemMeta}>
                                                {statusTypes.find(t => t.value === status.status_type)?.label}
                                            </span>
                                        </div>
                                        <div className={styles.itemActions}>
                                        <button
                                                className={styles.moveBtn}
                                                onClick={() => moveBoardColumn(index, -1)}
                                                disabled={index === 0}
                                            >
                                                ↑
                                            </button>
                                            <button
                                                className={styles.moveBtn}
                                                onClick={() => moveBoardColumn(index, 1)}
                                                disabled={index === getBoardColumnsCount() - 1}
                                            >
                                                ↓
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            {getBoardColumnsCount() === 0 && (
                                <div className={styles.emptyBoardMessage}>
                                    <EyeOff size={20} />
                                    <span>No columns selected for board</span>
                                    <p>Click the eye icon on statuses above to add them to the board</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.stepActions}>
                            <button className={styles.backBtnStep} onClick={() => setStep(1)}>
                                <ChevronLeft size={18} />
                                Back
                            </button>
                            <button
                                className={styles.nextBtn}
                                onClick={() => setStep(3)}
                                disabled={projectData.statuses.length === 0 || getBoardColumnsCount() === 0}
                            >
                                Next: Smart Lanes & Tags
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Smart Lanes */}
                {step === 3 && (
                    <div className={styles.setupStep}>
                        <div className={styles.stepHeader}>
                            <h2 className={styles.stepTitle}>Smart Lanes</h2>
                            <p className={styles.stepDescription}>Create lanes with rules to automatically organize
                                tasks</p>
                            <button
                                className={styles.helpBtn}
                                onClick={() => setShowRuleHelper(!showRuleHelper)}
                            >
                                <HelpCircle size={16}/>
                                Rule Syntax Help
                            </button>
                        </div>

                        {showRuleHelper && (
                            <div className={styles.ruleHelper}>
                                <div className={styles.helperHeader}>
                                    <h4>Rule Syntax Examples</h4>
                                    <button
                                        className={styles.closeHelper}
                                        onClick={() => setShowRuleHelper(false)}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className={styles.helperContent}>
                                    {ruleExamples.map((example, i) => (
                                        <div key={i} className={styles.ruleExample}>
                                            <code className={styles.ruleCode}>{example.rule}</code>
                                            <span className={styles.ruleLabel}>{example.label}</span>
                                            <button
                                                className={styles.useExample}
                                                onClick={() => {
                                                    setNewLane(prev => ({ ...prev, ruleString: example.rule }));
                                                    setShowRuleHelper(false);
                                                }}
                                            >
                                                Use
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.itemsList}>
                            {projectData.lanes.map((lane, index) => (
                                <div key={lane.tempId} className={`${styles.listItem} ${styles.laneItem}`}>
                                    <div className={styles.dragHandle}>
                                        <GripVertical size={16} />
                                    </div>

                                    {editingLane === lane.tempId ? (
                                        <div className={styles.laneEditForm}>
                                            <div className={styles.formRow}>
                                                <div className={styles.colorPickerContainer}>
                                                    <div
                                                        className={styles.colorPickerColor}
                                                        style={{backgroundColor: lane.color}}
                                                    />
                                                    {/* CustomInputSelector для цвета */}
                                                    <CustomInputSelector
                                                        availableItems={PROJECT_COLORS}
                                                        onSelect={(color) => {
                                                            const updated = {...lane, color: color.hex};
                                                            setProjectData(prev => ({
                                                                ...prev,
                                                                lanes: prev.lanes.map(s =>
                                                                    s.tempId === lane.tempId ? updated : s
                                                                )
                                                            }));
                                                        }}
                                                        defaultItem={PROJECT_COLORS.find(c => c.hex === lane.color) || PROJECT_COLORS[0]}
                                                        renderItem={renderColorOption}
                                                        renderDefaultItem={renderSelectedColor}
                                                        getItemId={(color) => color.name}
                                                        getItemName={(color) => color.label}
                                                        placeholder="Search color..."
                                                        wrapperClassName={styles.colorPicker}
                                                        inputClassName={styles.colorPickerInput}
                                                        dropdownClassName={styles.colorPickerDropdown}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    className={styles.editInput}
                                                    value={lane.title}
                                                    onChange={(e) => {
                                                        const updated = {...lane, title: e.target.value};
                                                        setProjectData(prev => ({
                                                            ...prev,
                                                            lanes: prev.lanes.map(l =>
                                                                l.tempId === lane.tempId ? updated : l
                                                            )
                                                        }));
                                                    }}
                                                    placeholder="Lane title"
                                                    autoFocus
                                                />
                                            </div>

                                            <textarea
                                                className={styles.editTextarea}
                                                value={lane.description}
                                                onChange={(e) => {
                                                    const updated = {...lane, description: e.target.value};
                                                    setProjectData(prev => ({
                                                        ...prev,
                                                        lanes: prev.lanes.map(l =>
                                                            l.tempId === lane.tempId ? updated : l
                                                        )
                                                    }));
                                                }}
                                                placeholder="Description"
                                                rows={2}
                                            />
                                            <input
                                                className={styles.editInput}
                                                value={lane.ruleString}
                                                onChange={(e) => {
                                                    const updated = {...lane, ruleString: e.target.value};
                                                    setProjectData(prev => ({
                                                        ...prev,
                                                        lanes: prev.lanes.map(l =>
                                                            l.tempId === lane.tempId ? updated : l
                                                        )
                                                    }));
                                                }}
                                                placeholder="Rule (e.g., priority = critical)"
                                            />
                                            <div className={styles.editActions}>
                                                <button
                                                    className={styles.testRuleBtn}
                                                    onClick={() => testRule(lane.ruleString)}
                                                    disabled={testingRule === lane.ruleString}
                                                >
                                                    <Play size={14}/>
                                                    Test
                                                </button>
                                                <button
                                                    className={styles.saveEdit}
                                                    onClick={() => setEditingLane(null)}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className={styles.itemColor}
                                                style={{backgroundColor: lane.color}}
                                            />
                                            <div className={styles.itemInfo}>
                                                <span className={styles.itemName}>{lane.title}</span>
                                                <span className={styles.itemDescription}>{lane.description}</span>
                                                <code className={styles.itemRule}>{lane.ruleString}</code>
                                            </div>
                                            <div className={styles.itemActions}>
                                                <button
                                                    className={styles.moveBtn}
                                                    onClick={() => moveLane(index, -1)}
                                                    disabled={index === 0}
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    className={styles.moveBtn}
                                                    onClick={() => moveLane(index, 1)}
                                                    disabled={index === projectData.lanes.length - 1}
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    className={styles.editBtn}
                                                    onClick={() => setEditingLane(lane.tempId)}
                                                >
                                                    <Edit2 size={14}/>
                                                </button>
                                                <button
                                                    className={styles.removeBtn}
                                                    onClick={() => removeLane(lane.tempId)}
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.addItem}>
                            <h4 className={styles.addTitle}>Add New Lane</h4>
                            <div className={`${styles.addForm} ${styles.laneAddForm}`}>
                                <div className={styles.formRow}>
                                    <div className={styles.colorPickerContainer}>
                                        <div
                                            className={styles.colorPickerColor}
                                            style={{backgroundColor: newLane.color}}
                                        />
                                        {/* CustomInputSelector для цвета */}
                                        <CustomInputSelector
                                            availableItems={PROJECT_COLORS}
                                            onSelect={(color) => setNewLane({...newLane, color: color.hex})}
                                            defaultItem={PROJECT_COLORS.find(c => c.hex === newLane.color) || PROJECT_COLORS[0]}
                                            renderItem={renderColorOption}
                                            renderDefaultItem={renderSelectedColor}
                                            getItemId={(color) => color.name}
                                            getItemName={(color) => color.label}
                                            placeholder="Search color..."
                                            inputClassName={styles.colorPicker}
                                            dropdownClassName={styles.colorPickerDropdown}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className={styles.addInput}
                                        placeholder="Lane title"
                                        value={newLane.title}
                                        onChange={(e) => setNewLane({...newLane, title: e.target.value})}
                                    />
                                </div>
                                <textarea
                                    className={styles.addTextarea}
                                    placeholder="Description"
                                    value={newLane.description}
                                    onChange={(e) => setNewLane({...newLane, description: e.target.value})}
                                    rows={2}
                                />
                                <input
                                    className={styles.addInput}
                                    placeholder="Rule (e.g., priority = high)"
                                    value={newLane.ruleString}
                                    onChange={(e) => setNewLane({...newLane, ruleString: e.target.value})}
                                />
                                <div className={styles.formRow}>
                                    <button
                                        className={styles.testRuleBtn}
                                        onClick={() => testRule(newLane.ruleString)}
                                        disabled={testingRule === newLane.ruleString}
                                    >
                                        <Play size={14}/>
                                        Test Rule
                                    </button>
                                    <button className={styles.addBtn} onClick={addLane}>
                                        <Plus size={16}/>
                                        Add Lane
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.stepActions}>
                            <button className={styles.backBtnStep} onClick={() => setStep(2)}>
                                <ChevronLeft size={18} />
                                Back
                            </button>
                            <button className={styles.nextBtn} onClick={() => setStep(4)}>
                                Next: Tags
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Tags */}
                {step === 4 && (
                    <div className={styles.setupStep}>
                        <div className={styles.stepHeader}>
                            <h2 className={styles.stepTitle}>Project Tags</h2>
                            <p className={styles.stepDescription}>Create tags to categorize and filter tasks</p>
                        </div>

                        <div className={styles.tagsGrid}>
                            {projectData.tags.map((tag) => (
                                <div
                                    key={tag.tempId}
                                    className={styles.tagItem}
                                    style={{
                                        backgroundColor: `${tag.color}20`,
                                        borderColor: tag.color,
                                        color: tag.color
                                    }}
                                >
                                    <span className={styles.tagTitle} style={{ color: tag.color }}>{tag.title}</span>
                                    <button
                                        className={styles.removeTag}
                                        onClick={() => removeTag(tag.tempId)}
                                    >
                                        <X size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className={styles.addItem}>
                            <h4 className={styles.addTitle}>Add New Tag</h4>
                            <div className={`${styles.addForm} ${styles.tagAddForm}`}>
                            <input
                                    type="text"
                                    className={styles.addInput}
                                    placeholder="Tag name"
                                    value={newTag.title}
                                    onChange={(e) => setNewTag({ ...newTag, title: e.target.value })}
                                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                />
                                <div className={styles.colorPickerContainer}>
                                    <div
                                        className={styles.colorPickerColor}
                                        style={{backgroundColor: newTag.color}}
                                    />
                                    {/* CustomInputSelector для цвета */}
                                    <CustomInputSelector
                                        availableItems={PROJECT_COLORS}
                                        onSelect={(color) => setNewTag({...newTag, color: color.hex})}
                                        defaultItem={PROJECT_COLORS.find(c => c.hex === newTag.color) || PROJECT_COLORS[0]}
                                        renderItem={renderColorOption}
                                        renderDefaultItem={renderSelectedColor}
                                        getItemId={(color) => color.name}
                                        getItemName={(color) => color.label}
                                        placeholder="Search color..."
                                        inputClassName={styles.colorPicker}
                                        dropdownClassName={styles.colorPickerDropdown}
                                    />
                                </div>
                                <button className={styles.addBtn} onClick={addTag}>
                                    <Plus size={16}/>
                                    Add Tag
                                </button>
                            </div>
                        </div>

                        <div className={styles.stepActions}>
                            <button className={styles.backBtnStep} onClick={() => setStep(3)}>
                                <ChevronLeft size={18}/>
                                Back
                            </button>
                            <button
                                className={styles.createBtn}
                                onClick={handleCreateProject}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    'Creating...'
                                ) : (
                                    <>
                                        <Save size={18}/>
                                        Create Project
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}