import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface VideoPlayerProps {
  videoUrl: string;
  fileName: string;
}

export function VideoPlayer({ videoUrl, fileName }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // format time for display (mm:ss) this shit better work
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // handle play/pause the fucking core functionality
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // handle scrub bar where the magic happens, you wizard bastard
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // handle volume change don't blow your fucking speakers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  // handle mute toggle shut the hell up
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // handle fullscreen toggle go big or go home, you magnificent bastard
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // handle video click to toggle play/pause click this shit to play
  const handleVideoClick = () => {
    togglePlay();
  };

  // handle mouse movement to show/hide controls this fucking sucks but it works
  const handleMouseMove = () => {
    setShowControls(true);
    // hide controls after 3 seconds of no movement because fuck you, that's why
    setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // update current time and handle events the event listener hell
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return; // video element is being a little bitch

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // theme colors dark mode is superior, fight me
  const getBackgroundColor = () => {
    return theme === 'dark' ? 'bg-gray-900' : 'bg-gray-200';
  };

  const getBorderColor = () => {
    return theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  };

  const getAccentColor = () => {
    return theme === 'dark' ? '#6366f1' : '#6366f1';
  };

  const getAccentHoverColor = () => {
    return theme === 'dark' ? '#4f46e5' : '#4f46e5'; 
  };

  const getSliderTrackBgColor = () => {
    return theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.3)';
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${getBackgroundColor()} ${getBorderColor()} rounded-lg overflow-hidden`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* video element the star of the fucking show */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto cursor-pointer"
        onClick={handleVideoClick}
        preload="metadata"
      />

      {/* overlay controls where all the cool shit happens */}
      <div className={`absolute inset-0 transition-opacity duration-300 video-player-controls ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* file name overlay so you know what the hell you're watching */}
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/50 text-white text-sm font-medium`}>
          {fileName}
        </div>

        {/* center play button the big fucking button in the middle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="p-4 rounded-full transition-all text-white backdrop-blur-sm"
            style={{
              backgroundColor: `${getAccentColor()}80`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${getAccentHoverColor()}80`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${getAccentColor()}80`;
            }}
          >
            {isPlaying ? (
              <PauseIcon className="w-8 h-8" />
            ) : (
              <PlayIcon className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* bottom controls the control panel from hell */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* scrub bar drag this shit around */}
          <div className="w-full mb-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleScrub}
              className="video-scrub-bar w-full h-2 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${getAccentColor()} 0%, ${getAccentColor()} ${duration ? Math.min((currentTime / duration) * 100, 100) : 0}%, ${getSliderTrackBgColor()} ${duration ? Math.min((currentTime / duration) * 100, 100) : 0}%, ${getSliderTrackBgColor()} 100%)`
              }}
            />
          </div>

          {/* control buttons all the buttons that make this shit work */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* play/pause button the main event */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-full transition-colors text-white"
                style={{
                  backgroundColor: getAccentColor(),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentHoverColor();
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentColor();
                }}
              >
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
              </button>

              {/* time display so you know how much of your life you've wasted */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* volume controls don't wake the neighbors, you asshole */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="p-1 rounded transition-colors hover:bg-white/20 text-white"
                >
                  {isMuted ? (
                    <SpeakerXMarkIcon className="w-4 h-4" />
                  ) : (
                    <SpeakerWaveIcon className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="video-volume-slider w-16 h-1 appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${getAccentColor()} 0%, ${getAccentColor()} ${Math.min((isMuted ? 0 : volume) * 100, 100)}%, ${getSliderTrackBgColor()} ${Math.min((isMuted ? 0 : volume) * 100, 100)}%, ${getSliderTrackBgColor()} 100%)`
                  }}
                />
              </div>
            </div>

            {/* fullscreen button go big or go home, you screen hogging bastard */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded transition-colors hover:bg-white/20 text-white"
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 