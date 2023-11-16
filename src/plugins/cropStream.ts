import {
  HMSVideoPluginType,
  selectIsLocalVideoPluginPresent,
} from "@100mslive/hms-video-store";
import { HMSPluginSupportResult, HMSVideoPlugin } from "@100mslive/hms-video";
import { hmsActions, hmsStore } from "../hms";

type CropCoordinates = {
  x: number;
  y: number;
  height: number;
  width: number;
};

class CropVideoStreamPlugin implements HMSVideoPlugin {
  constructor(coordinates: CropCoordinates) {
    this.coordinates = coordinates;
  }

  coordinates: CropCoordinates = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  getName(): string {
    return "crop-video-stream-plugin";
  }

  async init() {
    console.log("initiated");
  }

  isSupported(): boolean {
    return (
      typeof window.MediaStreamTrackProcessor !== "undefined" &&
      typeof window.MediaStreamTrackGenerator !== "undefined"
    );
  }

  checkSupport(): HMSPluginSupportResult {
    let result = {} as HMSPluginSupportResult;
    result.isSupported = this.isSupported();
    return result;
  }

  getPluginType(): HMSVideoPluginType {
    return HMSVideoPluginType.ANALYZE;
  }

  async getImageFromVideoStream(stream: MediaStream) {
    const canvas = document.createElement("canvas");
    if ("ImageCapture" in window) {
      const videoTrack = stream.getVideoTracks()[0];
      const imageCapture = new window.ImageCapture(videoTrack);
      const bitmap = await imageCapture.grabFrame();
      canvas.height = bitmap.height;
      canvas.width = bitmap.width;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      return canvas.toDataURL();
    }
    const video = document.createElement("video");
    video.srcObject = stream;
    return new Promise((resolve, reject) => {
      video.addEventListener("loadeddata", async () => {
        const { videoWidth, videoHeight } = video;
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        try {
          await video.play();
          canvas
            .getContext("2d")
            .drawImage(video, 0, 0, videoWidth, videoHeight);
          return resolve(canvas.toDataURL());
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  getSampleAlignedCoordinates(point: number) {
    return point % 2 === 0 ? point : point - 1;
  }

  cropVideoFramesWithCoordinates(
    frame: VideoFrame,
    controller: TransformStreamDefaultController
  ) {
    const newFrame = new window.VideoFrame(frame, {
      visibleRect: {
        x: this.getSampleAlignedCoordinates(Math.round(this.coordinates.x)),
        y: this.getSampleAlignedCoordinates(Math.round(this.coordinates.y)),
        width: this.getSampleAlignedCoordinates(
          Math.round(this.coordinates.width)
        ),
        height: this.getSampleAlignedCoordinates(
          Math.round(this.coordinates.height)
        ),
      },
    });
    controller.enqueue(newFrame);
    frame.close();
  }

  generateStreamWithCoordinates(track: MediaStream): MediaStream {
    const mainTrack = track.getVideoTracks()[0] ?? track;
    const generator = new window.MediaStreamTrackGenerator({
      kind: "video",
    });
    const generatedStream = new window.MediaStream([generator]);
    const processor = new window.MediaStreamTrackProcessor({
      track: mainTrack,
    });

    processor.readable
      .pipeThrough(
        new window.TransformStream({
          transform: this.cropVideoFramesWithCoordinates,
        })
      )
      .pipeTo(generator.writable)
      .catch((err: any) => {
        // TODO: Figure out how to prevent this error
        console.log("pipe error: ", { err });
      });
    return generatedStream;
  }

  processVideoFrame(
    input: HTMLCanvasElement,
    output?: HTMLCanvasElement | undefined,
    skipProcessing?: boolean | undefined
  ): void | Promise<void> {
    console.log("processing video frame");
  }

  stop(): void {
    console.log("stop right away");
  }
}

export default CropVideoStreamPlugin;

export const toggleVideoStreamCropping = (coordinates: CropCoordinates) => {
  const myPlugin = new CropVideoStreamPlugin(coordinates);
  const pluginSupport = hmsActions.validateVideoPluginSupport(myPlugin);
  if (myPlugin.checkSupport().isSupported) {
    // myPlugin.init(); // optional, recommended if plugin implements it, you can show a loader here in the UI
    const isPluginAdded = hmsStore.getState(
      selectIsLocalVideoPluginPresent(myPlugin.getName())
    );
    if (!isPluginAdded) {
      hmsActions.addPluginToVideoTrack(myPlugin);
    } else {
      hmsActions.removePluginFromVideoTrack(myPlugin);
    }
  } else {
    const err = pluginSupport.errMsg;
    console.error(err);
  }

  return myPlugin;
};
