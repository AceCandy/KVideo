import { useCallback, useEffect, useMemo } from 'react';

interface UseVolumeControlsProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    volumeBarRef: React.RefObject<HTMLDivElement | null>;
    volume: number;
    isMuted: boolean;
    setVolume: (volume: number) => void;
    setIsMuted: (muted: boolean) => void;
    setShowVolumeBar: (show: boolean) => void;
    volumeBarTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
    isDraggingVolumeRef: React.MutableRefObject<boolean>;
}

export function useVolumeControls({
    videoRef,
    volumeBarRef,
    volume,
    isMuted,
    setVolume,
    setIsMuted,
    setShowVolumeBar,
    volumeBarTimeoutRef,
    isDraggingVolumeRef
}: UseVolumeControlsProps) {
    const toggleMute = useCallback(() => {
        if (!videoRef.current) return;
        if (isMuted) {
            videoRef.current.muted = false;
            videoRef.current.volume = volume || 0.5;
            setIsMuted(false);
            localStorage.setItem('kvideo-muted', 'false');
        } else {
            videoRef.current.muted = true;
            setIsMuted(true);
            localStorage.setItem('kvideo-muted', 'true');
        }
    }, [videoRef, isMuted, volume, setIsMuted]);

    // Value-based volume setter used by keyboard interaction (DesktopVolumeControl onKeyDown).
    const setVolumeTo = useCallback((v: number) => {
        if (!videoRef.current) return;
        const pos = Math.max(0, Math.min(1, v));
        setVolume(pos);
        videoRef.current.volume = pos;
        videoRef.current.muted = pos === 0;
        setIsMuted(pos === 0);
        localStorage.setItem('kvideo-volume', String(pos));
        localStorage.setItem('kvideo-muted', String(pos === 0));
    }, [videoRef, setVolume, setIsMuted]);

    const showVolumeBarTemporarily = useCallback(() => {
        setShowVolumeBar(true);
        if (volumeBarTimeoutRef.current) {
            clearTimeout(volumeBarTimeoutRef.current);
        }
        volumeBarTimeoutRef.current = setTimeout(() => {
            setShowVolumeBar(false);
        }, 1000);
    }, [setShowVolumeBar, volumeBarTimeoutRef]);

    const handleVolumeChange = useCallback((e: any) => {
        if (!videoRef.current || !volumeBarRef.current) return;
        const rect = volumeBarRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setVolume(pos);
        videoRef.current.volume = pos;
        videoRef.current.muted = pos === 0;
        setIsMuted(pos === 0);
        localStorage.setItem('kvideo-volume', String(pos));
        localStorage.setItem('kvideo-muted', String(pos === 0));
    }, [videoRef, volumeBarRef, setVolume, setIsMuted]);

    const handleVolumeMouseDown = useCallback((e: any) => {
        e.preventDefault();
        isDraggingVolumeRef.current = true;
        handleVolumeChange(e);
    }, [isDraggingVolumeRef, handleVolumeChange]);

    useEffect(() => {
        const handleVolumeMouseMove = (e: MouseEvent) => {
            if (!isDraggingVolumeRef.current || !volumeBarRef.current || !videoRef.current) return;
            e.preventDefault();
            const rect = volumeBarRef.current.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setVolume(pos);
            videoRef.current.volume = pos;
            videoRef.current.muted = pos === 0;
            setIsMuted(pos === 0);
            localStorage.setItem('kvideo-volume', String(pos));
            localStorage.setItem('kvideo-muted', String(pos === 0));
        };

        const handleMouseUp = () => {
            if (isDraggingVolumeRef.current) {
                isDraggingVolumeRef.current = false;
            }
        };

        document.addEventListener('mousemove', handleVolumeMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleVolumeMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingVolumeRef, volumeBarRef, videoRef, setVolume, setIsMuted]);

    const volumeActions = useMemo(() => ({
        toggleMute,
        showVolumeBarTemporarily,
        handleVolumeChange,
        handleVolumeMouseDown,
        setVolumeTo
    }), [toggleMute, showVolumeBarTemporarily, handleVolumeChange, handleVolumeMouseDown, setVolumeTo]);

    return volumeActions;
}
