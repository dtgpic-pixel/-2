export enum AppState {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface GestureData {
  isOpen: boolean;
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export type Language = 'EN' | 'CN';

export interface Translations {
  title: string;
  subtitle: string;
  start: string;
  loading: string;
  cameraError: string;
  instruction: string;
}

export const CONTENT: Record<Language, Translations> = {
  EN: {
    title: "NGACHING",
    subtitle: "The Grand Luxury Collection",
    start: "INITIALIZE EXPERIENCE",
    loading: "PREPARING ASSETS...",
    cameraError: "CAMERA ACCESS REQUIRED FOR GESTURE CONTROL",
    instruction: "Open Hand: UNLEASH CHAOS | Closed Hand: FORM TREE | Move Hand: ROTATE VIEW"
  },
  CN: {
    title: "雅精致",
    subtitle: "奢华典藏系列",
    start: "启动体验",
    loading: "资源准备中...",
    cameraError: "需要摄像头权限以进行手势控制",
    instruction: "张开手掌: 释放混沌 | 握拳: 聚合成树 | 移动手部: 旋转视角"
  }
};