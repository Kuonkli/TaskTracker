import React from 'react';

const ErrorAlert = ({ message, onClose }) => {
    return (
        <div className="error-alert" style={{ position: 'relative' }}>
            <strong>Error: </strong>{message}
            {onClose && (
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '10px',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        color: '#991b1b'
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
};

export default ErrorAlert;