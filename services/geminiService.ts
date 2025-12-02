import { GoogleGenAI, FunctionDeclaration, Type, LiveSession } from "@google/genai";
import { GestureData } from "../types";

const FRAME_RATE = 2; // Throttle to 2 FPS for stability and quota
const JPEG_QUALITY = 0.5;

// Define the tool for the model to call
const updateGestureFunctionDeclaration: FunctionDeclaration = {
  name: 'updateGesture',
  parameters: {
    type: Type.OBJECT,
    description: 'Update the state of the hand gesture detected in the video stream.',
    properties: {
      isOpen: {
        type: Type.BOOLEAN,
        description: 'True if the hand is open (fingers spread), False if closed (fist) or resting.',
      },
      handX: {
        type: Type.NUMBER,
        description: 'The X coordinate of the hand center, normalized 0.0 to 1.0.',
      },
      handY: {
        type: Type.NUMBER,
        description: 'The Y coordinate of the hand center, normalized 0.0 to 1.0.',
      },
    },
    required: ['isOpen', 'handX', 'handY'],
  },
};

export class GeminiGestureService {
  private ai: GoogleGenAI;
  private session: LiveSession | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private intervalId: number | null = null;
  private onUpdate: (data: Partial<GestureData>) => void;

  constructor(onUpdate: (data: Partial<GestureData>) => void) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.onUpdate = onUpdate;
  }

  async start(videoElement: HTMLVideoElement) {
    this.videoEl = videoElement;
    this.canvasEl = document.createElement('canvas');

    try {
      this.session = await this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            this.startStreaming();
          },
          onmessage: (message) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'updateGesture') {
                    const args = fc.args as any;
                    this.onUpdate({
                        isOpen: args.isOpen,
                        x: args.handX,
                        y: args.handY
                    });
                    
                    // Respond to acknowledge
                    this.session?.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { result: "updated" }
                        }
                    });
                }
              }
            }
          },
          onclose: () => console.log("Gemini Live Closed"),
          onerror: (e) => console.error("Gemini Live Error", e),
        },
        config: {
            responseModalities: ["AUDIO"], // Required, but we mainly care about tool calls
            systemInstruction: `
            You are a real-time gesture controller for a luxury 3D art installation. 
            Analyze the video stream continuously.
            1. If you see an OPEN HAND (fingers splayed out), call updateGesture with isOpen=true.
            2. If you see a CLOSED HAND (fist) or just a normal resting hand, call updateGesture with isOpen=false.
            3. Track the center position of the hand. Map the X and Y coordinates to a normalized range of 0.0 to 1.0 relative to the frame.
            4. Be responsive. Call the function whenever the state changes or the hand moves significantly.
            `,
            tools: [{ functionDeclarations: [updateGestureFunctionDeclaration] }]
        }
      });
    } catch (error) {
      console.error("Failed to connect to Gemini", error);
    }
  }

  private startStreaming() {
    if (!this.videoEl || !this.canvasEl || !this.session) return;
    
    const ctx = this.canvasEl.getContext('2d');
    
    this.intervalId = window.setInterval(async () => {
      if (!this.videoEl || !this.canvasEl || !ctx) return;
      
      // Draw video frame to canvas
      this.canvasEl.width = this.videoEl.videoWidth * 0.5; // Scale down for performance
      this.canvasEl.height = this.videoEl.videoHeight * 0.5;
      ctx.drawImage(this.videoEl, 0, 0, this.canvasEl.width, this.canvasEl.height);

      const base64 = this.canvasEl.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
      
      this.session?.sendRealtimeInput({
        media: {
            mimeType: 'image/jpeg',
            data: base64
        }
      });

    }, 1000 / FRAME_RATE);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.session?.close();
    this.session = null;
  }
}

// Helper for Base64 (simple version as we use canvas.toDataURL)
async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64 = (reader.result as string).split(',')[1];
             resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}