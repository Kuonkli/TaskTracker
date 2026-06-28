import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {Search, Bell, Zap, Settings, FolderPlus} from 'lucide-react';
import '../styles/Header.css';
import { CustomUserAvatar } from "./CommonComponents";
import CustomSelector from './CustomSelector';
import {mockProject as item} from "../mocks";

export default function Header({ project, user, onActivityToggle, projects = [] }) {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Формируем элементы для выпадающего списка
    const getDropdownItems = () => {
        const items = [];

        // Специальные действия
        items.push({
            id: 'new-project',
            name: 'New Project...',
            type: 'action',
            action: () => navigate('/projects/new')
        });

        items.push({
            id: 'settings',
            name: 'Settings...',
            type: 'action',
            action: () => navigate(`/projects/${project.id}/settings`),
        });

        items.push({
            id: project.id,
            name: project.name,
            type: 'project',
            action: () => navigate(`/projects/${project.id}/board`)
        })

        // Проекты пользователя
        projects.forEach(proj => {
            if (proj.id !== project.id) {
                items.push({
                    id: proj.id,
                    name: proj.name,
                    type: 'project',
                    action: () => navigate(`/projects/${proj.id}/board`)
                });
            }
        });

        return items;
    };

    const dropdownItems = getDropdownItems();

    // Находим индекс текущего проекта в списке
    const getSelectedIndex = () => {
        const projectIndex = dropdownItems.findIndex(item => item.id === projectId);
        return projectIndex !== -1 ? projectIndex : 0;
    };

    const handleProjectSelect = (item) => {
        if (item.action) {
            item.action();
        }
    };

    // Функция рендера элемента для CustomSelector
    const renderProjectItem = (item) => {
        if (item.type === 'action') {
            return (
                <div className={`selector-action-item ${item.id}`}>
                    {item.id === 'settings' ? <Settings size={16}/> : <FolderPlus size={16}/>}
                    {item.name}
                </div>
            );
        }
        return <span className={`selector-project-item`}>{item.name}</span>;
    };

    return (
        <header className="header">
            <div className="header-left">
                <Link to="/" className="logo">
                    <div className="logo-icon">T</div>
                    <span className="logo-text">TaskTracker</span>
                </Link>

                {/* Кастомный селектор для проекта */}
                <div className="project-selector-wrapper">
                    <span className="project-name">/</span>
                    <CustomSelector
                        items={dropdownItems}
                        selectedIndex={getSelectedIndex()}
                        onSelect={handleProjectSelect}
                        renderItem={renderProjectItem}
                        getItemId={(item) => item.id}
                        getItemName={(item) => item.name}
                        buttonClassName="project-selector-button"
                        dropdownClassName="project-selector-dropdown"
                    />
                </div>
            </div>

            <div className="header-right">
                <button className="icon-button" onClick={onActivityToggle}>
                    <Zap size={20} />
                </button>
                <button className="icon-button">
                    <Bell size={20} />
                    <span className="notification-badge"></span>
                </button>
                <Link to={`/projects/${projectId}/profile`} className="user-profile-avatar">
                    <CustomUserAvatar user={user} color={user?.color} size={'100%'} fontSize={'14px'} />
                </Link>
            </div>
        </header>
    );
}