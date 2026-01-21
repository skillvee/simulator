import { Composition, Series } from "remotion";
import { Scene1Opening } from "./scenes/Scene1Opening";
import { Scene2CVUpload } from "./scenes/Scene2CVUpload";
import { Scene3HRInterview } from "./scenes/Scene3HRInterview";
import { Scene4SlackCollab } from "./scenes/Scene4SlackCollab";
import { Scene5SubmitPR } from "./scenes/Scene5SubmitPR";
import { Scene6Results } from "./scenes/Scene6Results";

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
    </>
  );
};
