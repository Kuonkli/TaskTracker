import { useEffect, useState } from 'react';
import {AlertCircle, CheckCircle, X, Info, AlertTriangle, Check} from 'lucide-react';
import '../../styles/Toast.css';

const Toast = ({ message, type = 'error', duration = 5000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <Check size={20} />;
            case 'warning':
                return <AlertTriangle size={20} />;
            case 'info':
                return <Info size={20} />;
            default:
                return <AlertCircle size={20} />;
        }
    };

    const getClassName = () => {
        return `toast toast-${type} ${isVisible ? 'toast-enter' : 'toast-exit'}`;
    };

    // Разбиваем сообщение на строки для отображения
    const renderMessage = () => {
        const lines = message.split('\n');
        return lines.map((line, index) => (
            <div key={index} className="toast-message-line">
                {line}
            </div>
        ));
    };

    return (
        <div className={getClassName()}>
            <div className="toast-icon">{getIcon()}</div>
            <div className="toast-content">
                <div className="toast-message">
                    {renderMessage()}
                </div>
            </div>
            <button className="toast-close" onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
            }}>
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;