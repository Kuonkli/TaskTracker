import { Link, useParams } from 'react-router-dom';
import {
    Flag,
    MessageSquare,
    CheckSquare,
    UserX,
    Blocks,
    ReplaceAll,
    ArrowUpDown,
    GitBranch,
    GitPullRequestArrow
} from 'lucide-react';
import '../styles/BoardView.css';
import { CustomUserAvatar, PriorityIcon } from "./CommonComponents";

const priorityColors = {
    critical: 'var(--error)',
    high: 'var(--warning)',
    medium: 'var(--info)',
    low: 'var(--text-tertiary)',
};

export default function TaskCard({ task }) {
    const { projectId } = useParams(); // Получаем projectId из URL
    const priorities = [
        { id: 'critical', label: 'Critical', color: 'var(--error)' },
        { id: 'high', label: 'High', color: 'var(--warning)' },
        { id: 'medium', label: 'Medium', color: 'var(--info)' },
        { id: 'low', label: 'Low', color: 'var(--text-tertiary)' }
    ];
    const taskPriority = priorities.find(p => p.id === task.priority);

    // Формируем правильный путь к задаче
    const taskPath = `/project/${projectId || task.project_id}/task/${task.id}`;

    return (
        <div className="task-card" /*style={{ borderColor: priorityColors[task.priority] }}*/>
            <div className="task-content">
                <div className={"task-card-header"}>
                    <div className="task-description">
                        <Link to={taskPath} className="task-card-title">
                            {task.title}
                        </Link>

                        <div className="task-tags">
                            {task.tags && task.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag.id}
                                    className="tag-text"
                                    style={{
                                        backgroundColor: tag?.color + '20',
                                        color: tag?.color,
                                        position: 'relative',
                                        border: '1px solid ' + tag?.color
                                    }}
                                >
                                    {tag?.title}
                                </span>
                            ))}
                            {task.tags?.length > 2 && (
                                <span className="tag-more">+{task.tags.length - 2}</span>
                            )}
                        </div>
                    </div>
                    <div className="task-assignees">
                        {task.assignee && (
                            <CustomUserAvatar user={task.assignee} color={task.assignee.color} size={'3em'}/>
                        )}
                        {!task.assignee && (
                            <div className={"assign-btn"}>
                                <UserX />
                            </div>
                        )}
                    </div>
                </div>

                <div className="task-footer">
                    <div className="meta-item">
                        <PriorityIcon size={16} priorityId={task.priority} priorities={priorities}/>
                        <span style={{ color: taskPriority?.color, opacity: 0.8 }}>{taskPriority?.label?.toUpperCase()}</span>
                    </div>
                    <div className="task-meta">
                        <div className="meta-item">
                            {task.parent_task_id && (
                                <div className="task-card-subtask-flag">
                                    <Blocks size={14}/>
                                    Subtask
                                </div>
                            )}
                        </div>
                        {task.due_date && (
                            <div className={`meta-item ${new Date(task.due_date) < new Date() ? 'overdue' : ''}`}>
                                <Flag size={14}/>
                                <span>{new Date(task.due_date).toLocaleDateString('ru-RU', {day:'numeric', month:'numeric', year:'numeric'})}</span>
                            </div>
                        )}
                        <div className="meta-item">
                            <GitPullRequestArrow size={14}/>
                            <span>{task?.changes?.length || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}