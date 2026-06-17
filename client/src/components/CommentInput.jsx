import {useState, useRef, useEffect, useImperativeHandle, forwardRef} from 'react';
import { Send, AtSign, X } from 'lucide-react';
import { CustomUserAvatar } from './CommonComponents';
import styles from '../styles/CommentInput.module.css';

const CommentInput = forwardRef(({
                                     members = [],
                                     onSubmit,
                                     onCancel,
                                     placeholder = "Write a comment..."
                                 }, ref) => {
    const [text, setText] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const textareaRef = useRef(null);
    const mentionsRef = useRef(null);
    const containerRef = useRef(null);

    // Прокидываем ref для фокуса извне
    useImperativeHandle(ref, () => ({
        focus: () => {
            textareaRef.current?.focus();
        },
        scrollIntoView: (options) => {
            containerRef.current?.scrollIntoView(options);
        }
    }));


    const filteredMembers = members.filter(member => {
        const fullName = `${member.user.last_name} ${member.user.first_name}`.toLowerCase();
        const nickname = member.user.nickname?.toLowerCase() || '';
        const search = mentionSearch.toLowerCase();
        return fullName.includes(search) || nickname.includes(search);
    });

    const checkForMention = (value, cursorPos) => {
        const textBeforeCursor = value.substring(0, cursorPos);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            setMentionSearch(match[1]);
            setShowMentions(true);
            setHighlightedIndex(0);
        } else {
            setShowMentions(false);
        }
    };

    const handleChange = (e) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        setText(value);
        setCursorPosition(cursorPos);
        checkForMention(value, cursorPos);
    };

    const handleKeyDown = (e) => {
        if (showMentions && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredMembers.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredMembers[highlightedIndex]);
            } else if (e.key === 'Escape') {
                setShowMentions(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const insertMention = (member) => {
        const textBeforeCursor = text.substring(0, cursorPosition);
        const textAfterCursor = text.substring(cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            const newText = textBeforeCursor.replace(
                /@(\w*)$/,
                `@${member.user.nickname} `
            ) + textAfterCursor;

            setText(newText);
            setShowMentions(false);

            const newPosition = textBeforeCursor.length - mentionMatch[0].length +
                `@${member.user.nickname} `.length;

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newPosition, newPosition);
                }
            }, 0);
        }
    };

    const handleMentionClick = (member) => {
        insertMention(member);
    };

    const handleSubmit = () => {
        if (text.trim()) {
            onSubmit(text.trim());
            setText('');
            setShowMentions(false);
        }
    };

    const handleSelect = (e) => {
        setCursorPosition(e.target.selectionStart);
        checkForMention(text, e.target.selectionStart);
    };

    useEffect(() => {
        if (showMentions && mentionsRef.current) {
            const highlighted = mentionsRef.current.children[highlightedIndex];
            if (highlighted) {
                highlighted.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, showMentions]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowMentions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.container} ref={containerRef}>
            {showMentions && filteredMembers.length > 0 && (
                <div className={styles.mentionsDropdown} ref={mentionsRef}>
                    {filteredMembers.map((member, index) => (
                        <div
                            key={member.user.id}
                            className={`${styles.mentionItem} ${index === highlightedIndex ? styles.highlighted : ''}`}
                            onClick={() => handleMentionClick(member)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            <CustomUserAvatar
                                user={member.user}
                                color={member.user.color}
                                size="28px"
                                fontSize="10px"
                            />
                            <div className={styles.mentionInfo}>
                                <span className={styles.mentionName}>
                                    {member.user.last_name} {member.user.first_name}
                                </span>
                                <span className={styles.mentionNickname}>
                                    @{member.user.nickname}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.inputWrapper}>
                <textarea
                    ref={textareaRef}
                    className={styles.textarea}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onSelect={handleSelect}
                    onClick={handleSelect}
                    placeholder={placeholder}
                    rows={3}
                    autoFocus
                />
                <div className={styles.actions}>
                    <div className={styles.actionsRight}>
                        <button
                            className={styles.cancelBtn}
                            onClick={onCancel}
                            type="button"
                        >
                            <X size={16}/>
                            Cancel
                        </button>
                        <button
                            className={styles.submitBtn}
                            onClick={handleSubmit}
                            disabled={!text.trim()}
                            type="button"
                        >
                        <Send size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

CommentInput.displayName = 'CommentInput';
export default CommentInput;