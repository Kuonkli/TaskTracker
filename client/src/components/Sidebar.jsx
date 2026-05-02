import { NavLink, useParams } from 'react-router-dom';
import { LayoutGrid, List, ChartPie, Users, Plus } from 'lucide-react';
import '../styles/Sidebar.css';
import { CustomUserAvatar } from "./CommonComponents";

export default function Sidebar({ user, teamMembers }) {
    const { projectId } = useParams(); // Получаем projectId из URL

    const navigation = [
        { id: 'board', path: `/project/${projectId}/board`, label: 'Board', icon: LayoutGrid },
        { id: 'list', path: `/project/${projectId}/list`, label: 'List', icon: List },
        { id: 'summary', path: `/project/${projectId}/summary`, label: 'Summary', icon: ChartPie },
    ];

    return (
        <aside className="sidebar">
            <nav className="sidebar-nav">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-team">
                <div className="team-header">
                    <Users size={16} />
                    <h3>Team Members</h3>
                </div>
                <div className="team-list">
                    {teamMembers.map((member) => (
                        <NavLink
                            key={member.id}
                            to={user.id === member.user.id ? `/project/${projectId}/profile` : `/project/${projectId}/member/${member.user.id}`}
                            className="team-member"
                        >
                            <CustomUserAvatar
                                user={member.user}
                                color={member.user.color}
                                size={'32px'}
                            />
                            <span className="member-name">
                                {member.user.last_name} {member.user.first_name}
                            </span>
                            {member.permission_level !== 'member' && (
                                <span className={`permission-level permission-${member.permission_level}`}>
                                    {member.permission_level === 'owner' ? 'Owner' : 'Admin'}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </aside>
    );
}