import React, { useState, useEffect } from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {
    Filter,
    ArrowUpDown,
    Download,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    UserX,
    Flag,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide
} from 'lucide-react';
import MiniCalendar from './MiniCalendar';
import FilterModal from './modals/FilterModal';
import '../styles/ListView.css';
import Preloader, { CustomUserAvatar, PriorityIcon } from "./CommonComponents";
import CustomSelector from "./CustomSelector";
import {projectService} from "../services/projectService";

const tasksPerPage = 15;

const sortFields = [
    { id: 'created_at', name: 'Created At' },
    { id: 'priority', name: 'Priority' },
    { id: 'status', name: 'Status' },
    { id: 'start_date', name: 'Start Date' },
    { id: 'due_date', name: 'Due Date' }
];

const parseFiltersFromUrl = (params) => {
    const filters = {};

    const statusIds = params.get('statusIds');
    if (statusIds) filters.statusIds = statusIds.split(',');

    const priorities = params.get('priorities');
    if (priorities) filters.priorities = priorities.split(',');

    const assigneeId = params.get('assigneeId');
    if (assigneeId) filters.assigneeId = assigneeId;

    const creatorId = params.get('creatorId');
    if (creatorId) filters.creatorId = creatorId;

    const tagIds = params.get('tagIds');
    if (tagIds) filters.tagIds = tagIds.split(',');

    const taskType = params.get('taskType');
    if (taskType) filters.taskType = taskType;

    const search = params.get('search');
    if (search) filters.search = search;

    const createdAt = params.get('createdAt');
    if (createdAt) {
        const [from, to] = createdAt.split('/');
        filters.createdAtRange = { from: from || '', to: to || '' };
    }

    const startDate = params.get('startDate');
    if (startDate) {
        const [from, to] = startDate.split('/');
        filters.startDateRange = { from: from || '', to: to || '' };
    }

    const dueDate = params.get('dueDate');
    if (dueDate) {
        const [from, to] = dueDate.split('/');
        filters.dueDateRange = { from: from || '', to: to || '' };
    }

    const closedAt = params.get('closedAt');
    if (closedAt) {
        const [from, to] = closedAt.split('/');
        filters.closedAtRange = { from: from || '', to: to || '' };
    }

    return filters;
};

const filtersToUrlParams = (filters) => {
    const params = new URLSearchParams();

    if (filters.statusIds?.length > 0) params.set('statusIds', filters.statusIds.join(','));
    if (filters.priorities?.length > 0) params.set('priorities', filters.priorities.join(','));
    if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
    if (filters.creatorId) params.set('creatorId', filters.creatorId);
    if (filters.tagIds?.length > 0) params.set('tagIds', filters.tagIds.join(','));
    if (filters.taskType && filters.taskType !== 'all') params.set('taskType', filters.taskType);
    if (filters.search) params.set('search', filters.search);

    if (filters.createdAtRange?.from || filters.createdAtRange?.to) {
        params.set('createdAt', `${filters.createdAtRange.from || ''}/${filters.createdAtRange.to || ''}`);
    }
    if (filters.startDateRange?.from || filters.startDateRange?.to) {
        params.set('startDate', `${filters.startDateRange.from || ''}/${filters.startDateRange.to || ''}`);
    }
    if (filters.dueDateRange?.from || filters.dueDateRange?.to) {
        params.set('dueDate', `${filters.dueDateRange.from || ''}/${filters.dueDateRange.to || ''}`);
    }
    if (filters.closedAtRange?.from || filters.closedAtRange?.to) {
        params.set('closedAt', `${filters.closedAtRange.from || ''}/${filters.closedAtRange.to || ''}`);
    }

    return params;
};

export default function ListView() {
    const { projectId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [totalTasks, setTotalTasks] = useState(0);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Инициализация из URL
    const [activeFilters, setActiveFilters] = useState(() => parseFiltersFromUrl(searchParams));
    const [sortOrder, setSortOrder] = useState(() => searchParams.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC');
    const [selectedSortField, setSelectedSortField] = useState(() => {
        const field = searchParams.get('sortField');
        return sortFields.find(f => f.id === field) || sortFields[0];
    });
    const [currentPage, setCurrentPage] = useState(() => {
        const page = parseInt(searchParams.get('page'));
        return page > 0 ? page : 1;
    });

    const [projectMembers, setProjectMembers] = useState([]);
    const [projectStatuses, setProjectStatuses] = useState([]);
    const [projectTags, setProjectTags] = useState([]);

    const totalPages = Math.ceil(totalTasks / tasksPerPage);

    // Синхронизация URL ← состояние
    useEffect(() => {
        const params = new URLSearchParams();

        if (currentPage > 1) params.set('page', currentPage);
        if (selectedSortField.id !== 'created_at') params.set('sortField', selectedSortField.id);
        if (sortOrder !== 'DESC') params.set('sortOrder', sortOrder);

        // Добавляем фильтры
        const filterParams = filtersToUrlParams(activeFilters);
        filterParams.forEach((value, key) => params.set(key, value));

        setSearchParams(params, { replace: true });
    }, [currentPage, selectedSortField, sortOrder, activeFilters, setSearchParams]);

    // Загрузка данных проекта
    useEffect(() => {
        if (!projectId) return;
        projectService.getProjectDetails(projectId).then(project => {
            setProjectMembers(project.members || []);
            setProjectStatuses(project.statuses || []);
            setProjectTags(project.tags || []);
        }).catch(console.error);
    }, [projectId]);

    // Загрузка задач
    useEffect(() => {
        if (!projectId) return;

        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('len', tasksPerPage);
        params.set('sortField', selectedSortField.id);
        params.set('sortOrder', sortOrder);

        filtersToUrlParams(activeFilters).forEach((value, key) => params.set(key, value));

        projectService.getAllTasks(projectId, params.toString())
            .then(response => {
                setTasks(response?.tasks || []);
                setTotalTasks(response?.total || 0);
            })
            .catch(() => {
                setTasks([]);
                setTotalTasks(0);
            })
            .finally(() => setLoading(false));
    }, [projectId, currentPage, selectedSortField, sortOrder, activeFilters]);

    const handleApplyFilters = (filters) => {
        setActiveFilters(filters);
        setCurrentPage(1);
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (activeFilters.statusIds?.length > 0) count++;
        if (activeFilters.priorities?.length > 0) count++;
        if (activeFilters.assigneeId) count++;
        if (activeFilters.creatorId) count++;
        if (activeFilters.tagIds?.length > 0) count++;
        if (activeFilters.taskType && activeFilters.taskType !== 'all') count++;
        if (activeFilters.search) count++;
        if (activeFilters.createdAtRange?.from || activeFilters.createdAtRange?.to) count++;
        if (activeFilters.startDateRange?.from || activeFilters.startDateRange?.to) count++;
        if (activeFilters.dueDateRange?.from || activeFilters.dueDateRange?.to) count++;
        if (activeFilters.closedAtRange?.from || activeFilters.closedAtRange?.to) count++;
        return count;
    };

    const goToPage = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
            setSelectedTask(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToFirstPage = () => goToPage(1);
    const goToLastPage = () => goToPage(totalPages);
    const goToPreviousPage = () => goToPage(currentPage - 1);
    const goToNextPage = () => goToPage(currentPage + 1);

    const getPageNumbers = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        range.forEach((i) => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });

        return rangeWithDots;
    };

    const isOverdue = (task) => {
        return task.due_date &&
            new Date(task.due_date) < new Date() &&
            (task.status?.status_type !== 'completed' && task.status?.status_type !== 'cancelled');
    };

    const handleTaskClick = (taskId) => {
        setSelectedTask(taskId);
        setSelectedDate(null);
    };

    const handleSortFieldChange = (selectedItem) => {
        setSelectedSortField(selectedItem);
        setCurrentPage(1);
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
        setCurrentPage(1);
    };

    const startTask = (currentPage - 1) * tasksPerPage + 1;
    const endTask = Math.min(currentPage * tasksPerPage, totalTasks);

    return (
        <div className="list-view">
            <div className="list-header">
                <div className="list-controls">
                    <button
                        className={`control-btn ${getActiveFiltersCount() > 0 ? 'active' : ''}`}
                        onClick={() => setIsFilterModalOpen(true)}
                    >
                        <Filter size={16} />
                        <span>Filter</span>
                        {getActiveFiltersCount() > 0 && (
                            <span className="filter-badge">{getActiveFiltersCount()}</span>
                        )}
                    </button>
                    <div className="sort-selector-container">
                        <ArrowUpDown size={16} />
                        <CustomSelector
                            items={sortFields}
                            selectedIndex={sortFields.findIndex(f => f.id === selectedSortField.id)}
                            onSelect={handleSortFieldChange}
                            renderItem={(item) => <span className="sort-selector-item">{item.name}</span>}
                            getItemId={(item) => item.id}
                            getItemName={(item) => item.name}
                            buttonClassName="sort-selector-btn"
                        />
                        <button className="sort-order-btn" onClick={toggleSortOrder}>
                            {sortOrder === "DESC" ? (
                                <ArrowDownWideNarrow size={16} />
                            ) : (
                                <ArrowUpNarrowWide size={16} />
                            )}
                        </button>
                    </div>
                    <button className="control-btn">
                        <Download size={16} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            <div className="list-content">
                <div className="tasks-grid-container">
                    <div className="tasks-grid-header">
                        <div className="task-list-title-col">Title</div>
                        <div className="task-list-status-col">Status</div>
                        <div className="task-list-assignee-col">Assignee</div>
                        <div className="task-list-priority-col">Priority</div>
                        <div className="task-list-date-col">Dates</div>
                    </div>

                    <div className="tasks-list-grid">
                        {loading ? (
                            <div className="app-loading-container" style={{ position: 'relative' }}>
                                <div className={"spinner-container"}>
                                    <Preloader/>
                                </div>
                            </div>
                        ) : tasks.length > 0 ? (
                            tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`task-list-item ${selectedTask === task.id ? 'selected' : ''}`}
                                    onClick={() => handleTaskClick(task.id)}
                                >
                                    <div className="task-list-title-col">
                                        <Link to={`/projects/${projectId}/task/${task.id}`} className="task-link">
                                            {task.title}
                                        </Link>
                                    </div>

                                    <div className="task-list-status-col">
                                        <span
                                            className="task-list-status-badge"
                                            style={{
                                                backgroundColor: task.status?.color ? `${task.status.color}20` : '#f0f0f0',
                                                borderColor: task.status?.color || '#ccc',
                                                color: task.status?.color || '#666'
                                            }}
                                        >
                                            {task.status?.name || 'Unknown'}
                                        </span>
                                    </div>

                                    <div className="task-list-assignee-col">
                                        {task.assignee ? (
                                            <div className="task-list-assignee-info">
                                                <CustomUserAvatar user={task.assignee} color={task.assignee.color} size={'3em'} fontSize={'10px'}/>
                                                <span>{task.assignee.last_name} {task.assignee.first_name}</span>
                                            </div>
                                        ) : (
                                            <div className="task-list-assignee-info">
                                                <UserX size={30} className="task-list-unassigned-icon"/>
                                                <span className="task-list-unassigned">Unassigned</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="task-list-priority-col">
                                        <PriorityIcon priorityId={task.priority} size={18}/>
                                        <span className={`task-list-priority-badge priority-${task.priority}`}>
                                            {task.priority}
                                        </span>
                                    </div>

                                    <div className={`task-list-date-col ${isOverdue(task) ? 'overdue' : ''}`}>
                                        <span>
                                            <CalendarIcon size={12}/>
                                            {task.start_date ? new Date(task.start_date).toLocaleDateString('ru-RU', {
                                                    day: 'numeric',
                                                    month: 'numeric',
                                                    year: 'numeric',
                                                })
                                                : 'Not Set'
                                            }
                                        </span>
                                        <span>
                                            <Flag size={12}/>
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU', {
                                                    day: 'numeric',
                                                    month: 'numeric',
                                                    year: 'numeric',
                                                })
                                                : 'Not Set'
                                            }
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <p>No tasks found</p>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={goToFirstPage}
                                disabled={currentPage === 1 || loading}
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1 || loading}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="pagination-numbers">
                                {getPageNumbers().map((number, index) => (
                                    number === '...' ? (
                                        <span key={`dots-${index}`} className="pagination-dots">...</span>
                                    ) : (
                                        <button
                                            key={number}
                                            className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                                            onClick={() => goToPage(number)}
                                            disabled={loading}
                                        >
                                            {number}
                                        </button>
                                    )
                                ))}
                            </div>

                            <button
                                className="pagination-btn"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages || loading}
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={goToLastPage}
                                disabled={currentPage === totalPages || loading}
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    )}

                    <div className="tasks-info">
                        Showing {tasks.length > 0 ? startTask : 0} to {tasks.length > 0 ? endTask : 0} of {totalTasks} tasks
                    </div>
                </div>

                <div className="calendar-panel">
                    <MiniCalendar
                        tasks={tasks}
                        selectedTask={selectedTask}
                        setSelectedTask={setSelectedTask}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                    />
                </div>
            </div>

            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={handleApplyFilters}
                initialFilters={activeFilters}
                projectMembers={projectMembers}
                projectStatuses={projectStatuses}
                projectTags={projectTags}
            />
        </div>
    );
}