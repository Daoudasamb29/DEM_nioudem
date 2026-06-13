import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioBufferToWav } from '../utils/wavEncoder';

interface VoiceRecorderProps {
  onAudioRecorded: (blob: Blob | null, base64: string | null) => void;
}

export default function VoiceRecorder({ onAudioRecorded }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Clean elements on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startTimer = () => {
    setRecordingTime(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 59) {
          // Max 1 minute of voice message
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine fully supported mime type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Let's turn off all tracks in the input stream
        stream.getTracks().forEach((track) => track.stop());

        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        try {
          // Process raw blob to WAVE (.wav)
          const arrayBuffer = await rawBlob.arrayBuffer();
          
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const audioCtx = audioContextRef.current;
          
          // Decode raw compressed format into PCM Audio Buffer
          const decodedAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          
          // Encode to standard .wav
          const wavBlob = audioBufferToWav(decodedAudioBuffer);
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64withPrefix = reader.result as string;
            onAudioRecorded(wavBlob, base64withPrefix);
          };
          reader.readAsDataURL(wavBlob);

          const localUrl = URL.createObjectURL(wavBlob);
          setAudioUrl(localUrl);
        } catch (err: any) {
          console.error("Wav conversion failure, fallback to native format:", err);
          // Fallback to raw webm/ogg/mp4 recorded format if decoding fails
          const reader = new FileReader();
          reader.onloadend = () => {
            onAudioRecorded(rawBlob, reader.result as string);
          };
          reader.readAsDataURL(rawBlob);

          const localUrl = URL.createObjectURL(rawBlob);
          setAudioUrl(localUrl);
        }
      };

      // Start recording with slices
      mediaRecorder.start(250);
      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.error("Voice recording mic access blocked:", err);
      setError("Accès au microphone refusé. Veuillez autoriser le micro dans votre navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
    setIsRecording(false);
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    onAudioRecorded(null, null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider">
          Message vocal (Optionnel)
        </label>
        {isRecording && (
          <div className="flex items-center gap-1.5 animate-pulse">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
            <span className="text-[10px] text-red-600 font-black tracking-wider uppercase font-mono">Enregistrement...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="font-semibold leading-relaxed">{error}</span>
        </div>
      )}

      <div className="flex flex-col items-center justify-center p-2.5">
        <AnimatePresence mode="wait">
          {!audioUrl ? (
            <div key="recording-controls" className="flex flex-col items-center gap-2">
              {/* MICROPHONE ACCENT BUTTON */}
              <motion.button
                type="button"
                id="mic-action-btn"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-colors relative ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-[#F4841C] hover:bg-[#e47617] text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 animate-pulse" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
                
                {/* Visual feedback rings for recording */}
                {isRecording && (
                  <span className="absolute inset-0 rounded-full border-4 border-red-600 animate-ping opacity-60"></span>
                )}
              </motion.button>

              <span className="text-[11px] font-black tracking-wider font-mono text-slate-500 mt-1">
                {isRecording ? formatTime(recordingTime) : "Cliquez pour parler"}
              </span>
              
              <p className="text-[10px] text-slate-400 text-center leading-normal max-w-[250px]">
                {isRecording 
                  ? "Parlez clairement dans votre micro. Le message est limité à 1 minute." 
                  : "Besoin de préciser l'adresse ou des bagages ? Enregistrez un vocal."}
              </p>
            </div>
          ) : (
            <motion.div 
              key="playback-controls" 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full flex flex-col gap-3 items-center"
            >
              <div className="w-full flex items-center gap-3 bg-white border border-indigo-100 rounded-xl p-2.5 shadow-sm">
                <Volume2 className="w-5 h-5 text-[#F4841C] flex-shrink-0" />
                
                {/* Native HTML5 Audio customized visually in flexrow */}
                <audio 
                  src={audioUrl} 
                  controls 
                  className="w-full h-8 outline-none text-xs bg-transparent"
                  controlsList="nodownload"
                />
                
                <button
                  type="button"
                  onClick={deleteRecording}
                  aria-label="Effacer le message vocal"
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl py-1 px-3 flex items-center gap-1.5 self-center">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span className="text-[10px] font-bold text-emerald-800">Message vocal .WAV prêt</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
