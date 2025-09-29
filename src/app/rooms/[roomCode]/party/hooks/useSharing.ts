import { useState, useCallback, useEffect } from 'react';

export function useSharing(roomCode: string) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/rooms/${roomCode}`);
    }
  }, [roomCode]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy room code', error);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2500);
    }
  }, [roomCode]);

  const handleShareCopy = useCallback(() => {
    void handleCopyCode();
  }, [handleCopyCode]);

  return {
    shareUrl,
    copyState,
    handleCopyCode,
    handleShareCopy,
  };
}
