import { X, Zap, MessageSquare, CheckCircle, UserPlus } from 'lucide-react';
import { useState } from 'react';
import '../styles/RightSidebar.css';

export default function RightSidebar({ events, isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('all');

    const getEventIcon = (type) => {
        switch (type) {
            case 'comment': return <MessageSquare size={16} />;
            case 'status': return <CheckCircle size={16} />;
            case 'assign': return <UserPlus size={16} />;
            default: return <Zap size={16} />;
        }
    };

    return (
        <>
            <div
                className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />
            <aside className={`right-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Activity Feed</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-tabs">
                    <button
                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All
                    </button>
                    <button
                        className={`tab ${activeTab === 'mentions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mentions')}
                    >
                        Mentions
                    </button>
                    <button
                        className={`tab ${activeTab === 'system' ? 'active' : ''}`}
                        onClick={() => setActiveTab('system')}
                    >
                        System
                    </button>
                </div>

                <div className="activity-feed">
                    <div className="activity-group">
                        <h3 className="group-title">Today</h3>
                        {events.slice(0, 3).map((event) => (
                            <div key={event.id} className="activity-item">
                                <div
                                    className="activity-avatar"
                                    style={{ background: `linear-gradient(135deg, ${event.user.color.from}, ${event.user.color.to})` }}
                                >
                                    {event.user.initials}
                                </div>
                                <div className="activity-content">
                                    <p>
                                        <span className="user-name">{event.user.name}</span>
                                        {' '}{event.action}{' '}
                                        <span className="task-name">{event.task}</span>
                                    </p>
                                    <div className="activity-meta">
                    <span className="event-icon">
                      {getEventIcon(event.type)}
                    </span>
                                        <span className="event-time">{event.time}</span>
                                    </div>
                                    {event.comment && (
                                        <div className="comment-preview">
                                            "{event.comment}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="activity-group">
                        <h3 className="group-title">Earlier</h3>
                        {events.slice(3).map((event) => (
                            <div key={event.id} className="activity-item">
                                <div
                                    className="activity-avatar"
                                    style={{ background: `linear-gradient(135deg, ${event.user.color.from}, ${event.user.color.to})` }}
                                >
                                    {event.user.initials}
                                </div>
                                <div className="activity-content">
                                    <p>
                                        <span className="user-name">{event.user.name}</span>
                                        {' '}{event.action}{' '}
                                        <span className="task-name">{event.task}</span>
                                    </p>
                                    <div className="activity-meta">
                    <span className="event-icon">
                      {getEventIcon(event.type)}
                    </span>
                                        <span className="event-time">{event.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="load-more">
                        Load more activity
                    </button>
                </div>
            </aside>
        </>
    );
}