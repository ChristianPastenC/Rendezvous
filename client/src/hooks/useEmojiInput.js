import { useState, useCallback, useRef } from 'react';
import { EMOJI_SHORTCUTS } from '../utils/emojiShortcuts';

export const useEmojiInput = (onSubmit) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);

  const convertEmojiShortcuts = useCallback((text) => {
    let convertedText = text;

    const sortedShortcuts = Object.keys(EMOJI_SHORTCUTS).sort((a, b) => b.length - a.length);

    sortedShortcuts.forEach(shortcut => {
      const regex = new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      convertedText = convertedText.replace(regex, EMOJI_SHORTCUTS[shortcut]);
    });

    return convertedText;
  }, []);

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    if (newValue.endsWith(' ')) {
      const convertedValue = convertEmojiShortcuts(newValue);
      if (convertedValue !== newValue) {
        setContent(convertedValue);
        setTimeout(() => {
          if (inputRef.current) {
            const diff = convertedValue.length - newValue.length;
            inputRef.current.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
          }
        }, 0);
        return;
      }
    }

    setContent(newValue);
  }, [convertEmojiShortcuts]);

  const handleEmojiClick = useCallback((emojiObject) => {
    setContent(prevContent => prevContent + emojiObject.emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  const closeEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const finalContent = convertEmojiShortcuts(content.trim());

    const success = await onSubmit(finalContent);

    if (success !== false) {
      setContent('');
      setShowEmojiPicker(false);
    }
  }, [content, convertEmojiShortcuts, onSubmit]);

  const clearContent = useCallback(() => {
    setContent('');
  }, []);

  const setInputContent = useCallback((newContent) => {
    setContent(newContent);
  }, []);

  return {
    content,
    showEmojiPicker,
    inputRef,

    handleInputChange,
    handleEmojiClick,
    toggleEmojiPicker,
    closeEmojiPicker,
    handleSubmit,
    clearContent,
    setInputContent,
    convertEmojiShortcuts
  };
};