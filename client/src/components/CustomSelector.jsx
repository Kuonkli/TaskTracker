import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import '../styles/CustomSelector.css';

export default function CustomSelector({
                                           items = [],
                                           selectedIndex = 0,
                                           onSelect,
                                           placeholder = "Select an item...",
                                           renderItem = (item) => item.name,
                                           getItemId = (item) => item.id,
                                           getItemName = (item) => item.name,
                                           buttonClassName = "",
                                           dropdownClassName = ""
                                       }) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef(null);
    const listboxRef = useRef(null);

    // Получаем выбранный элемент на основе selectedIndex
    const selectedItem = items[selectedIndex] || null;

    // Закрытие при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Прокрутка к выделенному элементу
    useEffect(() => {
        if (highlightedIndex >= 0 && listboxRef.current) {
            const highlightedElement = listboxRef.current.children[highlightedIndex];
            if (highlightedElement) {
                highlightedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [highlightedIndex]);

    // Сброс highlightedIndex при открытии/закрытии
    useEffect(() => {
        if (!isOpen) {
            setHighlightedIndex(-1);
        }
    }, [isOpen]);

    const handleSelectItem = (item) => {
        onSelect(item);
        setIsOpen(false);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < items.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && items[highlightedIndex]) {
                    handleSelectItem(items[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const getDisplayValue = () => {
        if (selectedItem) {
            return renderItem(selectedItem);
        }
        return placeholder;
    };

    return (
        <div
            className="custom-selector"
            ref={containerRef}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <button
                type="button"
                className={`selector-button ${buttonClassName} ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="selector-value">{getDisplayValue()}</span>
                <ChevronDown size={16} className={`selector-icon ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <div className={`selector-dropdown ${dropdownClassName}`}>
                    {items.length > 0 ? (
                        <div className="selector-items" ref={listboxRef} role="listbox">
                            {items.map((item, index) => (
                                <div
                                    key={getItemId(item)}
                                    className={`selector-item ${index === highlightedIndex ? 'highlighted' : ''} ${selectedItem && getItemId(selectedItem) === getItemId(item) ? 'selected' : ''}`}
                                    onClick={() => handleSelectItem(item)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    {renderItem(item)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="selector-empty">
                            <span className="no-items">No items available</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}