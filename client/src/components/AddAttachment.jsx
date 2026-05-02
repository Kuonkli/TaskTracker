import { useState, useRef } from 'react';
import {
    Upload,
    File,
    FileImage,
    FileText,
    FileSpreadsheet,
    FileArchive,
    FileCode,
    FileJson,
    Eye,
    Download,
    Trash2,
    Paperclip
} from 'lucide-react';
import '../styles/AddAttachment.css';

export default function AddAttachment({ attachments, onAttachmentsChange }) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const dropzoneRef = useRef(null);

    const handleFileUpload = (files: FileList) => {
        const newAttachments = Array.from(files).map(file => ({
            id: Date.now() + Math.random() + file.name,
            filename: file.name,
            file_size: file.size,
            file_type: file.type,
            file: file,
            created_at: new Date().toISOString(),
            file_url: URL.createObjectURL(file)
        }));

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
        const attachment = attachments.find(att => att.id === attachmentId);
        if (attachment?.file_url) {
            URL.revokeObjectURL(attachment.file_url);
        }
        onAttachmentsChange(attachments.filter(att => att.id !== attachmentId));
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
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType, fileName = '') => {
        const iconProps = { size: 20, className: "attachment-icon-svg" };

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
            lowerFileName.endsWith('.docx') ||
            lowerFileName.endsWith('.doc')) {
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

    return (
        <div className="attachment-container">
            <label className="attachment-label">
                <Paperclip size={14}/> Attachments
                {attachments.length > 0 && (
                    <span className="attachment-count">
                        ({attachments.length})
                    </span>
                )}
            </label>

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
                    <span className="attachment-dropzone-primary">
                        Click to upload or drag and drop
                    </span>
                    <span className="attachment-dropzone-secondary">
                        Any files up to 10MB
                    </span>
                </div>
            </div>

            {attachments.length > 0 && (
                <div className="attachment-list">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="attachment-item">
                            <div className="attachment-icon">
                                {getFileIcon(attachment.file_type, attachment.filename)}
                            </div>
                            <div className="attachment-info">
                                <div
                                    className="attachment-name"
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = attachment.file_url;
                                        link.download = attachment.filename;
                                        link.click();
                                    }}
                                >
                                    {attachment.filename}
                                </div>
                                <div className="attachment-meta">
                                    <span className="attachment-size">
                                        {formatFileSize(attachment.file_size)}
                                    </span>
                                    <span className="attachment-date">
                                        {new Date(attachment.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="attachment-actions">
                                {attachment.file_type.startsWith('image/') && (
                                    <button
                                        type="button"
                                        className="attachment-btn attachment-preview"
                                        onClick={() => window.open(attachment.file_url, '_blank')}
                                        title="Preview"
                                    >
                                        <Eye size={14}/>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="attachment-btn attachment-remove"
                                    onClick={() => handleRemoveAttachment(attachment.id)}
                                    title="Remove"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}