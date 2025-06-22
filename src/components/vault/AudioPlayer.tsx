import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
}

export function AudioPlayer({ audioUrl, fileName }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { theme } = useTheme();

  // format time for display (mm:ss) this shit better work
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // handle play/pause the fucking core functionality
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // handle scrub bar where the magic happens, you audio wizard
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // handle volume change don't blow your fucking speakers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // handle mute toggle shut the hell up
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // update current time the event listener hell
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return; // audio element is being a little bitch

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // theme colors dark mode is superior, fight me
  const getBackgroundColor = () => {
    return theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200';
  };

  const getTextColor = () => {
    return theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
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
    return theme === 'dark' ? '#4b5563' : '#d1d5db';
  };

  return (
    <div className={`p-4 rounded-lg border ${getBackgroundColor()} ${getBorderColor()}`}>
      {/* file name so you know what the hell you're listening to */}
      <div className={`text-sm font-medium mb-3 ${getTextColor()}`}>
        {fileName}
      </div>

      {/* audio element the star of the fucking show */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* controls where all the cool shit happens */}
      <div className="flex items-center space-x-4 mb-3">
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
        <div className={`text-sm ${getTextColor()}`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* volume controls don't wake the neighbors, you asshole */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className={`p-1 rounded transition-colors ${
              theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-200 text-gray-600'
            }`}
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
            className={`w-16 h-1 appearance-none cursor-pointer`}
            style={{
              background: `linear-gradient(to right, ${getAccentColor()} 0%, ${getAccentColor()} ${Math.min((isMuted ? 0 : volume) * 100, 100)}%, ${getSliderTrackBgColor()} ${Math.min((isMuted ? 0 : volume) * 100, 100)}%, ${getSliderTrackBgColor()} 100%)`
            }}
          />
        </div>
      </div>

      {/* scrub bar drag this shit around */}
      <div className="w-full">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleScrub}
          className={`w-full h-2 appearance-none cursor-pointer`}
          style={{
            background: `linear-gradient(to right, ${getAccentColor()} 0%, ${getAccentColor()} ${duration ? Math.min((currentTime / duration) * 100, 100) : 0}%, ${getSliderTrackBgColor()} ${duration ? Math.min((currentTime / duration) * 100, 100) : 0}%, ${getSliderTrackBgColor()} 100%)`
          }}
        />
      </div>
    </div>
  );
} 