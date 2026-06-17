// components/TaskAttachments.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, File, FileImage, FileText, FileSpreadsheet,
    FileArchive, FileCode, FileJson, Eye, Trash2,
    Paperclip, Loader, AlertCircle, RotateCw, CheckSquare, MoreVertical, Download, CheckCircle2, CheckCircle, X, Square
} from 'lucide-react';
import { projectService } from '../services/projectService';
import ConfirmUploadModal from './modals/ConfirmUploadModal';
import styles from '../styles/TaskAttachments.module.css';
import Preloader, {getFileIcon} from "./CommonComponents";

export default function TaskAttachments({
                                            projectId,
                                            taskId,
                                            attachments = [],
                                            onAttachmentsChange
                                        }) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingFiles, setPendingFiles] = useState(null);
    const [menuOpen, setMenuOpen] = useState(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteFiles, setDeleteFiles] = useState([]);
    const fileInputRef = useRef(null);
    const dropzoneRef = useRef(null);

    useEffect(() => {
        if (uploadQueue.length > 0 && !isUploading) {
            processNextInQueue();
        }
    }, [uploadQueue, isUploading]);

    const processNextInQueue = async () => {
        if (uploadQueue.length === 0) return;

        setIsUploading(true);
        const item = uploadQueue[0];

        onAttachmentsChange(prev =>
            prev.map(a => a.tempId === item.tempId ? { ...a, status: 'uploading' } : a)
        );

        try {
            const uploaded = await projectService.uploadAttachment(projectId, taskId, item.file);

            onAttachmentsChange(prev =>
                prev.map(a => a.tempId === item.tempId ? { ...uploaded, status: 'uploaded' } : a)
            );
        } catch (error) {
            console.error('Upload failed:', item.filename, error);
            updateItemStatus(item.tempId, 'failed');
        }

        setUploadQueue(prev => prev.slice(1));
        setIsUploading(false);
    };

    const updateItemStatus = (tempId, status) => {
        onAttachmentsChange(prev =>
            prev.map(a => a.tempId === tempId ? { ...a, status } : a)
        );
    };

    const handleFilesSelected = (files) => {
        const pendingAttachments = Array.from(files).map(file => ({
            tempId: Date.now() + Math.random() + file.name,
            filename: file.name,
            file_size: file.size,
            file_type: file.type,
            file: file,
            status: 'pending',
            created_at: new Date().toISOString(),
        }));

        // 1. Сразу показываем все файлы
        onAttachmentsChange(prev => [...prev, ...pendingAttachments]);

        // 2. Загружаем ВСЕ параллельно (браузер сам ограничит до 6 соединений на домен)
        files.forEach(file => {
            const tempId = pendingAttachments.find(a => a.filename === file.name)?.tempId;
            uploadFile(tempId, file);
        });

        setPendingFiles(null);
    };

    const uploadFile = async (tempId, file) => {
        if (!tempId) return;

        onAttachmentsChange(prev =>
            prev.map(a => a.tempId === tempId ? { ...a, status: 'uploading' } : a)
        );

        try {
            const uploaded = await projectService.uploadAttachment(projectId, taskId, file);
            onAttachmentsChange(prev =>
                prev.map(a => a.tempId === tempId ? { ...uploaded, status: 'uploaded' } : a)
            );
        } catch (error) {
            onAttachmentsChange(prev =>
                prev.map(a => a.tempId === tempId ? { ...a, status: 'failed' } : a)
            );
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setPendingFiles(files);
        }
        e.target.value = '';
    };

    const handleDeleteAttachment = async (attachment) => {
        if (attachment.tempId) {
            onAttachmentsChange(prev => prev.filter(a => a.tempId !== attachment.tempId));
            setUploadQueue(prev => prev.filter(q => q.tempId !== attachment.tempId));
            return;
        }

        try {
            await projectService.deleteAttachment(projectId, taskId, attachment.id);
            onAttachmentsChange(prev => prev.filter(a => a.id !== attachment.id));
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleDownload = async (attachment) => {
        if (attachment.tempId) return;

        try {
            const blob = await projectService.downloadAttachment(projectId, taskId, attachment.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = attachment.filename;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleRetry = (attachment) => {
        updateItemStatus(attachment.tempId, 'pending');
        setUploadQueue(prev => [...prev, attachment]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setPendingFiles(files);
        }
    };

    const handleDropzoneClick = (e) => {
        if (e.target === dropzoneRef.current ||
            e.target.classList.contains(styles.dropzoneText) ||
            e.target.classList.contains(styles.dropzonePrimary) ||
            e.target.classList.contains(styles.dropzoneSecondary) ||
            e.target.classList.contains(styles.uploadIcon)) {
            fileInputRef.current?.click();
        }
    };

    useEffect(() => {
        const handler = (e) => {
            // Если клик был НЕ по кнопке меню и НЕ по самому меню - закрываем
            if (!e.target.closest(`.${styles.actionBtn}`) && !e.target.closest(`.${styles.contextMenu}`)) {
                setMenuOpen(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Вход в режим выделения
    const enterSelectMode = (attachment) => {
        setSelectMode(true);
        setMenuOpen(null);
        const id = attachment.id || attachment.tempId;
        setSelectedIds(new Set([id]));
    };

    // Переключение выделения
    const toggleSelectItem = (attachment) => {
        const id = attachment.id || attachment.tempId;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            if (next.size === 0) {
                setSelectMode(false);
            }
            return next;
        });
    };

    // Выход из режима выделения
    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    // Массовое удаление
    const handleBulkDelete = () => {
        const filesToDelete = attachments.filter(a => {
            const id = a.id || a.tempId;
            return selectedIds.has(id) && !a.tempId;
        });
        setDeleteFiles(filesToDelete);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        for (const file of deleteFiles) {
            await handleDeleteAttachment(file);
        }
        setShowDeleteConfirm(false);
        exitSelectMode();
    };

    // Массовое скачивание
    const handleBulkDownload = async () => {
        for (const id of selectedIds) {
            const attachment = attachments.find(a => (a.id || a.tempId) === id);
            if (attachment && !attachment.tempId) {
                await handleDownload(attachment);
            }
        }
        exitSelectMode();
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={styles.container}>
            <label className={styles.label}>
                <Paperclip size={14}/> Attachments
                {attachments.length > 0 && (
                    <span className={styles.count}>({attachments.length})</span>
                )}
            </label>

            <div
                ref={dropzoneRef}
                className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropzoneClick}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className={styles.fileInput}
                />
                <Upload size={24} className={styles.uploadIcon}/>
                <div className={styles.dropzoneText}>
                    <span className={styles.dropzonePrimary}>Click to upload or drag and drop</span>
                    <span className={styles.dropzoneSecondary}>Any files up to 10MB</span>
                </div>
            </div>

            {attachments && Array.isArray(attachments) && attachments.length > 0 && (
                <div className={styles.list}>
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.id || attachment.tempId}
                            className={`${styles.item} ${attachment.status === 'uploading' ? styles.uploading : ''} ${attachment.status === 'failed' ? styles.failed : ''} ${selectMode ? styles.selectable : ''}`}
                            onClick={() => selectMode && toggleSelectItem(attachment)}
                        >
                            {selectMode && (
                                <div className={styles.checkbox}>
                                    {selectedIds.has(attachment.id || attachment.tempId) ? (
                                        <CheckSquare size={18} className={styles.checked} />
                                    ) : (
                                        <Square size={18} />
                                    )}
                                </div>
                            )}
                            <div className={styles.icon}>
                                {attachment.status === 'uploading' ? (
                                    <Preloader size={14} />
                                ) : attachment.status === 'failed' ? (
                                    <AlertCircle size={20} className={styles.failedIcon}/>
                                ) : (
                                    getFileIcon(attachment.file_type, attachment.filename)
                                )}
                            </div>

                            <div className={styles.info}>
                                <div
                                    className={`${styles.name} ${!attachment.tempId ? styles.downloadable : ''}`}
                                    onClick={() => !attachment.tempId && handleDownload(attachment)}
                                >
                                    {attachment.filename}
                                </div>
                                <div className={styles.meta}>
                                    <span className={styles.size}>{formatFileSize(attachment.file_size)}</span>

                                    {attachment.status === 'pending' && (
                                        <span className={`${styles.statusBadge} ${styles.pending}`}>Pending</span>
                                    )}
                                    {attachment.status === 'uploading' && (
                                        <span
                                            className={`${styles.statusBadge} ${styles.uploading}`}>Uploading...</span>
                                    )}
                                    {attachment.status === 'failed' && (
                                        <span className={`${styles.statusBadge} ${styles.failed}`}>
                                            Failed
                                        </span>
                                    )}
                                    {!attachment.tempId && (
                                        <span className={styles.date}>
                                            {new Date(attachment.created_at).toLocaleDateString()}
                                        </span>
                                    )}
                                    {!attachment.tempId && attachment.uploader && (
                                        <span className={styles.uploaderInfo}>
                                            {attachment.uploader.last_name} {attachment.uploader.first_name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.actions}>
                                {attachment.status === 'failed' && (
                                    <button
                                        type="button"
                                        className={`${styles.actionBtn} ${styles.retryBtn}`}
                                        onClick={() => handleRetry(attachment)}
                                        title="Retry"
                                    >
                                        <RotateCw size={14} color={'var(--error)'} />
                                    </button>
                                )}
                                <button
                                    className={styles.actionBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(menuOpen === (attachment.id || attachment.tempId) ? null : (attachment.id || attachment.tempId));
                                    }}
                                >
                                    <MoreVertical size={14}/>
                                </button>

                                {/* Контекстное меню */}
                                {menuOpen === (attachment.id || attachment.tempId) && (
                                    <div className={styles.contextMenu} onClick={e => e.stopPropagation()}>
                                        <div className={styles.menuItem} onClick={() => { handleDownload(attachment); setMenuOpen(null); }}>
                                            <Download size={14} /> Download
                                        </div>
                                        <div className={styles.menuItem} onClick={() => enterSelectMode(attachment)}>
                                            <CheckCircle size={14}/> Select
                                        </div>
                                        <div className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => {
                                            handleDeleteAttachment(attachment); setMenuOpen(null); }}>
                                            <Trash2 size={14} /> Delete
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {selectMode && (
                        <div className={styles.selectPanel}>
                            <button className={styles.selectPanelClose} onClick={exitSelectMode}>
                                <X size={16} />
                            </button>
                            <span className={styles.selectPanelText}>
                                {selectedIds.size} file{selectedIds.size > 1 ? 's' : ''} selected
                            </span>
                            <div className={styles.selectPanelActions}>
                                <button className={styles.selectPanelBtn} onClick={handleBulkDownload}>
                                    <Download size={16} />
                                </button>
                                <button className={`${styles.selectPanelBtn} ${styles.selectPanelBtnDanger}`} onClick={handleBulkDelete}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {pendingFiles && (
                <ConfirmUploadModal
                    files={pendingFiles}
                    onConfirm={(filesList) => {
                        handleFilesSelected(filesList, null);
                    }}
                    onCancel={() => setPendingFiles(null)}
                />
            )}
            {showDeleteConfirm && (
                <div className={styles.overlay} onClick={() => setShowDeleteConfirm(false)}>
                    <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.confirmHeader}>
                            <div>
                                <h3>Delete Files</h3>
                                <p className={styles.confirmSubtitle}>
                                    {deleteFiles.length} file{deleteFiles.length > 1 ? 's' : ''} · {formatFileSize(deleteFiles.reduce((sum, f) => sum + (f.file_size || 0), 0))}
                                </p>
                            </div>
                            <button className={styles.confirmClose} onClick={() => setShowDeleteConfirm(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.confirmBody}>
                            <div className={styles.confirmFilesList}>
                                {deleteFiles.map((file) => (
                                    <div key={file.id || file.tempId} className={styles.confirmFileItem}>
                                        <div className={styles.confirmFileIcon}>
                                            {getFileIcon(file.file_type, file.filename)}
                                        </div>
                                        <div className={styles.confirmFileInfo}>
                                            <span className={styles.confirmFileName}>{file.filename}</span>
                                            <span className={styles.confirmFileSize}>{formatFileSize(file.file_size)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.confirmActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className={styles.deleteBtn} onClick={confirmDelete}>
                                <Trash2 size={16} />
                                Delete {deleteFiles.length} file{deleteFiles.length > 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}