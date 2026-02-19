// Canvas compositor for combining screen and webcam streams into a single video

export interface CompositorOptions {
  // Size of the webcam PiP overlay
  webcamWidth?: number;
  webcamHeight?: number;
  // Padding from the edge of the screen
  padding?: number;
  // Border radius for the webcam overlay
  borderRadius?: number;
  // Position of the webcam overlay
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  // Target framerate for the composite stream
  frameRate?: number;
}

const DEFAULT_OPTIONS: Required<CompositorOptions> = {
  webcamWidth: 320,
  webcamHeight: 240,
  padding: 20,
  borderRadius: 16,
  position: "bottom-right",
  frameRate: 5,
};

export class CanvasCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement | null = null;
  private webcamVideo: HTMLVideoElement | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private compositeStream: MediaStream | null = null;
  private options: Required<CompositorOptions>;
  private isRunning = false;

  constructor(options?: CompositorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas 2D context for compositor");
    }
    this.ctx = ctx;
  }

  // Create a composite stream from screen and webcam streams
  async createCompositeStream(
    screenStream: MediaStream,
    webcamStream: MediaStream
  ): Promise<MediaStream> {
    if (this.isRunning) {
      throw new Error("Compositor is already running");
    }

    // Get screen dimensions from the stream
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) {
      throw new Error("No video track in screen stream");
    }
    const screenSettings = screenTrack.getSettings();
    this.canvas.width = screenSettings.width || 1920;
    this.canvas.height = screenSettings.height || 1080;

    // Create video elements for both streams
    this.screenVideo = await this.createVideoElement(screenStream);
    this.webcamVideo = await this.createVideoElement(webcamStream);

    // Start the composite stream
    this.compositeStream = this.canvas.captureStream(this.options.frameRate);
    this.isRunning = true;

    // Start the rendering loop using setInterval instead of requestAnimationFrame
    // so that compositing continues when the browser tab is in the background
    // (candidates work in VS Code / other tabs most of the time)
    const intervalMs = Math.round(1000 / this.options.frameRate);
    this.intervalId = setInterval(() => this.renderFrame(), intervalMs);

    return this.compositeStream;
  }

  // Stop compositing and clean up
  stop(): void {
    this.isRunning = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.screenVideo) {
      this.screenVideo.pause();
      this.screenVideo.srcObject = null;
      this.screenVideo = null;
    }

    if (this.webcamVideo) {
      this.webcamVideo.pause();
      this.webcamVideo.srcObject = null;
      this.webcamVideo = null;
    }

    if (this.compositeStream) {
      this.compositeStream.getTracks().forEach((track) => track.stop());
      this.compositeStream = null;
    }
  }

  // Get the current composite stream
  getCompositeStream(): MediaStream | null {
    return this.compositeStream;
  }

  private async createVideoElement(
    stream: MediaStream
  ): Promise<HTMLVideoElement> {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
      video.onerror = () => reject(new Error("Failed to load video stream"));
      setTimeout(() => reject(new Error("Video load timeout")), 5000);
    });

    return video;
  }

  private renderFrame = (): void => {
    if (!this.isRunning) return;

    const { ctx, canvas } = this;

    // Draw the screen capture as the full background
    if (this.screenVideo) {
      ctx.drawImage(this.screenVideo, 0, 0, canvas.width, canvas.height);
    }

    // Draw the webcam overlay as PiP
    if (this.webcamVideo) {
      this.drawWebcamOverlay();
    }

    // Rendering is driven by setInterval in createCompositeStream()
  };

  private drawWebcamOverlay(): void {
    if (!this.webcamVideo) return;

    const { ctx, canvas, options } = this;
    const { webcamWidth, webcamHeight, padding, borderRadius, position } =
      options;

    // Calculate position
    let x: number;
    let y: number;

    switch (position) {
      case "bottom-right":
        x = canvas.width - webcamWidth - padding;
        y = canvas.height - webcamHeight - padding;
        break;
      case "bottom-left":
        x = padding;
        y = canvas.height - webcamHeight - padding;
        break;
      case "top-right":
        x = canvas.width - webcamWidth - padding;
        y = padding;
        break;
      case "top-left":
        x = padding;
        y = padding;
        break;
    }

    // Draw rounded rectangle clip path
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, webcamWidth, webcamHeight, borderRadius);
    ctx.clip();

    // Draw the webcam frame
    ctx.drawImage(this.webcamVideo, x, y, webcamWidth, webcamHeight);

    ctx.restore();

    // Draw a subtle border around the webcam overlay
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, webcamWidth, webcamHeight, borderRadius);
    ctx.stroke();
    ctx.restore();
  }
}
