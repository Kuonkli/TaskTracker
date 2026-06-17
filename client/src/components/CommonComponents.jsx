import React from 'react';
import commonStyles from '../styles/CommonComponents.module.css'
import attachmentStyles from "../styles/TaskAttachments.module.css";
import {
    AlertCircle,
    Crown, ExternalLink,
    File,
    FileArchive,
    FileCode,
    FileImage,
    FileJson,
    FileSpreadsheet,
    FileText, LayoutGrid,
    Shield, UserMinus,
    UserPlus
} from "lucide-react";
import styles from "../styles/ProjectSettingsPage.module.css";
import CustomSelector from "./CustomSelector";
import {Link} from "react-router-dom";

export const PriorityIcon = ({ priorityId, size = 16 }) => {
    const priorities = [
        { id: 'critical', label: 'Critical', color: 'var(--error)' },
        { id: 'high', label: 'High', color: 'var(--warning)' },
        { id: 'medium', label: 'Medium', color: 'var(--info)' },
        { id: 'low', label: 'Low', color: 'var(--text-tertiary)' }
    ];
    const priorityData = priorities.find(p => p.id === priorityId) || priorities[2];

    const priorityConfig = {
        critical: {
            lines: [
                [0, 8, 14, 2], [28, 8, 14, 2],
                [0, 14, 14, 8], [28, 14, 14, 8],
                [0, 20, 14, 14], [28, 20, 14, 14],
                [0, 26, 14, 20], [28, 26, 14, 20]
            ]
        },
        high: {
            lines: [
                [0, 10, 14, 4], [28, 10, 14, 4],
                [0, 18, 14, 12], [28, 18, 14, 12],
                [0, 26, 14, 20], [28, 26, 14, 20]
            ]
        },
        medium: {
            lines: [
                [0, 14, 14, 8], [28, 14, 14, 8],
                [0, 22, 14, 16], [28, 22, 14, 16]
            ]
        },
        low: {
            lines: [
                [0, 18, 14, 12], [28, 18, 14, 12]
            ]
        }
    };

    const config = priorityConfig[priorityId] || priorityConfig.medium;

    return (
        <svg width={size / 1.5} height={size} viewBox="0 0 28 28">
            {config.lines.map(([x1, y1, x2, y2], index) => (
                <line
                    key={index}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={priorityData.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            ))}
        </svg>
    );
};

export const CustomUserAvatar = ({ user, size='32px', color='#8B5CF6', fontSize='12px' }) => {
    const getInitials = (user) => {
        return user?.last_name[0].toUpperCase() + user?.first_name[0].toUpperCase();
    }
    return (
        <div className={commonStyles.customUserAvatar} style={{ width: size, height: size, backgroundColor: color, fontSize: fontSize }}>
            {getInitials(user)}
        </div>
    )
}

export const getFileIcon = (fileType, fileName = '') => {
    const iconProps = { size: 20, className: attachmentStyles.iconSvg };

    const lowerFileType = fileType.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    // Изображения
    if (lowerFileType.startsWith('image/')) {
        return <FileImage {...iconProps} />;
    }

    // Excel файлы
    if (lowerFileType.includes('spreadsheet') ||
        lowerFileType.includes('excel') ||
        lowerFileType.includes('sheet') ||
        lowerFileType.includes('csv') ||
        lowerFileName.endsWith('.xlsx') ||
        lowerFileName.endsWith('.xls') ||
        lowerFileName.endsWith('.csv') ||
        lowerFileName.endsWith('.xlsm') ||
        lowerFileName.endsWith('.xlsb')) {
        return <FileSpreadsheet {...iconProps} />;
    }

    // Word документы
    if (lowerFileType.includes('word') ||
        lowerFileType.includes('document') ||
        lowerFileType.includes('txt') ||
        lowerFileName.endsWith('.docx') ||
        lowerFileName.endsWith('.doc') ||
        lowerFileName.endsWith('.txt')) {
        return <FileText {...iconProps} />;
    }

    // PDF
    if (lowerFileType.includes('pdf') || lowerFileName.endsWith('.pdf')) {
        return <FileText {...iconProps} />;
    }

    // Архивы
    if (lowerFileType.includes('zip') ||
        lowerFileType.includes('rar') ||
        lowerFileType.includes('tar') ||
        lowerFileType.includes('gz') ||
        lowerFileType.includes('7z') ||
        lowerFileName.endsWith('.zip') ||
        lowerFileName.endsWith('.rar') ||
        lowerFileName.endsWith('.7z')) {
        return <FileArchive {...iconProps} />;
    }

    // JSON
    if (lowerFileType.includes('json') || lowerFileName.endsWith('.json')) {
        return <FileJson {...iconProps} />;
    }

    // Код
    if (lowerFileType.includes('javascript') ||
        lowerFileType.includes('typescript') ||
        lowerFileType.includes('html') ||
        lowerFileType.includes('css') ||
        lowerFileType.includes('python') ||
        lowerFileType.includes('java') ||
        lowerFileName.endsWith('.js') ||
        lowerFileName.endsWith('.ts') ||
        lowerFileName.endsWith('.jsx') ||
        lowerFileName.endsWith('.tsx') ||
        lowerFileName.endsWith('.py') ||
        lowerFileName.endsWith('.java') ||
        lowerFileName.endsWith('.html') ||
        lowerFileName.endsWith('.css')) {
        return <FileCode {...iconProps} />;
    }

    // Текстовые файлы
    if (lowerFileType.startsWith('text/') ||
        lowerFileName.endsWith('.txt') ||
        lowerFileName.endsWith('.md')) {
        return <FileText {...iconProps} />;
    }

    // По умолчанию
    return <File {...iconProps} />;
};

export const MemberPermissionsContent = ({ member }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Are you sure you want to promote <strong>Member</strong> permissions to user?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <CustomUserAvatar
                        user={member?.user}
                        color={member?.user.color}
                        size={32}
                    />
                    <strong>
                        {member?.user.last_name} {member?.user.first_name}
                    </strong>
                </div>
                <span className={commonStyles.roleBadge}>Member</span>
            </div>
            <p className={commonStyles.warningText}>This user will lose access to project configuration and user management.</p>
        </div>
    );
}

export const AdminPermissionsContent = ({ member }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Are you sure you want to promote <strong>Admin</strong> permissions to user?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <CustomUserAvatar
                        user={member?.user}
                        color={member?.user.color}
                        size={32}
                    />
                    <strong>
                        {member?.user.last_name} {member?.user.first_name}
                    </strong>
                </div>
                <span className={`${commonStyles.roleBadge} ${commonStyles.adminBadge}`}><Shield size={16}/> Admin</span>
            </div>
            <p className={commonStyles.warningText}>This user will get access to project configuration and user management.</p>
        </div>
    );
}

export const TransferOwnershipContent = ({ member }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Are you sure you want to transfer project ownership to this user?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <CustomUserAvatar user={member?.user} color={member?.user?.color} size={40} fontSize={14}/>
                    <strong>{member?.user?.last_name} {member?.user?.first_name}</strong>
                </div>
                <span className={`${commonStyles.roleBadge} ${commonStyles.ownerBadge}`}>
                    <Crown size={16}/> Owner
                </span>
            </div>
            <p className={commonStyles.dangerText}>
                You will lose owner privileges and become a regular member. This action cannot be undone.
            </p>
        </div>
    );
};

export const InviteMemberContent = ({ member, inviteRole, invitePermission, onRoleChange, onPermissionChange }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Are you sure you want to <strong>Invite</strong> user to project?</p>
            <div className={commonStyles.inviteUserCard}>
                <CustomUserAvatar user={member} color={member?.color} size={44} fontSize={16}/>
                <div className={commonStyles.inviteUserInfo}>
                    <strong>{member?.last_name} {member?.first_name}</strong>
                    <span className={commonStyles.memberNickname}>@{member?.nickname}</span>
                </div>
                <UserPlus size={20}/>
            </div>

            <div className={commonStyles.inviteFieldGroup}>
                <label className={commonStyles.inviteLabel}>Role in Team</label>
                <input
                    type="text"
                    className={commonStyles.inviteInput}
                    placeholder="e.g., Frontend Developer"
                    value={inviteRole}
                    onChange={(e) => onRoleChange(e.target.value)}
                />
            </div>

            <div className={commonStyles.inviteFieldGroup}>
                <label className={commonStyles.inviteLabel}>Permission Level</label>
                <CustomSelector
                    items={[
                        { value: 'member', label: 'Member' },
                        { value: 'admin', label: 'Admin' }
                    ]}
                    selectedIndex={invitePermission === 'member' ? 0 : 1}
                    onSelect={(item) => onPermissionChange(item.value)}
                    renderItem={(item) => (
                        <div className={commonStyles.permissionOption}>
                            <span>{item.label}</span>
                        </div>
                    )}
                    getItemId={(item) => item.value}
                    getItemName={(item) => item.label}
                    placeholder="Select permission..."
                    buttonClassName={commonStyles.inviteSelect}
                />
            </div>
        </div>
    );
};

export const RemoveMemberContent = ({ member }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Are you sure you want to remove user from the project?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <CustomUserAvatar
                        user={member?.user}
                        color={member?.user.color}
                        size={32}
                    />
                    <strong>
                        {member?.user.last_name} {member?.user.first_name}
                    </strong>
                </div>
                <UserMinus size={20} />
            </div>
            <p className={commonStyles.dangerText}>This user
                will lose access to all
                project tasks and data.</p>
        </div>
    );
}

export const DeleteStatusContent = ({ status, projectId, tasksCount }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Are you sure you want to delete this status?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <div
                        className={commonStyles.statusColorDot}
                        style={{ backgroundColor: status?.color }}
                    />
                    <div>
                        <strong>{status?.name}</strong>
                        <span className={commonStyles.statusTypeLabel}>
                            {status?.status_type}
                        </span>
                    </div>
                </div>
            </div>

            {tasksCount > 0 ? (
                <div className={commonStyles.warningBox}>
                    <AlertCircle size={18} className={commonStyles.warningBoxIcon}/>
                    <div>
                        <p className={commonStyles.warningText}>
                            <strong>{tasksCount} tasks</strong> are currently using this status.
                            You need to move them to another status before deleting.
                        </p>
                        <Link
                            to={`/projects/${projectId}/list?statusIds=${status?.id}`}
                            className={commonStyles.viewTasksLink}
                        >
                            <ExternalLink size={14}/>
                            View tasks with this status
                        </Link>
                    </div>
                </div>
            ) : (
                <p className={commonStyles.dangerText}>
                    This action cannot be undone.
                </p>
            )}
        </div>
    );
};

export const DeleteColumnContent = ({ status }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Remove column from board?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <div
                        className={commonStyles.statusColorDot}
                        style={{ backgroundColor: status?.color }}
                    />
                    <strong>{status?.name}</strong>
                </div>
                <span className={commonStyles.columnBadge}>Column</span>
            </div>
            <p className={commonStyles.warningText}>
                The status will still be available for tasks, but the column will be hidden from the board.
            </p>
        </div>
    );
};

export const DeleteLaneContent = ({ lane }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Are you sure you want to delete this lane?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <div
                        className={commonStyles.statusColorDot}
                        style={{ backgroundColor: lane?.color }}
                    />
                    <div>
                        <strong>{lane?.title}</strong>
                        {lane?.description && (
                            <span className={commonStyles.laneDescription}>{lane?.description}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className={commonStyles.laneRulePreview}>
                <code>{lane?.ruleString}</code>
            </div>
            <p className={commonStyles.dangerText}>
                This action cannot be undone. All tasks will be unassigned from this lane.
            </p>
        </div>
    );
};

export const AddColumnContent = ({ status }) => {
    return (
        <div className={commonStyles.memberModalBody}>
            <p>Add this status as a column on the board?</p>
            <div className={commonStyles.removeMemberContainer}>
                <div className={commonStyles.memberToRemove}>
                    <div
                        className={commonStyles.statusColorDot}
                        style={{ backgroundColor: status?.color }}
                    />
                    <div>
                        <strong>{status?.name}</strong>
                        <span className={commonStyles.statusTypeLabel}>
                            {status?.status_type}
                        </span>
                    </div>
                </div>
                <span className={commonStyles.columnBadge}>
                    <LayoutGrid size={14}/> Column
                </span>
            </div>
            <p className={commonStyles.infoText}>
                The column will appear on the board in the last position. You can reorder it later.
            </p>
        </div>
    );
};


const Preloader = ({ size = '32px', color = '#8B5CF6' }) => {
    return (
        <div className={commonStyles.preloader} style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 50 50"
                xmlns="http://www.w3.org/2000/svg"
                className={commonStyles.spinner}
            >
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeDasharray="125"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
};

export default Preloader;
