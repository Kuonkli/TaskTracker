import React from 'react';
import { NavLink } from 'react-router-dom';
import DashboardIcon from "../../assets/images/icons8-dashboard-layout-96.png";
import TasksIcon from "../../assets/images/icons8-done-64.png";
import ProjectsIcon from "../../assets/images/icons8-folder-96.png";
import UserIcon from "../../assets/images/icons8-user-male-96.png";

const Sidebar = () => {
    const menuItems = [
        { path: '/', label: 'Dashboard', icon: DashboardIcon },
        { path: '/tasks', label: 'Tasks', icon: TasksIcon },
        { path: '/projects', label: 'Projects', icon: ProjectsIcon },
        { path: '/profile', label: 'Profile', icon: UserIcon },
    ];

    return (
        <aside className="sidebar">
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        <img className="sidebar-icon" alt={'sidebar-icon'} src={item.icon} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;