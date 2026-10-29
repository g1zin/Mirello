import type { Bridge } from '../shared/model';
declare global {
  interface Window {
    grello: Bridge;
  }
}

/// <reference types="vite/client" />
