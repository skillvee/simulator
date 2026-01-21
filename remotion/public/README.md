# Audio Assets

This directory contains audio files used in the video generation.

## Required Files

| File | Description | Specifications |
|------|-------------|----------------|
| `music.mp3` | Background music track | 120-130 BPM, energetic, upbeat |
| `ping.mp3` | Message notification sound | Short, subtle notification tone |
| `whoosh.mp3` | Message send sound | Quick swoosh/send effect |
| `call-connect.mp3` | Call connection sound | Phone/video call connect tone |

## Where to Source

### Licensed Music Services (Recommended)

- **[Epidemic Sound](https://www.epidemicsound.com/)** - Subscription-based, great for video content
- **[Artlist](https://artlist.io/)** - Unlimited downloads with subscription
- **[Musicbed](https://www.musicbed.com/)** - Premium music licensing
- **[PremiumBeat](https://www.premiumbeat.com/)** - Shutterstock's music library

### Royalty-Free Options

- **[Pixabay](https://pixabay.com/music/)** - Free for commercial use
- **[Mixkit](https://mixkit.co/free-stock-music/)** - Free music and sound effects
- **[Uppbeat](https://uppbeat.io/)** - Free with attribution

### Sound Effects

- **[Freesound](https://freesound.org/)** - Community-contributed sounds (check licenses)
- **[Zapsplat](https://www.zapsplat.com/)** - Free sound effects
- **[SoundSnap](https://www.soundsnap.com/)** - Professional sound effects

## Audio Guidelines

### Background Music (`music.mp3`)
- **Tempo:** 120-130 BPM works well for energetic highlight reels
- **Genre:** Electronic, lo-fi, or upbeat corporate
- **Duration:** At least 3 minutes (video will loop or trim as needed)
- **Mood:** Professional but engaging, not distracting

### Sound Effects
- **Format:** MP3 or WAV (MP3 preferred for file size)
- **Quality:** 44.1kHz, 16-bit minimum
- **Duration:** Keep effects short (< 2 seconds)
- **Volume:** Normalize to similar levels

## Adding Files

1. Download your chosen audio files
2. Rename them to match the expected filenames above
3. Place them in this directory (`remotion/public/`)
4. The video composition will automatically use them

## Notes

- Audio files are gitignored to avoid licensing issues in the repository
- Each deployment should source its own licensed audio
- Test audio levels in the final video output
