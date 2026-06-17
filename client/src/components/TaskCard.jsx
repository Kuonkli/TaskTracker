import { Link, useParams } from 'react-router-dom';
import {
    Flag,
    UserX,
    Blocks,
    GitPullRequestArrow, MessageSquare
} from 'lucide-react';
import '../styles/BoardView.css';
import { CustomUserAvatar, PriorityIcon } from "./CommonComponents";

export default function TaskCard({ task }) {
    const { projectId } = useParams(); // Получаем projectId из URL
    const priorities = [
        { id: 'critical', label: 'Critical', color: '#EF4444' },
        { id: 'high', label: 'High', color: '#F59E0B' },
        { id: 'medium', label: 'Medium', color: '#3B82F6' },
        { id: 'low', label: 'Low', color: '#6B7280' }
    ];
    const taskPriority = priorities.find(p => p.id === task.priority);

    // Формируем правильный путь к задаче
    const taskPath = `/projects/${projectId || task.project_id}/task/${task.id}`;

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
                    <div className={`meta-item priority`} style={{ backgroundColor: `${taskPriority?.color}30` }}>
                        <PriorityIcon priorityId={task.priority} priorities={priorities}/>
                        <span style={{ color: taskPriority?.color }}>{taskPriority?.label?.toUpperCase()}</span>
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
                                <span>{new Date(task.due_date).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'numeric',
                                    year: 'numeric'
                                })}</span>
                            </div>
                        )}
                        {!task.parent_task_id && (
                            <div className="meta-item">
                                <Blocks size={14}/>
                                <span>{task?.metrics.subtasks_count || 0}</span>
                            </div>
                        )}
                        <div className="meta-item">
                            <MessageSquare size={14}/>
                            <span>{task?.metrics.comments_count || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}