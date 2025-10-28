// client/src/hooks/useEmojiInput.js
import { useState, useCallback, useRef } from 'react';
import { EMOJI_SHORTCUTS } from '../utils/emojiShortcuts';

/**
 * A custom hook for managing a text input with emoji support.
 * It handles emoji shortcut conversion, an emoji picker, and form submission.
 * @param {(content: string) => Promise<boolean | void> | boolean | void} onSubmit - A callback function that is executed when the form is submitted.
 * It receives the final, processed content. If it returns `false`, the input will not be cleared.
 * @returns {{
 *  content: string,
 *  showEmojiPicker: boolean,
 *  inputRef: React.RefObject<HTMLInputElement>,
 *  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
 *  handleEmojiClick: (emojiObject: { emoji: string }) => void,
 *  toggleEmojiPicker: () => void,
 *  closeEmojiPicker: () => void,
 *  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>,
 *  clearContent: () => void,
 *  setInputContent: (newContent: string) => void,
 *  convertEmojiShortcuts: (text: string) => string
 * }} An object containing state and handlers for the emoji input.
 */
export const useEmojiInput = (onSubmit) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);

  /**
   * Converts known text shortcuts (e.g., `:)`) into their corresponding emoji characters.
   * @param {string} text - The text to process.
   * @returns {string} The text with shortcuts replaced by emojis.
   */
  const convertEmojiShortcuts = useCallback((text) => {
    let convertedText = text;

    const sortedShortcuts = Object.keys(EMOJI_SHORTCUTS).sort((a, b) => b.length - a.length);

    sortedShortcuts.forEach(shortcut => {
      const regex = new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      convertedText = convertedText.replace(regex, EMOJI_SHORTCUTS[shortcut]);
    });

    return convertedText;
  }, []);

  /**
   * Handles the change event of the text input.
   * It triggers emoji shortcut conversion when a space is typed.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
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

  /**
   * Appends an emoji to the input content when an emoji is selected from the picker.
   * @param {{ emoji: string }} emojiObject - The object containing the selected emoji.
   */
  const handleEmojiClick = useCallback((emojiObject) => {
    setContent(prevContent => prevContent + emojiObject.emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * Toggles the visibility of the emoji picker.
   */
  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  /**
   * Closes the emoji picker.
   */
  const closeEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
  }, []);

  /**
   * Handles the form submission event.
   * It trims the content, converts any final emoji shortcuts, and calls the `onSubmit` callback.
   * Clears the input on successful submission unless `onSubmit` returns `false`.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
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

  /**
   * Clears the content of the input field.
   */
  const clearContent = useCallback(() => {
    setContent('');
  }, []);

  /**
   * Programmatically sets the content of the input field.
   * @param {string} newContent - The new content for the input.
   */
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