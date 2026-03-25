import { useEffect, useId, useState } from "react";
import {
  getAutocompleteNextState,
  shouldAutocompleteClose,
  shouldAutocompleteCommit
} from "../utils/autocompleteState";

export function useAutocompleteField({
  optionCount,
  onCaretChange,
  commitKeys = ["Tab"],
  isEnabled = true
}) {
  const [caret, setCaret] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOptionActive, setIsOptionActive] = useState(false);
  const comboboxId = useId();
  const listboxId = `${comboboxId}-listbox`;
  const hintId = `${comboboxId}-hint`;
  const optionIdPrefix = `${comboboxId}-option`;

  const resetActiveOption = () => {
    setActiveIndex(0);
    setIsOptionActive(false);
  };

  const updateCaret = (nextCaret) => {
    setCaret(nextCaret);
    onCaretChange?.(nextCaret);
  };

  const open = () => {
    if (isEnabled) {
      setIsOpen(true);
    }
  };

  const close = () => {
    setIsOpen(false);
    resetActiveOption();
  };

  const handleFocus = (nextCaret) => {
    setIsFocused(true);
    updateCaret(nextCaret);
    open();
  };

  const handleBlur = () => {
    setIsFocused(false);
    close();
  };

  const handleValueInput = (nextCaret) => {
    updateCaret(nextCaret);
    resetActiveOption();
    open();
  };

  const handleKeyDown = (event, onCommitOption) => {
    if (!isEnabled || optionCount <= 0) {
      if (shouldAutocompleteClose({ isOpen, key: event.key })) {
        event.preventDefault();
        close();
        return true;
      }
      return false;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextState = getAutocompleteNextState({
        direction: "next",
        activeIndex,
        optionCount,
        isOptionActive
      });
      setActiveIndex(nextState.activeIndex);
      setIsOptionActive(nextState.isOptionActive);
      open();
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextState = getAutocompleteNextState({
        direction: "previous",
        activeIndex,
        optionCount,
        isOptionActive
      });
      setActiveIndex(nextState.activeIndex);
      setIsOptionActive(nextState.isOptionActive);
      open();
      return true;
    }

    if (shouldAutocompleteCommit({
      isOpen: isFocused && isOpen,
      optionCount,
      key: event.key,
      commitKeys
    })) {
      event.preventDefault();
      onCommitOption?.(isOptionActive ? activeIndex : 0);
      return true;
    }

    if (shouldAutocompleteClose({ isOpen, key: event.key })) {
      event.preventDefault();
      close();
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (activeIndex < optionCount) {
      return;
    }

    resetActiveOption();
  }, [activeIndex, optionCount]);

  useEffect(() => {
    if (isEnabled) {
      return;
    }

    close();
  }, [isEnabled]);

  return {
    caret,
    isFocused,
    isOpen,
    activeIndex,
    isOptionActive,
    comboboxId,
    listboxId,
    hintId,
    optionIdPrefix,
    updateCaret,
    open,
    close,
    resetActiveOption,
    setActiveIndex,
    setIsOptionActive,
    handleFocus,
    handleBlur,
    handleValueInput,
    handleKeyDown
  };
}
