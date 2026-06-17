import { useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { setToastHandler } from '../../services/apiClient';

export const ToastInitializer = () => {
    const { showToast } = useToast();

    useEffect(() => {
        // Передаем функцию showToast в apiClient
        setToastHandler((message, type) => {
            showToast(message, type);
        });
    }, [showToast]);

    return null;
};