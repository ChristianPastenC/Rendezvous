import { useState, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { EMOJI_SHORTCUTS } from '../utils/emojiShortcuts';

export const useEmojiInput = (
  onSubmit: (content: string) => Promise<boolean | void> | boolean | void
) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const convertEmojiShortcuts = useCallback((text: string): string => {
    let convertedText = text;
    const shortcutsMap = EMOJI_SHORTCUTS as Record<string, string>;
    const sortedShortcuts = Object.keys(shortcutsMap).sort((a, b) => b.length - a.length);

    sortedShortcuts.forEach((shortcut) => {
      const regex = new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const emoji = shortcutsMap[shortcut];
      if (emoji) {
        convertedText = convertedText.replace(regex, emoji);
      }
    });

    return convertedText;
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart ?? newValue.length;

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
    },
    [convertEmojiShortcuts]
  );

  const handleEmojiClick = useCallback((emojiObject: { emoji: string }) => {
    setContent((prevContent) => prevContent + emojiObject.emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  const closeEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!content.trim()) return;

      const finalContent = convertEmojiShortcuts(content.trim());
      const success = await onSubmit(finalContent);

      if (success !== false) {
        setContent('');
        setShowEmojiPicker(false);
      }
    },
    [content, convertEmojiShortcuts, onSubmit]
  );

  const clearContent = useCallback(() => {
    setContent('');
  }, []);

  const setInputContent = useCallback((newContent: string) => {
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
    convertEmojiShortcuts,
  };
};
