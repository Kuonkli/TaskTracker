import { useState } from 'react';
import { X } from 'lucide-react';
import styles from '../../styles/ConfirmModal.module.css';

export default function ConfirmModal({
                                         isOpen,
                                         onClose,
                                         onConfirm,
                                         title = 'Confirm Action',
                                         confirmText = 'Confirm',
                                         cancelText = 'Cancel',
                                         confirmVariant = 'primary', // 'primary', 'danger'
                                         isLoading = false,
                                         disabled = false,
                                         children
                                     }) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>{title}</h3>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.body}>
                    {children}
                </div>

                <div className={styles.footer}>
                    <button
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`${styles.confirmBtn} ${styles[confirmVariant]}`}
                        onClick={onConfirm}
                        disabled={disabled || isLoading}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}