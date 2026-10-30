import { useState, useEffect } from 'react';

export function useAutoSave(storageKey, initialValue, delay = 1000) {
  const [data, setData] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  // Load draft from LocalStorage on first render
  useEffect(() => {
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        setData(JSON.parse(savedDraft));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Auto-save to LocalStorage when data changes
  useEffect(() => {
    if (!isLoaded) return;

    setSaveStatus('saving');
    
    const handler = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(data));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, delay);

    return () => clearTimeout(handler);
  }, [data, isLoaded, storageKey, delay]);

  const clearDraft = () => {
    localStorage.removeItem(storageKey);
    setData(initialValue);
  };

  return { data, setData, isLoaded, saveStatus, clearDraft };
}