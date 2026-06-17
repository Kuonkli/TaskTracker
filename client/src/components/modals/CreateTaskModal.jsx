import { useState, useEffect } from 'react';
import {
    X,
    Calendar,
    User,
    Tag,
    AlertCircle,
    UserX,
    Flag
} from 'lucide-react';
import '../../styles/CreateTaskModal.css';
import CustomInputSelector from "../CustomInputSelector";
import CustomSelector from "../CustomSelector";
import { CustomUserAvatar, PriorityIcon } from "../CommonComponents";
import AddAttachment from "../AddAttachment";
import { projectService } from '../../services/projectService';

export default function CreateTaskModal({
                                            isOpen,
                                            onClose,
                                            onCreateTask,
                                            projectId,
                                            parentTaskId = null
                                        }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        assignee_id: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        attachments: [],
        tags: []
    });

    const [errors, setErrors] = useState({});
    const [startAssigning, setStartAssigning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Данные из API
    const [users, setUsers] = useState([]);
    const [tags, setTags] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [defaultStatusId, setDefaultStatusId] = useState(null);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const priorities = [
        { id: 'critical', label: 'Critical', color: '#EF4444' },
        { id: 'high', label: 'High', color: '#F59E0B' },
        { id: 'medium', label: 'Medium', color: '#3B82F6' },
        { id: 'low', label: 'Low', color: '#6B7280' }
    ];

    useEffect(() => {
        if (isOpen && projectId) {
            loadProjectData();
        }
    }, [isOpen, projectId]);

    const loadProjectData = async () => {
        setIsDataLoading(true);
        try {
            // Загружаем данные проекта (статусы, теги, участники)
            const projectData = await projectService.getProjectDetails(projectId);

            // Участники проекта
            const members = projectData.members || [];
            setUsers(members);

            // Теги проекта
            const projectTags = projectData.tags || [];
            setTags(projectTags);

            // Статусы проекта
            const projectStatuses = projectData.statuses || [];
            setStatuses(projectStatuses);

            // Находим первый статус с типом 'todo'
            const todoStatus = projectStatuses.find(s => s.status_type === 'todo');
            if (todoStatus) {
                setDefaultStatusId(todoStatus.id);
            }
        } catch (error) {
            console.error('Failed to load project data:', error);
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleAttachmentsChange = (newAttachments) => {
        setFormData(prev => ({
            ...prev,
            attachments: newAttachments
        }));
    };

    const handleTagSelect = (tag) => {
        if (!formData.tags.some(t => t.id === tag.id)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tag]
            }));
            if (errors.tags) {
                setErrors(prev => ({
                    ...prev,
                    tags: null
                }));
            }
        }
    };

    const handleAssigneeSelect = (assignee) => {
        setFormData(prev => ({
            ...prev,
            assignee_id: assignee.user?.id || '',
        }));
        setStartAssigning(false);
    };

    const handleTagRemove = (tagId) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag.id !== tagId)
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validateForm();

        if (Object.keys(newErrors).length === 0) {
            setIsLoading(true);
            const startDate = formData.start_date ? new Date(formData.start_date).toISOString() : null;
            const dueDate = formData.due_date ? new Date(formData.due_date).toISOString() : null;

            try {
                // 1. Создаем задачу (без вложений)
                const taskData = {
                    title: formData.title,
                    description: formData.description,
                    priority: formData.priority,
                    assignee_id: formData.assignee_id || null,
                    status_id: defaultStatusId,
                    start_date: startDate || null,
                    due_date: dueDate || null,
                    parent_task_id: parentTaskId,
                    tag_ids: formData.tags.map(tag => tag.id)
                };

                const newTask = await projectService.createTask(projectId, taskData);

                // 2. Загружаем вложения отдельными запросами
                if (formData.attachments.length > 0) {
                    const uploadPromises = formData.attachments
                        .filter(att => att.file) // Только реальные файлы (не ссылки)
                        .map(async (att) => {
                            try {
                                await projectService.uploadAttachment(
                                    projectId,
                                    newTask.id,
                                    att.file
                                );
                                return { success: true, filename: att.name || att.file.name };
                            } catch (error) {
                                console.error(`Failed to upload ${att.name || att.file.name}:`, error);
                                return { success: false, filename: att.name || att.file.name, error };
                            }
                        });

                    const results = await Promise.allSettled(uploadPromises);

                    // Логируем результаты
                    results.forEach((result, index) => {
                        if (result.status === 'rejected') {
                            console.error(`Upload ${index + 1} failed:`, result.reason);
                        }
                    });
                }

                onCreateTask(newTask);
                resetForm();
                onClose();
            } catch (error) {
                console.error('Failed to create task:', error);
                setErrors({ general: error.message || 'Failed to create task' });
            } finally {
                setIsLoading(false);
            }
        } else {
            setErrors(newErrors);
        }
    };

    const resetForm = () => {
        // Очищаем URL объектов у всех attachments
        formData.attachments.forEach(att => {
            if (att.url) {
                URL.revokeObjectURL(att.url);
            }
        });

        setFormData({
            title: '',
            description: '',
            priority: 'medium',
            assignee_id: '',
            start_date: new Date().toISOString().split('T')[0],
            due_date: '',
            attachments: [],
            tags: []
        });
        setErrors({});
        setStartAssigning(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const renderTag = (tag) => (
        <div className="modal-tag-renderer">
            <span
                className="modal-tag-color-dot"
                style={{ backgroundColor: tag.color || '#8B5CF6' }}
            />
            {tag.title}
        </div>
    );

    const renderPriority = (priority) => (
        <div className="modal-priority-renderer">
            <PriorityIcon priorityId={priority.id} size={20} />
            <span style={{ color: priority.color}}>{priority.label.toUpperCase()}</span>
        </div>
    );

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={handleClose} />
            <div className="create-task-modal">
                <div className="modal-header">
                    <h2>{parentTaskId ? 'Create Subtask' : 'Create New Task'}</h2>
                    <button className="modal-close-btn" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {errors.general && (
                        <div className="modal-error-message general-error">
                            <AlertCircle size={12}/>
                            {errors.general}
                        </div>
                    )}

                    <div className="modal-form-section">
                        <div className="modal-form-group">
                            <label htmlFor="title">
                                Title <span className="modal-required">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Enter task title"
                                className={errors.title ? 'modal-input-error' : 'modal-input'}
                                autoFocus
                            />
                            {errors.title && (
                                <span className="modal-error-message">
                                    <AlertCircle size={12}/>
                                    {errors.title}
                                </span>
                            )}
                        </div>

                        <div className="modal-form-group">
                            <label htmlFor="description">
                                Description <span className="modal-required">*</span>
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Enter task description"
                                rows="10"
                                className={errors.description ? 'modal-input-error' : 'modal-textarea'}
                            />
                            {errors.description && (
                                <span className="modal-error-message">
                                    <AlertCircle size={12}/>
                                    {errors.description}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="modal-form-group">
                        <AddAttachment
                            attachments={formData.attachments}
                            onAttachmentsChange={handleAttachmentsChange}
                        />
                    </div>

                    <div className="modal-form-group">
                        <label htmlFor="priority">Priority</label>
                        <CustomSelector
                            items={priorities}
                            selectedIndex={priorities.findIndex(p => p.id === formData.priority)}
                            onSelect={(priority) => {
                                setFormData(prev => ({
                                    ...prev,
                                    priority: priority.id
                                }));
                            }}
                            renderItem={renderPriority}
                            getItemId={(priority) => priority.id}
                            getItemName={(priority) => priority.label}
                            dropdownClassName={"priority-dropdown"}
                        />
                    </div>

                    <div className="modal-form-group">
                        <label htmlFor="assignee_id">
                            <User size={14}/>
                            Assignee
                        </label>
                        {startAssigning ? (
                            <CustomInputSelector
                                availableItems={users}
                                defaultItem={{ id: 'null', name: 'Unassigned' }}
                                onDefaultSelect={() => {
                                    handleAssigneeSelect({ id: 'null' })
                                }}
                                onSelect={handleAssigneeSelect}
                                renderItem={(member) => {
                                    return (
                                        <div className="modal-assignee">
                                            <CustomUserAvatar user={member.user} color={member.user.color} size={'24px'} fontSize={'10px'}/>
                                            <span className="modal-assignee-name">{member.user.last_name} {member.user.first_name}</span>
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
                                inputClassName={'modal-assignee-selector-input'}
                            />
                        ) : (
                            <div className="modal-selected-assignee-container">
                                <div className="modal-selected-assignee">
                                    {(() => {
                                        const member = users.find(u => u.user.id === formData.assignee_id);
                                        return member ?
                                            <div>
                                                <CustomUserAvatar user={member.user} color={member.user.color} size={'24px'} fontSize={'10px'}/>
                                                {member.user.last_name} {member.user.first_name}
                                            </div> :
                                            <div>
                                                Unassigned
                                            </div>;
                                    })()}
                                </div>
                                <span className="modal-assign-btn" onClick={() => setStartAssigning(true)}>
                                    Assign to...
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="modal-form-group">
                        <label htmlFor="tags">
                            <Tag size={14}/> Tags
                        </label>

                        <CustomInputSelector
                            availableItems={tags.filter(tag =>
                                !formData.tags.some(selectedTag => selectedTag.id === tag.id)
                            )}
                            onSelect={handleTagSelect}
                            placeholder="Search tags..."
                            renderItem={renderTag}
                            getItemId={(tag) => tag.id}
                            getItemName={(tag) => tag.title}
                        />
                        {formData.tags.length > 0 && (
                            <div className="modal-selected-tags">
                                {formData.tags.map(tag => (
                                    <div key={tag.id} className="modal-tag-item"
                                         style={{ position: 'relative', border: '1px solid ' + tag.color }}>
                                        <div
                                            className="modal-tag-background"
                                            style={{
                                                backgroundColor: tag.color,
                                                opacity: 0.3,
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0
                                            }}
                                        />
                                        <span className="modal-tag-text"
                                              style={{ color: tag.color, position: 'relative' }}>
                                            {tag.title}
                                        </span>
                                        <button
                                            className="modal-tag-remove"
                                            onClick={() => handleTagRemove(tag.id)}
                                        >
                                            <X size={12}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-form-row">
                        <div className="modal-form-group">
                            <label htmlFor="start_date">
                                <Calendar size={14}/>
                                Start Date
                            </label>
                            <input
                                type="date"
                                id="start_date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className="modal-date-input"
                            />
                        </div>

                        <div className="modal-form-group">
                            <label htmlFor="due_date">
                                <Flag size={14}/>
                                Due Date
                            </label>
                            <input
                                type="date"
                                id="due_date"
                                name="due_date"
                                value={formData.due_date}
                                onChange={handleChange}
                                min={new Date().toISOString().split('T')[0]}
                                className="modal-date-input"
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="modal-cancel-btn" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="modal-create-btn" disabled={isLoading || isDataLoading}>
                            {isLoading ? 'Creating...' : (parentTaskId ? 'Create Subtask' : 'Create Task')}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}