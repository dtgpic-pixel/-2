import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { CONTENT, AppState, TreeState } from '../types';
import { GeminiGestureService } from '../services/geminiService';

export const UI = () => {
  const { language, toggleLanguage, appState, setAppState, treeState, updateGestureData, gestureData } = useStore();
  const t = CONTENT[language];
  const videoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef<GeminiGestureService | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    // Initialize Gemini Service
    serviceRef.current = new GeminiGestureService((data) => {
        updateGestureData(data);
    });

    return () => {
        serviceRef.current?.stop();
    };
  }, [updateGestureData]);

  const handleStart = async () => {
    setAppState(AppState.INITIALIZING);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current!.play();
                setIsVideoReady(true);
                serviceRef.current?.start(videoRef.current!);
                setAppState(AppState.READY);
            };
        }
    } catch (e) {
        console.error("Camera access denied", e);
        setAppState(AppState.ERROR);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
      {/* Hidden Video for Analysis */}
      <video ref={videoRef} className="absolute opacity-0 pointer-events-none" playsInline muted />

      {/* Header */}
      <header className="w-full p-8 flex justify-between items-start pointer-events-auto">
        <div className="text-luxury-gold drop-shadow-lg">
          <h1 className="font-display text-5xl tracking-widest border-b-2 border-luxury-gold pb-2 mb-2">
            {t.title}
          </h1>
          <p className="font-serif italic text-luxury-gold-light tracking-widest text-sm">
            {t.subtitle}
          </p>
        </div>
        
        <button 
          onClick={toggleLanguage}
          className="border border-luxury-gold text-luxury-gold px-4 py-2 font-display hover:bg-luxury-gold hover:text-black transition-all duration-300"
        >
          {language} / {language === 'EN' ? 'CN' : 'EN'}
        </button>
      </header>

      {/* Error/Start Screen */}
      {appState !== AppState.READY && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto backdrop-blur-sm">
          <div className="text-center">
             {appState === AppState.ERROR ? (
                <div className="text-red-500 font-serif text-xl border border-red-500 p-6">
                    {t.cameraError}
                </div>
             ) : (
                <button 
                    onClick={handleStart}
                    className="group relative px-12 py-6 overflow-hidden border-2 border-luxury-gold text-luxury-gold font-display text-2xl tracking-widest transition-all duration-500 hover:scale-105"
                >
                    <span className="absolute inset-0 w-full h-full bg-luxury-gold/10 group-hover:bg-luxury-gold/20 transition-all"></span>
                    {appState === AppState.INITIALIZING ? t.loading : t.start}
                </button>
             )}
          </div>
        </div>
      )}

      {/* HUD / Indicators */}
      {appState === AppState.READY && (
        <div className="w-full p-8 flex flex-col items-center gap-4 text-center pointer-events-auto">
            {/* Debug/Feedback Visualization */}
            <div className="relative w-32 h-32 border border-luxury-gold/30 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-md">
                <div className="absolute top-2 text-luxury-gold/50 text-xs">SENSOR</div>
                <div 
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${gestureData.isOpen ? 'bg-red-500 shadow-[0_0_15px_red]' : 'bg-luxury-gold shadow-[0_0_15px_#D4AF37]'}`}
                    style={{
                        transform: `translate(${(gestureData.x - 0.5) * 50}px, ${(gestureData.y - 0.5) * 50}px)`
                    }}
                />
                <div className="absolute bottom-2 text-xs text-luxury-gold font-display">
                    {gestureData.isOpen ? "UNLEASHED" : "FORMED"}
                </div>
            </div>

            <div className="text-luxury-gold-light font-serif text-sm bg-black/40 px-6 py-2 border-l-2 border-r-2 border-luxury-gold/50">
                {t.instruction}
            </div>
        </div>
      )}

      {/* Decorative Corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-luxury-gold opacity-50"></div>
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-luxury-gold opacity-50"></div>
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-luxury-gold opacity-50"></div>
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-luxury-gold opacity-50"></div>
    </div>
  );
};