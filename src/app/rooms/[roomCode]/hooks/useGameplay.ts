import { useState, useCallback } from 'react';

interface UseGameplayProps {
  roomCode: string;
  playerId: string | null;
  canGuess: boolean;
}

export function useGameplay({ roomCode, playerId, canGuess }: UseGameplayProps) {
  const [guessValue, setGuessValue] = useState('');
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);

  const handleGuessSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    if (!canGuess || !playerId || !guessValue.trim()) return;

    event.preventDefault();
    setIsSubmittingGuess(true);
    setGuessFeedback(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          guess: guessValue.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.correct) {
          setGuessFeedback('Correct! 🎉');
          setHasAnsweredCorrectly(true);
          setGuessValue('');
        } else {
          setGuessFeedback('Incorrect. Try again!');
        }
      } else {
        setGuessFeedback(result.message || 'Failed to submit guess');
      }
    } catch (error) {
      setGuessFeedback('Network error. Please try again.');
    } finally {
      setIsSubmittingGuess(false);
    }
  }, [canGuess, playerId, guessValue, roomCode]);

  const resetGuess = useCallback(() => {
    setGuessValue('');
    setGuessFeedback(null);
    setHasAnsweredCorrectly(false);
  }, []);

  return {
    guessValue,
    setGuessValue,
    guessFeedback,
    isSubmittingGuess,
    hasAnsweredCorrectly,
    handleGuessSubmit,
    resetGuess,
  };
}
