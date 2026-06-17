import { useState, useRef } from 'react';
import {
    X, File, Save, Plus, Trash2, Upload,
    FileImage, FileText, FileSpreadsheet, FileArchive, FileCode, FileJson
} from 'lucide-react';
import styles from '../../styles/ConfirmUploadModal.module.css';

export default function ConfirmUploadModal({ files, onConfirm, onCancel }) {
    const [filesList, setFilesList] = useState(() => Array.from(files || []));
    const [isDragging, setIsDragging] = useState(false);
    const dropZoneRef = useRef(null);
    const dragCounter = useRef(0);

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType, fileName = '') => {
        const iconProps = { className: styles.fileIcon };

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

    const handleRemove = (index) => {
        const updated = filesList.filter((_, i) => i !== index);
        setFilesList(updated);

        if (updated.length === 0) {
            onCancel();
        }
    };

    const handleAddMore = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            const newFiles = Array.from(e.target.files);
            setFilesList(prev => [...prev, ...newFiles]);
        };
        input.click();
    };

    // Drag & Drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            setFilesList(prev => [...prev, ...droppedFiles]);
        }
    };

    const totalSize = filesList.reduce((sum, f) => sum + f.size, 0);

    if (filesList.length === 0) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onCancel} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h3>Upload Files</h3>
                        <p className={styles.subtitle}>
                            {filesList.length} file{filesList.length > 1 ? 's' : ''} · {formatFileSize(totalSize)}
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onCancel}>
                        <X size={18} />
                    </button>
                </div>

                <div
                    className={`${styles.body} ${isDragging ? styles.dragging : ''}`}
                    ref={dropZoneRef}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className={styles.dropOverlay}>
                            <Upload size={32} />
                            <span>Drop files to add</span>
                        </div>
                    )}

                    <div className={styles.filesList}>
                        {filesList.map((file, index) => (
                            <div key={index} className={styles.fileItem}>
                                <div className={styles.fileIcon}>
                                    {getFileIcon(file.type, file.name)}
                                </div>
                                <div className={styles.fileInfo}>
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                                </div>
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => handleRemove(index)}
                                    title="Remove"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button className={styles.addMoreBtn} onClick={handleAddMore}>
                        <Plus size={14} />
                        Add more files
                    </button>
                </div>

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={styles.saveBtn} onClick={() => onConfirm(filesList)}>
                        <Save size={16} />
                        Upload file{filesList.length > 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </>
    );
}