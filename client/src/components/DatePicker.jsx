import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check, ChevronUp, ChevronDown } from 'lucide-react';
import styles from '../styles/DatePicker.module.css';

const DatePicker = ({
                        value = null,
                        onChange,
                        placeholder = 'Select date',
                        label = null,
                        required = false,
                        disabled = false,
                        includeTime = true
                    }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
    const [tempDate, setTempDate] = useState(value ? new Date(value) : null);
    const [tempTime, setTempTime] = useState(() => {
        if (value) {
            const date = new Date(value);
            return { hours: date.getHours(), minutes: date.getMinutes() };
        }
        return { hours: 12, minutes: 0 };
    });

    const [activeTimeField, setActiveTimeField] = useState(null);
    const [isHolding, setIsHolding] = useState(false);
    const holdIntervalRef = useRef(null);
    const pickerRef = useRef(null);
    const hoursRef = useRef(null);
    const minutesRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveTimeField(null);
                stopHold();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) {
            const newDate = new Date(value);
            setSelectedDate(newDate);
            setTempDate(newDate);
            setTempTime({ hours: newDate.getHours(), minutes: newDate.getMinutes() });
        } else {
            setSelectedDate(null);
            setTempDate(null);
        }
    }, [value]);

    useEffect(() => {
        return () => stopHold();
    }, []);

    const stopHold = () => {
        if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
        setIsHolding(false);
    };

    const startHold = (field, direction) => {
        changeTimeValue(field, direction);
        holdIntervalRef.current = setInterval(() => {
            changeTimeValue(field, direction);
        }, 200);
        setIsHolding(true);
    };

    const changeTimeValue = (field, direction) => {
        setTempTime(prev => {
            if (field === 'hours') {
                let newHours = prev.hours + direction;
                if (newHours < 0) newHours = 23;
                if (newHours > 23) newHours = 0;
                return { ...prev, hours: newHours };
            } else {
                let newMinutes = prev.minutes + direction;
                if (newMinutes < 0) newMinutes = 59;
                if (newMinutes > 59) newMinutes = 0;
                return { ...prev, minutes: newMinutes };
            }
        });
    };

    const formatDateTime = (date) => {
        if (!date) return '';
        if (includeTime) {
            // 24-часовой формат
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleDateSelect = (date) => {
        setTempDate(date);
    };

    const handleTimeFieldClick = (field) => {
        setActiveTimeField(activeTimeField === field ? null : field);
    };

    const handleWheel = (field, event) => {
        if (event.cancelable) {
            event.preventDefault();
        }
        const delta = event.deltaY > 0 ? -1 : 1;
        changeTimeValue(field, delta);
    };

    const handleConfirm = () => {
        if (tempDate) {
            const finalDate = new Date(tempDate);
            if (includeTime) {
                finalDate.setHours(tempTime.hours, tempTime.minutes, 0, 0);
            } else {
                finalDate.setHours(0, 0, 0, 0);
            }
            setSelectedDate(finalDate);
            onChange(finalDate.toISOString());
        } else {
            setSelectedDate(null);
            onChange(null);
        }
        setIsOpen(false);
        setActiveTimeField(null);
        stopHold();
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSelectedDate(null);
        setTempDate(null);
        onChange(null);
        setIsOpen(false);
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const isSameDay = (date1, date2) => {
        return date1 && date2 &&
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const isToday = (date) => {
        return isSameDay(date, new Date());
    };

    const days = getDaysInMonth(currentMonth);
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const formatTimeValue = (value) => {
        return value.toString().padStart(2, '0');
    };

    return (
        <div className={styles.datePickerWrapper} ref={pickerRef}>
            {label && (
                <label className={styles.datePickerLabel}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={styles.datePickerInputWrapper}>
                <input
                    type="text"
                    className={styles.datePickerInput}
                    value={selectedDate ? formatDateTime(selectedDate) : ''}
                    placeholder={placeholder}
                    readOnly
                    onClick={() => setIsOpen(!isOpen)}
                />
                <div className={styles.inputIcons}>
                    {selectedDate && (
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={handleClear}
                        >
                            ✕
                        </button>
                    )}
                    <Calendar size={18} className={styles.calendarIcon} />
                </div>
            </div>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.calendarHeader}>
                        <button onClick={handlePrevMonth} className={styles.navBtn}>
                            <ChevronLeft size={18} />
                        </button>
                        <span className={styles.monthYear}>
                            {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={handleNextMonth} className={styles.navBtn}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className={styles.calendarWeekdays}>
                        {weekDays.map(day => (
                            <div key={day} className={styles.weekday}>{day}</div>
                        ))}
                    </div>

                    <div className={styles.calendarDays}>
                        {days.map((day, index) => (
                            <div
                                key={index}
                                className={`${styles.calendarDay} 
                                    ${!day ? styles.empty : ''}
                                    ${day && isSameDay(day, tempDate) ? styles.selected : ''}
                                    ${day && isToday(day) ? styles.today : ''}
                                `}
                                onClick={() => day && handleDateSelect(day)}
                            >
                                {day && day.getDate()}
                            </div>
                        ))}
                    </div>

                    {includeTime && (
                        <div className={styles.timeSelector}>
                            <div className={styles.timeLabel}>
                                <span>TIME</span>
                            </div>
                            <div className={styles.timePicker}>
                                <div className={styles.timeColumn}>
                                    <button
                                        className={styles.timeArrowBtn}
                                        onMouseDown={() => startHold('hours', 1)}
                                        onMouseUp={stopHold}
                                        onMouseLeave={stopHold}
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                    <div
                                        ref={hoursRef}
                                        className={`${styles.timeValue} ${activeTimeField === 'hours' ? styles.active : ''}`}
                                        onClick={() => handleTimeFieldClick('hours')}
                                        onWheel={(e) => handleWheel('hours', e)}
                                    >
                                        <span>{formatTimeValue(tempTime.hours)}</span>
                                    </div>
                                    <button
                                        className={styles.timeArrowBtn}
                                        onMouseDown={() => startHold('hours', -1)}
                                        onMouseUp={stopHold}
                                        onMouseLeave={stopHold}
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>

                                <div className={styles.timeSeparator}>:</div>

                                <div className={styles.timeColumn}>
                                    <button
                                        className={styles.timeArrowBtn}
                                        onMouseDown={() => startHold('minutes', 1)}
                                        onMouseUp={stopHold}
                                        onMouseLeave={stopHold}
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                    <div
                                        ref={minutesRef}
                                        className={`${styles.timeValue} ${activeTimeField === 'minutes' ? styles.active : ''}`}
                                        onClick={() => handleTimeFieldClick('minutes')}
                                        onWheel={(e) => handleWheel('minutes', e)}
                                    >
                                        <span>{formatTimeValue(tempTime.minutes)}</span>
                                    </div>
                                    <button
                                        className={styles.timeArrowBtn}
                                        onMouseDown={() => startHold('minutes', -1)}
                                        onMouseUp={stopHold}
                                        onMouseLeave={stopHold}
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.dropdownActions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => {
                                setIsOpen(false);
                                setActiveTimeField(null);
                                stopHold();
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={handleConfirm}
                        >
                            <Check size={14} />
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;