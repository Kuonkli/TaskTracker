import React, {createContext, useCallback, useContext, useState} from 'react';
import Toast from '../components/Toast/Toast';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'error', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Функция для форматирования деталей ошибки
    const formatErrorDetails = useCallback((errorData) => {
        if (!errorData.details) return null;

        // Если details - это объект с валидационными ошибками
        if (typeof errorData.details === 'object' && !Array.isArray(errorData.details)) {
            return Object.entries(errorData.details)
                .map(([field, message]) => `${field}: ${message}`)
                .join('\n');
        }

        // Если details - это строка
        if (typeof errorData.details === 'string') {
            return errorData.details;
        }

        return null;
    }, []);

    // Функция для обработки API ошибок с деталями
    const handleApiError = useCallback((error) => {
        let errorMessage = 'An unexpected error occurred';
        let errorDetails = null;

        if (error.response?.data) {
            const errorData = error.response.data;

            // Формируем основное сообщение
            if (errorData.message) {
                errorMessage = errorData.message;
            } else if (errorData.error) {
                errorMessage = errorData.error;
            }

            // Добавляем код ошибки, если есть
            if (errorData.code) {
                errorMessage = `${errorMessage} [${errorData.code}]`;
            }

            // Получаем детали ошибки
            errorDetails = formatErrorDetails(errorData);

            // Если есть детали, добавляем их в сообщение (для краткого варианта)
            if (errorDetails && typeof errorDetails === 'string') {
                errorMessage = `${errorMessage}: ${errorDetails}`;
            }
        } else if (error.request) {
            errorMessage = 'Нет соединения с сервером';
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Показываем тост с ошибкой (детали будут внутри)
        showToast(errorMessage, 'error', 8000); // Увеличиваем время для ошибок с деталями

        // Возвращаем детали для возможного использования в компоненте
        return { message: errorMessage, details: errorDetails };
    }, [showToast, formatErrorDetails]);

    // Функция для показа подробной ошибки
    const showDetailedError = useCallback((error, duration = 10000) => {
        let errorMessage = 'An unexpected error occurred';
        let errorDetails = null;
        let errorCode = null;
        let errorStatus = null;

        if (error.response?.data) {
            const errorData = error.response.data;
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorCode = errorData.code;
            errorStatus = errorData.status;
            errorDetails = errorData.details;
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Форматируем сообщение с кодом
        const fullMessage = errorCode
            ? `${errorMessage} (${errorCode})`
            : errorMessage;

        // Если есть детали, добавляем их в тост
        if (errorDetails) {
            let detailsText = '';
            if (typeof errorDetails === 'object') {
                detailsText = '\n\n' + Object.entries(errorDetails)
                    .map(([field, msg]) => `• ${field}: ${msg}`)
                    .join('\n');
            } else if (typeof errorDetails === 'string') {
                detailsText = '\n\n' + errorDetails;
            }

            showToast(fullMessage + detailsText, 'error', duration);
        } else {
            showToast(fullMessage, 'error', duration);
        }
    }, [showToast]);

    return (
        <ToastContext.Provider value={{
            showToast,
            handleApiError,
            showDetailedError,
            removeToast
        }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};