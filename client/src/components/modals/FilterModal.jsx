import React, { useState, useEffect } from 'react';
import {
    X,
    Filter,
    User,
    Users,
    UserX,
    UserPlus,
    Tag,
    Calendar,
    Flag,
    ChevronDown,
    ChevronUp,
    XCircle,
    RotateCcw,
    Check
} from 'lucide-react';
import CustomSelector from '../CustomSelector';
import { CustomUserAvatar } from '../CommonComponents';
import '../../styles/FilterModal.css';
import CustomInputSelector from "../CustomInputSelector";

const PRIORITY_OPTIONS = [
    { id: 'low', label: 'Low', color: 'var(--text-tertiary)' },
    { id: 'medium', label: 'Medium', color: 'var(--info)' },
    { id: 'high', label: 'High', color: 'var(--warning)' },
    { id: 'critical', label: 'Critical', color: 'var(--error)' }
];

const TASK_TYPE_OPTIONS = [
    { id: 'all', label: 'All tasks' },
    { id: 'root', label: 'Main tasks only' },
    { id: 'subtask', label: 'Subtasks only' }
];

export default function FilterModal({ isOpen, onClose, onApply, initialFilters, projectMembers, projectStatuses, projectTags }) {
    const [filters, setFilters] = useState({
        statusIds: [],
        priorities: [],
        assigneeId: null,  // null - фильтр не применяется, uuid.Nil/null - unassigned?
        creatorId: null,   // null - фильтр не применяется
        tagIds: [],
        taskType: 'all',
        parentTaskId: null,
        search: '',
        createdAtRange: { from: '', to: '' },
        startDateRange: { from: '', to: '' },
        dueDateRange: { from: '', to: '' },
        closedAtRange: { from: '', to: '' }
    });

    const [expandedSections, setExpandedSections] = useState({
        status: true,
        priority: true,
        assignee: false,
        creator: false,
        tags: false,
        dates: false,
        taskType: false
    });

    useEffect(() => {
        if (initialFilters) {
            setFilters({
                statusIds: initialFilters.statusIds || [],
                priorities: initialFilters.priorities || [],
                assigneeId: initialFilters.assigneeId || null,
                creatorId: initialFilters.creatorId || null,
                tagIds: initialFilters.tagIds || [],
                taskType: initialFilters.taskType || 'all',
                parentTaskId: initialFilters.parentTaskId || null,
                search: initialFilters.search || '',
                createdAtRange: initialFilters.createdAtRange ? { ...initialFilters.createdAtRange } : { from: '', to: '' },
                startDateRange: initialFilters.startDateRange ? { ...initialFilters.startDateRange } : { from: '', to: '' },
                dueDateRange: initialFilters.dueDateRange ? { ...initialFilters.dueDateRange } : { from: '', to: '' },
                closedAtRange: initialFilters.closedAtRange ? { ...initialFilters.closedAtRange } : { from: '', to: '' }
            });
        }
    }, [initialFilters, isOpen]);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleStatusToggle = (statusId) => {
        setFilters(prev => ({
            ...prev,
            statusIds: prev.statusIds.includes(statusId)
                ? prev.statusIds.filter(id => id !== statusId)
                : [...prev.statusIds, statusId]
        }));
    };

    const handlePriorityToggle = (priorityId) => {
        setFilters(prev => ({
            ...prev,
            priorities: prev.priorities.includes(priorityId)
                ? prev.priorities.filter(p => p !== priorityId)
                : [...prev.priorities, priorityId]
        }));
    };


    const handleAddTagFilter = (tag) => {
        if (!filters.tagIds.includes(tag.id)) {
            setFilters(prev => ({
                ...prev,
                tagIds: [...prev.tagIds, tag.id]
            }));
        }
    };

    const handleRemoveTagFilter = (tagId) => {
        setFilters(prev => ({
            ...prev,
            tagIds: prev.tagIds.filter(id => id !== tagId)
        }));
    };

    const handleAssigneeChange = (userId) => {
        if (filters.assigneeId === userId) {
            setFilters(prev => ({ ...prev, assigneeId: null }));
        } else {
            setFilters(prev => ({ ...prev, assigneeId: userId }));
        }
    };

    const handleCreatorChange = (userId) => {
        setFilters(prev => ({ ...prev, creatorId: userId === prev.creatorId ? null : userId }));
    };

    const handleTaskTypeChange = (type) => {
        setFilters(prev => ({ ...prev, taskType: type }));
    };

    const handleDateRangeChange = (rangeName, field, value) => {
        setFilters(prev => ({
            ...prev,
            [rangeName]: { ...prev[rangeName], [field]: value }
        }));
    };

    const clearAllFilters = () => {
        setFilters({
            statusIds: [],
            priorities: [],
            assigneeId: null,
            creatorId: null,
            tagIds: [],
            taskType: 'all',
            parentTaskId: null,
            search: '',
            createdAtRange: { from: '', to: '' },
            startDateRange: { from: '', to: '' },
            dueDateRange: { from: '', to: '' },
            closedAtRange: { from: '', to: '' }
        });

        onApply({});
        onClose();
    };

    const handleApply = () => {
        const activeFilters = {};

        if (filters.statusIds.length > 0) activeFilters.statusIds = filters.statusIds;
        if (filters.priorities.length > 0) activeFilters.priorities = filters.priorities;
        if (filters.assigneeId) activeFilters.assigneeId = filters.assigneeId;
        if (filters.creatorId) activeFilters.creatorId = filters.creatorId;
        if (filters.tagIds.length > 0) activeFilters.tagIds = filters.tagIds;
        if (filters.taskType !== 'all') activeFilters.taskType = filters.taskType;
        if (filters.search) activeFilters.search = filters.search;

        // Диапазоны дат - важно! Копируем полностью объекты
        if (filters.createdAtRange.from || filters.createdAtRange.to) {
            activeFilters.createdAtRange = { ...filters.createdAtRange };
        }
        if (filters.startDateRange.from || filters.startDateRange.to) {
            activeFilters.startDateRange = { ...filters.startDateRange };
        }
        if (filters.dueDateRange.from || filters.dueDateRange.to) {
            activeFilters.dueDateRange = { ...filters.dueDateRange };
        }
        if (filters.closedAtRange.from || filters.closedAtRange.to) {
            activeFilters.closedAtRange = { ...filters.closedAtRange };
        }

        onApply(activeFilters);
        onClose();
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.statusIds.length > 0) count++;
        if (filters.priorities.length > 0) count++;
        if (filters.assigneeId) count++;
        if (filters.creatorId) count++;
        if (filters.tagIds.length > 0) count++;
        if (filters.taskType !== 'all') count++;
        if (filters.search) count++;
        if (filters.createdAtRange.from || filters.createdAtRange.to) count++;
        if (filters.startDateRange.from || filters.startDateRange.to) count++;
        if (filters.dueDateRange.from || filters.dueDateRange.to) count++;
        if (filters.closedAtRange.from || filters.closedAtRange.to) count++;
        return count;
    };

    if (!isOpen) return null;

    return (
        <div className="filter-modal-overlay" onClick={onClose}>
            <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
                <div className="filter-modal-header">
                    <div className="filter-modal-title">
                        <Filter size={20} />
                        <h2>Filters</h2>
                        {getActiveFiltersCount() > 0 && (
                            <span className="filter-active-badge">{getActiveFiltersCount()}</span>
                        )}
                    </div>
                    <button className="filter-modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="filter-modal-content">
                    {/* Поиск */}
                    <div className="filter-search-section">
                        <input
                            type="text"
                            placeholder="Search by title or description..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="filter-search-input"
                        />
                    </div>

                    {/* Статусы */}
                    <div className="filter-section">
                        <div className="filter-section-header" onClick={() => toggleSection('status')}>
                            <span>Status</span>
                            {expandedSections.status ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.status && (
                            <div className="filter-section-content">
                                <div className="filter-checkbox-group">
                                    {projectStatuses?.map(status => (
                                        <label className="filter-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.statusIds.includes(status.id)}
                                                onChange={() => handleStatusToggle(status.id)}
                                                className="custom-checkbox"
                                            />
                                            <span className="custom-checkbox-mark">
                                                {filters.statusIds.includes(status.id) && <span className="checkmark"><Check size={16}/></span>}
                                            </span>
                                            <span
                                                className="filter-status-dot"
                                                style={{backgroundColor: status.color}}
                                            />
                                            <span>{status.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Приоритеты */}
                    <div className="filter-section">
                        <div className="filter-section-header" onClick={() => toggleSection('priority')}>
                            <span>Priority</span>
                            {expandedSections.priority ? <ChevronUp size={16}/> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.priority && (
                            <div className="filter-section-content">
                                <div className="filter-checkbox-group">
                                    {PRIORITY_OPTIONS.map(priority => (
                                        <label key={priority.id} className="filter-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.priorities.includes(priority.id)}
                                                onChange={() => handlePriorityToggle(priority.id)}
                                                className="custom-checkbox"
                                            />
                                            <span className="custom-checkbox-mark">
                                                {filters.priorities.includes(priority.id) &&
                                                    <span className="checkmark"><Check size={16}/></span>}
                                            </span>
                                            <span
                                                className="filter-priority-dot"
                                                style={{backgroundColor: priority.color}}
                                            />
                                            <span>{priority.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Исполнитель */}
                    <div className="filter-section">
                        <div className="filter-section-header" onClick={() => toggleSection('assignee')}>
                            <span>Assignee</span>
                            {expandedSections.assignee ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.assignee && (
                            <div className="filter-section-content">
                                <div className="filter-user-list">
                                    <div
                                        className={`filter-user-item ${filters.assigneeId === 'null' ? 'active' : ''}`}
                                        onClick={() => handleAssigneeChange('null')}
                                    >
                                        <div className="filter-user-avatar unassigned">
                                            <UserX size={16} />
                                        </div>
                                        <span>Unassigned</span>
                                        {filters.assigneeId === 'null' && <Check size={16} className="filter-check-icon" />}
                                    </div>
                                    {projectMembers?.map(member => (
                                        <div
                                            key={member.user.id}
                                            className={`filter-user-item ${filters.assigneeId === member.user.id ? 'active' : ''}`}
                                            onClick={() => handleAssigneeChange(member.user.id)}
                                        >
                                            <CustomUserAvatar user={member.user} size={28} fontSize="10px" />
                                            <span>{member.user.first_name} {member.user.last_name}</span>
                                            {filters.assigneeId === member.user.id && <Check size={16} className="filter-check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Создатель */}
                    <div className="filter-section">
                        <div className="filter-section-header" onClick={() => toggleSection('creator')}>
                            <span>Created by</span>
                            {expandedSections.creator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.creator && (
                            <div className="filter-section-content">
                                <div className="filter-user-list">
                                    {projectMembers?.map(member => (
                                        <div
                                            key={member.user.id}
                                            className={`filter-user-item ${filters.creatorId === member.user.id ? 'active' : ''}`}
                                            onClick={() => handleCreatorChange(member.user.id)}
                                        >
                                            <CustomUserAvatar user={member.user} size={28} fontSize="10px" />
                                            <span>{member.user.first_name} {member.user.last_name}</span>
                                            {filters.creatorId === member.user.id && <Check size={16} className="filter-check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Теги */}
                    <div className="filter-section">
                        <div className="filter-section-header" onClick={() => toggleSection('tags')}>
                            <span>Tags</span>
                            {expandedSections.tags ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.tags && (
                            <div className="filter-section-content">
                                <div className="filter-tags-selector">
                                    <CustomInputSelector
                                        availableItems={projectTags}
                                        onSelect={handleAddTagFilter}
                                        placeholder="Search tags..."
                                        renderItem={(tag) => (
                                            <div className="filter-tag-item">
                                                <span
                                                    className="filter-tag-color-dot"
                                                    style={{backgroundColor: tag.color || '#8B5CF6'}}
                                                />
                                                <span>{tag.title}</span>
                                            </div>
                                        )}
                                        getItemId={(tag) => tag.id}
                                        getItemName={(tag) => tag.title}
                                    />
                                </div>

                                {/* Отображение выбранных тегов */}
                                <div className="filter-selected-tags">
                                    {projectTags
                                        .filter(tag => filters.tagIds.includes(tag.id))
                                        .map(tag => (
                                            <div
                                                key={tag.id}
                                                className="filter-tag-chip"
                                                style={{
                                                    backgroundColor: `${tag.color}20`,
                                                    borderColor: tag.color,
                                                    color: tag.color
                                                }}
                                            >
                                                <span>{tag.title}</span>
                                                <X
                                                    size={12}
                                                    className="filter-tag-chip-cross"
                                                    onClick={() => handleRemoveTagFilter(tag.id)}
                                                />
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Тип задачи */}
                    <div className="filter-section">
                        <div className="filter-section-header" onClick={() => toggleSection('taskType')}>
                            <span>Task type</span>
                            {expandedSections.taskType ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </div>
                        {expandedSections.taskType && (
                            <div className="filter-section-content">
                                <div className="filter-radio-group">
                                    {TASK_TYPE_OPTIONS.map(option => (
                                        <label key={option.id} className="filter-radio-label">
                                            <input
                                                type="radio"
                                                name="taskType"
                                                checked={filters.taskType === option.id}
                                                onChange={() => handleTaskTypeChange(option.id)}
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Даты */}
                    <div className="filter-section">
                        <div className="filter-section-header" onClick={() => toggleSection('dates')}>
                            <span>Dates</span>
                            {expandedSections.dates ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {expandedSections.dates && (
                            <div className="filter-section-content">
                                <div className="filter-date-group">
                                    <label>Created at</label>
                                    <div className="filter-date-range">
                                        <input
                                            type="date"
                                            value={filters.createdAtRange.from}
                                            onChange={(e) => handleDateRangeChange('createdAtRange', 'from', e.target.value)}
                                            className="filter-date-input"
                                        />
                                        <span>—</span>
                                        <input
                                            type="date"
                                            value={filters.createdAtRange.to}
                                            onChange={(e) => handleDateRangeChange('createdAtRange', 'to', e.target.value)}
                                            className="filter-date-input"
                                        />
                                    </div>
                                </div>
                                <div className="filter-date-group">
                                    <label>Start date</label>
                                    <div className="filter-date-range">
                                        <input
                                            type="date"
                                            value={filters.startDateRange.from}
                                            onChange={(e) => handleDateRangeChange('startDateRange', 'from', e.target.value)}
                                            className="filter-date-input"
                                        />
                                        <span>—</span>
                                        <input
                                            type="date"
                                            value={filters.startDateRange.to}
                                            onChange={(e) => handleDateRangeChange('startDateRange', 'to', e.target.value)}
                                            className="filter-date-input"
                                        />
                                    </div>
                                </div>
                                <div className="filter-date-group">
                                    <label>Due date</label>
                                    <div className="filter-date-range">
                                        <input
                                            type="date"
                                            value={filters.dueDateRange.from}
                                            onChange={(e) => handleDateRangeChange('dueDateRange', 'from', e.target.value)}
                                            className="filter-date-input"
                                        />
                                        <span>—</span>
                                        <input
                                            type="date"
                                            value={filters.dueDateRange.to}
                                            onChange={(e) => handleDateRangeChange('dueDateRange', 'to', e.target.value)}
                                            className="filter-date-input"
                                        />
                                    </div>
                                </div>
                                <div className="filter-date-group">
                                    <label>Closed at</label>
                                    <div className="filter-date-range">
                                        <input
                                            type="date"
                                            value={filters.closedAtRange.from}
                                            onChange={(e) => handleDateRangeChange('closedAtRange', 'from', e.target.value)}
                                            className="filter-date-input"
                                        />
                                        <span>—</span>
                                        <input
                                            type="date"
                                            value={filters.closedAtRange.to}
                                            onChange={(e) => handleDateRangeChange('closedAtRange', 'to', e.target.value)}
                                            className="filter-date-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="filter-modal-footer">
                    <button className="filter-clear-btn" onClick={clearAllFilters}>
                        <RotateCcw size={16} />
                        Clear all
                    </button>
                    <div className="filter-actions">
                        <button className="filter-cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="filter-apply-btn" onClick={handleApply}>
                            Apply filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}