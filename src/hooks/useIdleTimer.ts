/**
 * useIdleTimer
 * Detects user inactivity and triggers a callback after a timeout.
 *
 * - Listens to common interaction events and resets an internal timer
 * - When no events occur for `timeoutMs`, calls `onIdle()`
 * - Automatically cleans up listeners and timers on unmount
 */
import { useEffect, useRef } from "react";

type IdleEvents =
	| "mousemove"
	| "mousedown"
	| "keypress"
	| "scroll"
	| "touchstart"
	| "visibilitychange";

interface UseIdleTimerOptions {
	timeoutMs: number;
	onIdle: () => void;
	// When true, re-triggers on every idle period; when false, fires once
	repeat?: boolean;
}

export function useIdleTimer({ timeoutMs, onIdle, repeat = false }: UseIdleTimerOptions) {
	const timerRef = useRef<number | null>(null);
	const hasFiredRef = useRef(false);

	useEffect(() => {
		function clearTimer() {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		}

		function startTimer() {
			clearTimer();
			timerRef.current = window.setTimeout(() => {
				// Avoid duplicate fire unless repeat is enabled
				if (!repeat && hasFiredRef.current) return;
				hasFiredRef.current = true;
				onIdle();
			}, timeoutMs);
		}

		function resetTimer() {
			// If already fired and not repeating, ignore further resets
			if (hasFiredRef.current && !repeat) return;
			startTimer();
		}

		function handleVisibilityChange() {
			// When tab becomes visible again, reset timer
			if (document.visibilityState === "visible") {
				resetTimer();
			}
		}

		const events: IdleEvents[] = [
			"mousemove",
			"mousedown",
			"keypress",
			"scroll",
			"touchstart",
			"visibilitychange",
		];

		events.forEach((evt) => {
			if (evt === "visibilitychange") {
				document.addEventListener(evt, handleVisibilityChange, { passive: true });
			} else {
				window.addEventListener(evt, resetTimer, { passive: true });
			}
		});

		startTimer();

		return () => {
			clearTimer();
			events.forEach((evt) => {
				if (evt === "visibilitychange") {
					document.removeEventListener(evt, handleVisibilityChange);
				} else {
					window.removeEventListener(evt, resetTimer as any);
				}
			});
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timeoutMs, onIdle, repeat]);
}


