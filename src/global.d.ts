export {};

declare global {
  interface Window {
    MediaStreamTrackProcessor?: any;
    MediaStreamTrackGenerator?: any;
    ImageCapture?: any;
    TransformStream?: any;
    MediaStream?: any
  }
}
