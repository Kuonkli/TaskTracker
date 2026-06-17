import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Settings, ChevronDown } from 'lucide-react';
import '../styles/BoardView.css';
import CreateTaskModal from "./modals/CreateTaskModal";
import { mockTags, mockUsers } from "../mocks";
import TaskCard from "./TaskCard";
import { projectService } from '../services/projectService';
import Preloader from "./CommonComponents";

export default function BoardView() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [draggedTask, setDraggedTask] = useState(null);
    const [draggedTaskLaneId, setDraggedTaskLaneId] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [tags, setTags] = useState(mockTags);
    const [users, setUsers] = useState(mockUsers);
    const [lanes, setLanes] = useState([]);
    const [columns, setColumns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (projectId) {
            setIsLoading(true);
            loadBoardData();
        }
    }, [projectId]);

    const loadBoardData = async () => {
        setError(null);
        try {
            const response = await projectService.getBoard(projectId);

            // Трансформируем колонки
            const transformedColumns = response.columns.map(col => ({
                id: col.id,
                status: {
                    id: col.status.id,
                    name: col.status.name,
                    color: col.status.color,
                    status_type: col.status.status_type
                }
            }));

            // Трансформируем линии (lanes) и задачи
            const transformedLanes = response.lanes.map(lane => ({
                id: lane.id,
                title: lane.title,
                color: lane.color,
                position: lane.position,
                rule_condition: lane.rule_condition,
                tasks: (lane.tasks || []).map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    status_id: task.status_id,
                    status: task.status ? {
                        id: task.status.id,
                        name: task.status.name,
                        color: task.status.color,
                        status_type: task.status.status_type
                    } : null,
                    assignee: task.assignee || null,
                    creator: task.creator,
                    due_date: task.due_date,
                    start_date: task.start_date,
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                    tags: task.tags,
                    parent_task_id: task.parent_task_id,
                    metrics: task.metrics,
                }))
            }));

            setColumns(transformedColumns);
            setLanes(transformedLanes);
        } catch (err) {
            console.error('Failed to load board:', err);
            setError(err.message || 'Failed to load board data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragStart = (taskId, laneId) => {
        setDraggedTask(taskId);
        setDraggedTaskLaneId(laneId);
    };

    const handleDragOver = (e, columnLaneId) => {
        e.preventDefault();
        if (columnLaneId !== draggedTaskLaneId) {
            e.dataTransfer.dropEffect = 'none';
            e.dataTransfer.effectAllowed = 'none';
        } else {
            e.dataTransfer.dropEffect = 'move';
            e.dataTransfer.effectAllowed = 'move';
        }
    };

    const handleDrop = async (e, targetStatusId, targetLaneId) => {
        e.preventDefault();

        if (!draggedTask || draggedTaskLaneId !== targetLaneId || isUpdating) {
            setDraggedTask(null);
            setDraggedTaskLaneId(null);
            return;
        }

        setIsUpdating(true);

        try {
            // Находим задачу для оптимистичного обновления
            let movedTask = null;
            let sourceLane = lanes.find(l => l.id === draggedTaskLaneId);
            if (sourceLane) {
                movedTask = sourceLane.tasks.find(t => t.id === draggedTask);
            }

            if (movedTask) {
                // Оптимистичное обновление UI
                const targetStatus = columns.find(col => col.status.id === targetStatusId)?.status;

                setLanes(prevLanes =>
                    prevLanes.map(lane => ({
                        ...lane,
                        tasks: lane.tasks.map(task => {
                            if (task.id === draggedTask) {
                                return {
                                    ...task,
                                    status_id: targetStatusId,
                                    status: targetStatus || task.status
                                };
                            }
                            return task;
                        })
                    }))
                );
            }

            // Отправляем запрос на сервер
            await projectService.updateTaskStatus(projectId, draggedTask, targetStatusId);

        } catch (error) {
            console.error('Failed to update task status:', error);
            await loadBoardData();
        } finally {
            setDraggedTask(null);
            setDraggedTaskLaneId(null);
            setIsUpdating(false);
        }
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
        setDraggedTaskLaneId(null);
    };

    const handleCreateTask = () => {
        loadBoardData();
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

    if (error) {
        return (
            <div className="error-container">
                <p className="error-message">{error}</p>
                <button className="retry-btn" onClick={loadBoardData}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="board-view">
                <div className="board-header">
                    <div className="board-controls">
                        <button
                            className="control-btn"
                            onClick={() => navigate(`/projects/${projectId}/settings`)}
                        >
                            <Settings size={18}/>
                            <span>Project settings</span>
                        </button>
                        <button
                            className="create-btn"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus size={18}/>
                            <span>Create task</span>
                        </button>
                    </div>
                </div>

                <div className="board-content">
                    {lanes.map((lane) => {
                        const laneTasks = lane.tasks || [];
                        const isActiveLane = draggedTaskLaneId === lane.id;

                        return (
                            <div
                                key={lane.id}
                                className={`priority-lane ${isActiveLane ? 'active-lane' : ''} ${
                                    draggedTask && !isActiveLane ? 'disabled-lane' : ''
                                }`}
                            >
                                <div
                                    className="lane-header"
                                    style={{borderLeftColor: lane.color}}
                                >
                                    <h3>{lane.title}</h3>
                                    <span className="task-count">
                                        {laneTasks.length}
                                    </span>
                                    <button className="collapse-lane">
                                        <ChevronDown size={16} />
                                    </button>
                                </div>

                                <div className="lane-columns">
                                    {columns.map((column) => {
                                        const columnTasks = laneTasks.filter(
                                            t => t.status?.id === column.status.id
                                        );

                                        return (
                                            <div
                                                key={column.id}
                                                className={`board-column 
                                                    ${isActiveLane ? 'active-lane-column' : ''} 
                                                    ${draggedTask && !isActiveLane ? 'disabled-column' : ''}
                                                `}
                                                onDragOver={(e) => handleDragOver(e, lane.id)}
                                                onDrop={(e) => handleDrop(e, column.status.id, lane.id)}
                                            >
                                                <div className="column-header">
                                                    <div
                                                        className="status-indicator"
                                                        style={{backgroundColor: column.status.color}}
                                                    />
                                                    <h4>{column.status.name}</h4>
                                                    <span className="task-count">
                                                        {columnTasks.length}
                                                    </span>
                                                </div>

                                                <div className="column-content">
                                                    {columnTasks.length === 0 ? (
                                                        <div className="empty-state">
                                                            <p>No tasks</p>
                                                        </div>
                                                    ) : (
                                                        columnTasks.map((task) => (
                                                            <div
                                                                key={task.id}
                                                                draggable
                                                                onDragStart={() => handleDragStart(task.id, lane.id)}
                                                                onDragEnd={handleDragEnd}
                                                                className="draggable-task"
                                                            >
                                                                <TaskCard task={task} />
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreateTask={handleCreateTask}
                projectId={projectId}
            />
        </>
    );
}