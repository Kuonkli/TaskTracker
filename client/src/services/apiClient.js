import axios from 'axios';

const API_BASE_URL = "/api";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Функция для установки обработчика ошибок из контекста
let toastHandler = null;

export const setToastHandler = (handler) => {
    toastHandler = handler;
};

// Функция для форматирования деталей ошибки в читаемый текст
const formatErrorDetails = (errorData) => {
    if (!errorData.details) return null;

    // Для валидационных ошибок (объект с полями)
    if (typeof errorData.details === 'object' && !Array.isArray(errorData.details)) {
        return Object.entries(errorData.details)
            .map(([field, message]) => `${field}: ${message}`)
            .join('; ');
    }

    // Для строковых деталей
    if (typeof errorData.details === 'string') {
        return errorData.details;
    }

    return null;
};

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('Session expired or invalid');
        }

        // Если есть обработчик тостов, показываем детализированную ошибку
        if (toastHandler && error.response?.status !== 401) {
            let errorMessage = 'Произошла ошибка при выполнении запроса';
            let errorDetails = null;
            let errorCode = null;

            if (error.response?.data) {
                const { message, error: errorText, code, details, status } = error.response.data;

                // Основное сообщение
                errorMessage = message || errorText || errorMessage;
                errorCode = code;

                // Детали ошибки
                errorDetails = formatErrorDetails(error.response.data);

                // Формируем полное сообщение
                let fullMessage = errorMessage;
                if (errorCode) {
                    fullMessage = `${fullMessage} [${errorCode}]`;
                }

                // Добавляем статус, если есть
                if (status) {
                    fullMessage = `${fullMessage} (HTTP ${status})`;
                }

                // Добавляем детали, если они есть
                if (errorDetails) {
                    fullMessage = `${fullMessage}\n\n${errorDetails}`;
                }

                // Для валидационных ошибок показываем более долгое уведомление
                const duration = errorCode === 'validation_failed' ? 10000 : 7000;
                toastHandler(fullMessage, 'error', duration);
            } else {
                toastHandler(errorMessage, 'error');
            }
        }

        return Promise.reject(error);
    }
);

// Расширенная функция обработки ошибок
export const handleApiError = (error, showToast, options = { showDetails: true }) => {
    let errorMessage = 'Произошла ошибка при выполнении запроса';
    let errorDetails = null;
    let errorCode = null;
    let errorStatus = null;

    if (error.response?.data) {
        const { message, error: errorText, code, details, status } = error.response.data;
        errorMessage = message || errorText || errorMessage;
        errorCode = code;
        errorStatus = status;
        errorDetails = details;
    } else if (error.request) {
        errorMessage = 'Нет соединения с сервером';
    } else if (error.message) {
        errorMessage = error.message;
    }

    if (showToast) {
        let fullMessage = errorMessage;

        if (options.showDetails && errorCode) {
            fullMessage = `${fullMessage} (${errorCode})`;
        }

        if (options.showDetails && errorDetails) {
            if (typeof errorDetails === 'object') {
                const detailsText = Object.entries(errorDetails)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join('\n');
                fullMessage = `${fullMessage}\n\n${detailsText}`;
            } else if (typeof errorDetails === 'string') {
                fullMessage = `${fullMessage}\n\n${errorDetails}`;
            }
        }

        showToast(fullMessage, 'error', options.duration || 7000);
    }

    return { message: errorMessage, details: errorDetails, code: errorCode, status: errorStatus };
};

// Утилита для логирования ошибок в консоль с деталями
export const logApiError = (error) => {
    if (error.response?.data) {
        const { status, error: errorType, message, code, details } = error.response.data;
        console.group(`API Error ${status}: ${errorType}`);
        console.log('Message:', message);
        console.log('Code:', code);
        if (details) {
            console.log('Details:', details);
        }
        console.groupEnd();
    } else {
        console.error('API Error:', error.message || error);
    }
};