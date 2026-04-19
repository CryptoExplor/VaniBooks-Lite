import { useState, useRef, type KeyboardEvent } from "react";

// Web Speech API — not fully typed in TS DOM lib, declare locally
interface SpeechRecognitionResult {
  readonly 0: { transcript: string };
}
interface SpeechRecognitionResultList {
  readonly 0: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface InputBarProps {
  onSubmit: (value: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function InputBar({ onSubmit, isLoading, error }: InputBarProps) {
  const [value, setValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const handleSubmit = (text?: string) => {
    const input = (text ?? value).trim();
    if (!input || isLoading) return;
    onSubmit(input);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startVoice = () => {
    const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setValue(transcript);
      setIsListening(false);
      handleSubmit(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-expense font-body">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2 max-w-2xl mx-auto">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type anything... 'Paid 5000 rent' or 'Create invoice for Ramesh'"
          rows={2}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl border border-border bg-bg px-4 py-3 text-sm font-body text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50 transition-colors"
        />

        {/* Voice button */}
        <button
          onClick={startVoice}
          disabled={isLoading}
          title={isListening ? "Stop listening" : "Voice input"}
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 ${
            isListening
              ? "bg-accent text-white animate-pulse"
              : "bg-bg border border-border text-muted hover:text-accent hover:border-accent"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
            <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.07A7 7 0 0 0 19 10Z" />
          </svg>
        </button>

        {/* Submit button */}
        <button
          onClick={() => handleSubmit()}
          disabled={isLoading || !value.trim()}
          className="flex-shrink-0 w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {isLoading ? (
            <svg
              className="w-5 h-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
            </svg>
          )}
        </button>
      </div>
      {isListening && (
        <p className="text-center text-xs text-accent font-body mt-2 animate-pulse">
          Listening... speak now
        </p>
      )}
    </div>
  );
}
