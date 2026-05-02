import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Flag, X } from 'lucide-react';
import '../styles/ListView.css';
import {useNavigate} from "react-router-dom";

export default function MiniCalendar({ tasks, selectedTask, setSelectedTask, selectedDate, setSelectedDate }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const navigate = useNavigate();

    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();

    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    };

    const selectedTaskData = tasks.find(t => t.id === selectedTask);

    const calculateTimelineProgress = () => {
        let startDate = selectedTaskData?.start_date;
        let dueDate = selectedTaskData?.due_date;

        if (!startDate || !dueDate) return 0;

        const start = new Date(startDate);
        const due = new Date(dueDate);
        const today = new Date();

        start.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (today < start) return 0;
        if (today > due) return 100;

        const totalDuration = Math.ceil((due - start) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
        const progress = (daysPassed / totalDuration) * 100;

        return Math.min(100, Math.max(0, Math.round(progress)));
    };

    // Функция для сравнения дат (только год, месяц, день)
    const isSameDay = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);

        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const isOverdue = (task) => {
        return task.due_date &&
            new Date(task.due_date) < new Date() &&
            task.status.status_type !== 'completed' && task.status.status_type !== 'cancelled'
    };

    // Получение событий для выбранной даты
    const getEventsForSelectedDate = () => {
        if (!selectedDate) return { starts: [], dues: [] };

        const starts = tasks.filter(t =>
            t.start_date && isSameDay(t.start_date, selectedDate)
        );

        const dues = tasks.filter(t =>
            t.due_date && isSameDay(t.due_date, selectedDate)
        );

        return { starts, dues };
    };

    // Форматирование даты для отображения
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleDayClick = (day) => {
        const clickedDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
        );
        // Сбрасываем выбранную задачу и устанавливаем выбранную дату
        setSelectedTask(null);
        setSelectedDate(clickedDate);
    };

    const { starts, dues } = getEventsForSelectedDate();

    return (
        <div className="mini-calendar">
            <div className="calendar-header">
                <h3>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <div className="calendar-nav">
                    <button onClick={prevMonth}>
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={nextMonth}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="calendar-weekdays">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                    <div key={day} className="weekday">{day}</div>
                ))}
            </div>

            <div className="calendar-grid">
                {[...Array(firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1)].map((_, i) => (
                    <div key={`empty-${i}`} className="calendar-day empty" />
                ))}

                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const currentDayDate = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        day
                    );

                    const isSelected = selectedDate && isSameDay(selectedDate, currentDayDate);

                    return (
                        <div
                            key={day}
                            className={`calendar-day ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleDayClick(day)}
                        >
                            <span className="day-number">{day}</span>

                            {/* Task bars for selected task */}
                            {selectedTaskData && selectedTaskData.start_date && selectedTaskData.due_date && (
                                (() => {
                                    const start = new Date(selectedTaskData.start_date);
                                    const due = new Date(selectedTaskData.due_date);

                                    start.setHours(0, 0, 0, 0);
                                    due.setHours(0, 0, 0, 0);
                                    const current = new Date(currentDayDate);
                                    current.setHours(0, 0, 0, 0);

                                    if (current >= start && current <= due) {
                                        return (
                                            <div
                                                className="task-bar"
                                                style={{
                                                    backgroundColor: isOverdue(selectedTaskData)
                                                        ? 'var(--error)'
                                                        : 'var(--accent-primary)',
                                                    opacity: 0.3
                                                }}
                                            />
                                        );
                                    }
                                    return null;
                                })()
                            )}

                            {/* Task dots for tasks due or starting on this day */}
                            {(() => {
                                const dayEvents = tasks.filter(t =>
                                    (t.due_date && isSameDay(t.due_date, currentDayDate)) ||
                                    (t.start_date && isSameDay(t.start_date, currentDayDate))
                                );

                                if (dayEvents.length === 0) return null;

                                return (
                                    <div className="task-dot-container">
                                        {dayEvents.slice(0, 2).map(t => (
                                            <div
                                                key={t.id}
                                                className="task-dot"
                                                style={{
                                                    backgroundColor: isOverdue(t)
                                                        ? 'var(--error)'
                                                        : 'var(--accent-primary)'
                                                }}
                                                title={`${t.title} - ${t.due_date && isSameDay(t.due_date, currentDayDate) ? 'Due' : 'Start'}`}
                                            />
                                        ))}
                                        {dayEvents.length > 2 && (
                                            <span className="task-dot-plus">
                                                +{dayEvents.length - 2}
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>

            {selectedTaskData && (
                <div className="selected-task-info">
                    <div className={"timeline-bar-header"}>
                        <h4>Task Timeline</h4>
                        <X size={16} className={"calendar-sections-cross"} onClick={() => setSelectedTask(null)}/>
                    </div>

                    <div className="timeline-info">
                        <div className="timeline-dates">
                            <span>Start: {selectedTaskData.start_date ?
                                new Date(selectedTaskData.start_date).toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                }) : 'Not set'}
                            </span>
                            <span>Due: {selectedTaskData.due_date ?
                                new Date(selectedTaskData.due_date).toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                }) : 'Not set'}
                            </span>
                        </div>
                        <div className="timeline-bar">
                            <div
                                className="timeline-progress"
                                style={{
                                    width: `${calculateTimelineProgress()}%`,
                                    backgroundColor: isOverdue(selectedTaskData)
                                        ? 'var(--error)'
                                        : 'var(--accent-primary)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {selectedDate && (
                <div className="date-events">
                    <div className="date-events-header">
                        <div className="date-events-header-title">
                            <h4>Date Events</h4>
                            <div className="header-selected-date">
                                ({formatDate(selectedDate)})
                            </div>
                        </div>
                        <X size={16} className={"calendar-sections-cross"} onClick={() => setSelectedDate(null)}/>
                    </div>

                    <div className="date-events-content">
                        {starts.length === 0 && dues.length === 0 ? (
                            <div className="no-events">
                                No events for this day
                            </div>
                        ) : (
                            <>
                                {starts.length > 0 && (
                                    <div className="event-section">
                                        <div className="event-section-title">Start work on:</div>
                                        {starts.map(task => (
                                            <div key={task.id} className="event-item">
                                                <Calendar size={16} className={`event-bullet ${isOverdue(task) ? 'overdue' : ''}`}/>
                                                <span className="event-title" onClick={() => navigate(`/project/${task.project_id}/task/${task.id}`)}>{task.title}</span>
                                                {isOverdue(task) && (
                                                    <span className="event-priority overdue">Overdue</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {dues.length > 0 && (
                                    <div className="event-section">
                                        <div className="event-section-title">Due:</div>
                                        {dues.map(task => (
                                            <div key={task.id} className="event-item">
                                                <Flag size={16} className={`event-bullet ${isOverdue(task) ? 'overdue' : ''}`}/>
                                                <span className="event-title" onClick={() => navigate(`/project/${task.project_id}/task/${task.id}`)}>{task.title}</span>
                                                {isOverdue(task) && (
                                                    <span className="event-priority overdue">Overdue</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}