import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import '../styles/CustomInputSelector.css';

export default function CustomInputSelector({
                                                availableItems = [],
                                                onSelect,
                                                defaultItem = null,
                                                onDefaultSelect,
                                                placeholder = "Select items...",
                                                renderItem = (item) => getItemName(item),
                                                renderDefaultItem = (item) => item.name,
                                                getItemId = (item) => item.id,
                                                getItemName = (item) => item.name,
                                                inputClassName = "",
                                                wrapperClassName = "",
                                                dropdownClassName = ""
                                            }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listboxRef = useRef(null);

    // Фильтруем элементы по поиску
    const filteredItems = availableItems.filter(item =>
        getItemName(item).toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Закрытие при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
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

    const handleSelectItem = (item) => {
        onSelect(item);
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
    };

    const handleDefaultSelect = () => {
        if (onDefaultSelect) {
            onDefaultSelect();
        }
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
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
                    prev < filteredItems.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
                    handleSelectItem(filteredItems[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchQuery('');
                break;
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setHighlightedIndex(-1);

        if (!isOpen) {
            setIsOpen(true);
        }
    };

    return (
        <div className={`custom-input-selector ${wrapperClassName}`} ref={containerRef}>
            <div className={`selector-wrapper`} onClick={() => setIsOpen(true)}>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`selector-input ${inputClassName}`}
                />
                <ChevronDown size={16} className={`dropdown-icon ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className={`dropdown ${dropdownClassName}`}>
                    {defaultItem && (
                        <>
                            <div
                                className="dropdown-item default-item"
                                onClick={handleDefaultSelect}
                                onMouseEnter={() => setHighlightedIndex(-1)}
                            >
                                {renderDefaultItem(defaultItem)}
                            </div>
                            {filteredItems.length > 0 && <div className="dropdown-divider" />}
                        </>
                    )}

                    {filteredItems.length > 0 ? (
                        <div className="items-list" ref={listboxRef}>
                            {filteredItems.map((item, index) => (
                                <div
                                    key={getItemId(item)}
                                    className={`dropdown-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                                    onClick={() => handleSelectItem(item)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    {renderItem(item)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        !defaultItem && (
                            <div className="dropdown-empty">
                                <span className="no-results">No items found</span>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}