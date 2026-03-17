import { useCallback, useState } from "react";
import { MODAL_KEYS } from "../app/modal/modalKeys";

const initialState = Object.values(MODAL_KEYS).reduce((acc, key) => {
  acc[key] = null;
  return acc;
}, {});

export function useModalManager() {
  const [modals, setModals] = useState(initialState);

  const openModal = useCallback((key, payload = {}) => {
    setModals((current) => ({ ...current, [key]: payload }));
  }, []);

  const closeModal = useCallback((key) => {
    setModals((current) => ({ ...current, [key]: null }));
  }, []);

  const isModalOpen = useCallback((key) => Boolean(modals[key]), [modals]);
  const getModalPayload = useCallback((key) => modals[key], [modals]);

  return {
    modals,
    openModal,
    closeModal,
    isModalOpen,
    getModalPayload
  };
}
