'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Share2 } from 'lucide-react';
import { Button } from './Button';

interface Episode {
  id: string;
  title: string;
  audioUrl: string;
  audioDuration?: number;
  content: {
    description?: string;
    featuredImage?: string;
  };
  podcast: {
    podcastTitle: string;
  };
}

interface PodcastPlayerProps {
  episode: Episode;
  playlist?: Episode[];
  onPlay?: (episodeId: string) => void;
  onDownload?: (episodeId: string) => void;
  onShare?: (episodeId: string) => void;
}

export function PodcastPlayer({ 
  episode, 
  playlist = [], 
  onPlay, 
  onDownload, 
  onShare 
}: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);

  const currentEpisode = playlist.length > 0 ? playlist[currentEpisodeIndex] : episode;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (playlist.length > 0 && currentEpisodeIndex < playlist.length - 1) {
        // Auto-play next episode
        setCurrentEpisodeIndex(prev => prev + 1);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playlist.length, currentEpisodeIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
        onPlay?.(currentEpisode.id);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 15);
    }
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(duration, audio.currentTime + 15);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = (parseFloat(e.target.value) / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playEpisode = (index: number) => {
    setCurrentEpisodeIndex(index);
    setIsPlaying(false);
    // Audio will load new source and we can play it
    setTimeout(() => togglePlay(), 100);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <audio
        ref={audioRef}
        src={currentEpisode.audioUrl}
        preload="metadata"
      />

      {/* Episode Info */}
      <div className="flex items-start space-x-4 mb-6">
        {currentEpisode.content.featuredImage && (
          <img
            src={currentEpisode.content.featuredImage}
            alt={currentEpisode.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {currentEpisode.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentEpisode.podcast.podcastTitle}
          </p>
          {currentEpisode.content.description && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
              {currentEpisode.content.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          value={duration ? (currentTime / duration) * 100 : 0}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${duration ? (currentTime / duration) * 100 : 0}%, #e5e7eb ${duration ? (currentTime / duration) * 100 : 0}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipBackward}
            className="p-2"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={skipForward}
            className="p-2"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="p-2"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume * 100}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload?.(currentEpisode.id)}
            className="p-2"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare?.(currentEpisode.id)}
            className="p-2"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Playlist */}
      {playlist.length > 1 && (
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Playlist ({playlist.length} episodes)
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {playlist.map((ep, index) => (
              <div
                key={ep.id}
                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  index === currentEpisodeIndex
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => playEpisode(index)}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {index === currentEpisodeIndex && isPlaying ? (
                    <Pause className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <Play className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {ep.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {ep.audioDuration && formatTime(ep.audioDuration)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}