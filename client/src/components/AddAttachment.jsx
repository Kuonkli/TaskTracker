import { useState, useRef } from 'react';
import {
    Upload,
    File, FileImage, FileText, FileSpreadsheet, FileArchive, FileCode, FileJson,
    Eye, Trash2, Paperclip
} from 'lucide-react';
import '../styles/AddAttachment.css';
import {getFileIcon} from "./CommonComponents";

export default function AddAttachment({
                                          attachments = [],
                                          onAttachmentsChange,
                                          onFilesSelected,
                                          onDownload,      // ← Колбэк для скачивания
                                          onDelete,        // ← Колбэк для удаления
                                          withUploader = false,
                                          showUploader = true  // Показывать ли дропзону (в модалке создания - да, на странице - да)
                                      }) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const dropzoneRef = useRef(null);

    const handleFileUpload = (files) => {
        const newAttachments = Array.from(files).map(file => ({
            id: Date.now() + Math.random() + file.name,
            filename: file.name,
            file_size: file.size,
            file_type: file.type,
            file: file,
            created_at: new Date().toISOString(),
        }));

        // Если есть колбэк - передаем наверх (TaskPage покажет модалку)
        if (onFilesSelected) {
            onFilesSelected(files, newAttachments);
            return;
        }

        // Иначе добавляем в список (CreateTaskModal)
        onAttachmentsChange([...attachments, ...newAttachments]);
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
        e.target.value = '';
    };

    const handleRemoveAttachment = (attachmentId) => {
        // Если есть колбэк на удаление - вызываем его
        if (onDelete) {
            const attachment = attachments.find(att => att.id === attachmentId);
            onDelete(attachment);
            return;
        }

        // Иначе удаляем локально
        const attachment = attachments.find(att => att.id === attachmentId);
        if (attachment?.file_url && attachment.file_url.startsWith('blob:')) {
            URL.revokeObjectURL(attachment.file_url);
        }
        onAttachmentsChange(attachments.filter(att => att.id !== attachmentId));
    };

    const handleDownload = (attachment) => {
        // Если есть колбэк - вызываем его
        if (onDownload) {
            onDownload(attachment);
            return;
        }

        // Иначе пробуем скачать сами (для локальных файлов)
        if (attachment.file_url && attachment.file_url.startsWith('blob:')) {
            const link = document.createElement('a');
            link.href = attachment.file_url;
            link.download = attachment.filename;
            link.click();
        }
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

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
    };

    const handleDropzoneClick = (e) => {
        if (e.target === dropzoneRef.current ||
            e.target.classList.contains('attachment-dropzone-text') ||
            e.target.classList.contains('attachment-dropzone-primary') ||
            e.target.classList.contains('attachment-dropzone-secondary') ||
            e.target.classList.contains('attachment-upload-icon')) {
            fileInputRef.current?.click();
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0 || !bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="attachment-container">
            <label className="attachment-label">
                <Paperclip size={14}/> Attachments
                {attachments.length > 0 && (
                    <span className="attachment-count">({attachments.length})</span>
                )}
            </label>

            {showUploader && (
                <div
                    ref={dropzoneRef}
                    className={`attachment-dropzone ${isDragging ? 'attachment-dragging' : ''}`}
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
                        className="attachment-file-input"
                    />
                    <Upload size={24} className="attachment-upload-icon" />
                    <div className="attachment-dropzone-text">
                        <span className="attachment-dropzone-primary">Click to upload or drag and drop</span>
                        <span className="attachment-dropzone-secondary">Any files up to 10MB</span>
                    </div>
                </div>
            )}

            {attachments.length > 0 && (
                <div className="attachment-list">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="attachment-item">
                            <div className="attachment-icon">
                                {getFileIcon(attachment.file_type, attachment.filename)}
                            </div>
                            <div className="attachment-info">
                                <div className="attachment-name" onClick={() => handleDownload(attachment)}>
                                    {attachment.filename}
                                </div>
                                <div className="attachment-meta">
                                    <span className="attachment-size">{formatFileSize(attachment.file_size)}</span>
                                    <span className="attachment-date">
                                        {new Date(attachment.created_at).toLocaleDateString()}
                                    </span>
                                    {withUploader && attachment.uploader && (
                                        <span className="uploader-info">
                                            {attachment.uploader.last_name} {attachment.uploader.first_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="attachment-actions">
                                <button
                                    type="button"
                                    className="attachment-btn attachment-remove"
                                    onClick={() => handleRemoveAttachment(attachment.id)}
                                    title="Remove"
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}