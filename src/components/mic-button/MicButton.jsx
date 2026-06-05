import React, { useRef, useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import "./mic-button.scss";

// Web Speech API - present on Chrome/Edge/Safari and Samsung Internet on
// phones; absent on most TV browsers (where there's also no recordable mic).
const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const MicButton = ({ onTranscript, onFinal }) => {
  // Feature detection: if the API isn't there, render nothing at all, so
  // devices that can't do voice search (TVs) never see a dead button.
  const [supported, setSupported] = useState(() => !!SpeechRecognition);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          /* no-op */
        }
      }
    };
  }, []);

  if (!supported) return null;

  const stop = () => {
    try {
      recognitionRef.current && recognitionRef.current.stop();
    } catch (e) {
      /* no-op */
    }
  };

  const start = () => {
    if (listening) {
      stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      if (onTranscript) onTranscript(transcript);
      if (isFinal && onFinal) onFinal(transcript.trim());
    };

    recognition.onerror = (event) => {
      setListening(false);
      switch (event.error) {
        case "no-speech":
          toast.error("Didn't catch that. Try again.");
          break;
        case "not-allowed":
        case "service-not-allowed":
          toast.error("Microphone access is blocked.");
          break;
        case "audio-capture":
          // No usable microphone on this device - hide the button for good.
          toast.error("No microphone available.");
          setSupported(false);
          break;
        case "aborted":
          break;
        default:
          toast.error("Voice search failed. Try again.");
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      className={`mic-button${listening ? " is-listening" : ""}`}
      aria-label={listening ? "Stop voice search" : "Search by voice"}
      title={listening ? "Listening… tap to stop" : "Search by voice"}
      onClick={start}
    >
      <i className={`bx ${listening ? "bxs-microphone" : "bx-microphone"}`} />
    </button>
  );
};

export default MicButton;
