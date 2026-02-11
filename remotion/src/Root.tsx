import { Composition, Series } from "remotion";
import { Scene1Opening } from "./scenes/Scene1Opening";
import { Scene2CVUpload } from "./scenes/Scene2CVUpload";
import { Scene3HRInterview } from "./scenes/Scene3HRInterview";
import { Scene4SlackCollab } from "./scenes/Scene4SlackCollab";
import { Scene5SubmitPR } from "./scenes/Scene5SubmitPR";
import { Scene6Results } from "./scenes/Scene6Results";

// How It Works sections for homepage
import { HowItWorksStep1 } from "./scenes/HowItWorksStep1";
import { HowItWorksStep2 } from "./scenes/HowItWorksStep2";
import { HowItWorksStep3 } from "./scenes/HowItWorksStep3";

// Zoomed versions for better visibility
import { HowItWorksStep1Zoomed } from "./scenes/HowItWorksStep1Zoomed";
import { HowItWorksStep2Zoomed } from "./scenes/HowItWorksStep2Zoomed";
import { HowItWorksStep3Zoomed } from "./scenes/HowItWorksStep3Zoomed";

// Hero video for homepage
import { HeroVideo } from "./scenes/HeroVideo";

// Product page videos
import { ProductDemoVideo } from "./scenes/ProductDemoVideo";
import { ProductStep1 } from "./scenes/ProductStep1";
import { ProductStep2 } from "./scenes/ProductStep2";
import { ProductStep3 } from "./scenes/ProductStep3";

// Video configuration
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

// Scene durations in frames (at 30fps) - 60 seconds total
const SCENE_DURATIONS = {
  scene1Opening: 5 * FPS,     // 150 frames (5 seconds)
  scene2CVUpload: 8 * FPS,    // 240 frames (8 seconds)
  scene3HRInterview: 12 * FPS, // 360 frames (12 seconds)
  scene4SlackCollab: 15 * FPS, // 450 frames (15 seconds)
  scene5SubmitPR: 8 * FPS,    // 240 frames (8 seconds)
  scene6Results: 12 * FPS,    // 360 frames (12 seconds)
} as const;

// Total duration: 60 seconds = 1800 frames
const TOTAL_DURATION = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

// Full promo video composition using Series
const PromoVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.scene1Opening}>
        <Scene1Opening />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.scene2CVUpload}>
        <Scene2CVUpload />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.scene3HRInterview}>
        <Scene3HRInterview />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.scene4SlackCollab}>
        <Scene4SlackCollab />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.scene5SubmitPR}>
        <Scene5SubmitPR />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.scene6Results}>
        <Scene6Results />
      </Series.Sequence>
    </Series>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full promo video - 60 seconds */}
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Individual scene compositions for preview/testing */}
      <Composition
        id="Scene1Opening"
        component={Scene1Opening}
        durationInFrames={SCENE_DURATIONS.scene1Opening}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene2CVUpload"
        component={Scene2CVUpload}
        durationInFrames={SCENE_DURATIONS.scene2CVUpload}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene3HRInterview"
        component={Scene3HRInterview}
        durationInFrames={SCENE_DURATIONS.scene3HRInterview}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene4SlackCollab"
        component={Scene4SlackCollab}
        durationInFrames={SCENE_DURATIONS.scene4SlackCollab}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene5SubmitPR"
        component={Scene5SubmitPR}
        durationInFrames={SCENE_DURATIONS.scene5SubmitPR}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Scene6Results"
        component={Scene6Results}
        durationInFrames={SCENE_DURATIONS.scene6Results}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* How It Works - Step 1: Create Your Simulation (10 seconds) */}
      <Composition
        id="HowItWorksStep1"
        component={HowItWorksStep1}
        durationInFrames={10 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* How It Works - Step 2: Candidates Do Real Work (15 seconds) */}
      <Composition
        id="HowItWorksStep2"
        component={HowItWorksStep2}
        durationInFrames={15 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* How It Works - Step 3: Review Standardized Evidence (12 seconds) */}
      <Composition
        id="HowItWorksStep3"
        component={HowItWorksStep3}
        durationInFrames={12 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* ============================================
          ZOOMED VERSIONS - Better visibility for homepage
          ============================================ */}

      {/* How It Works Step 1 - Zoomed (10 seconds) */}
      <Composition
        id="HowItWorksStep1Zoomed"
        component={HowItWorksStep1Zoomed}
        durationInFrames={10 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* How It Works Step 2 - Zoomed (15 seconds) */}
      <Composition
        id="HowItWorksStep2Zoomed"
        component={HowItWorksStep2Zoomed}
        durationInFrames={15 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* How It Works Step 3 - Zoomed (12 seconds) */}
      <Composition
        id="HowItWorksStep3Zoomed"
        component={HowItWorksStep3Zoomed}
        durationInFrames={12 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* ============================================
          HERO VIDEO - 30 second loop for homepage hero
          ============================================ */}
      <Composition
        id="HeroVideo"
        component={HeroVideo}
        durationInFrames={30 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* ============================================
          PRODUCT PAGE VIDEOS
          ============================================ */}

      {/* Product Demo - 30 second overview for product hero */}
      <Composition
        id="ProductDemoVideo"
        component={ProductDemoVideo}
        durationInFrames={30 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Product Step 1: Gather Requirements (10 seconds) */}
      <Composition
        id="ProductStep1"
        component={ProductStep1}
        durationInFrames={10 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Product Step 2: Do the Actual Work (12 seconds) */}
      <Composition
        id="ProductStep2"
        component={ProductStep2}
        durationInFrames={12 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Product Step 3: Present and Defend (10 seconds) */}
      <Composition
        id="ProductStep3"
        component={ProductStep3}
        durationInFrames={10 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
