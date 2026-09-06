import { useEffect, useRef } from "react";

import { normalizeScannedBarcode } from "@/lib/barcode-display";



export { normalizeScannedBarcode };



/** USB HID scanners type quickly; allow up to 120ms between keys before starting a new code. */

const SCAN_INTER_KEY_MS = 120;

/** Auto-submit when scanner does not send Enter/Tab (common wedge configuration). */

const SCAN_IDLE_FLUSH_MS = 300;

const MIN_BARCODE_LENGTH = 3;



const POS_SCANNER_INPUT_ID = "pos-barcode-input";



function isTypingTarget(target: EventTarget | null): boolean {

  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;

  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;

  return target.isContentEditable;

}



function isScannerCaptureInput(target: EventTarget | null): boolean {

  return target instanceof HTMLElement && target.id === POS_SCANNER_INPUT_ID;

}



/**

 * Captures keyboard-wedge barcode scans anywhere on the page (when enabled).

 * The dedicated #pos-barcode-input field handles its own scans when focused.

 * Rapid keystrokes into other inputs (e.g. search) are intercepted — controlled

 * React inputs cannot keep up with wedge speed.

 */

export function useBarcodeScanner(

  enabled: boolean,

  onScan: (code: string) => void,

  onPartial?: (buffer: string) => void

) {

  const onScanRef = useRef(onScan);

  onScanRef.current = onScan;

  const onPartialRef = useRef(onPartial);

  onPartialRef.current = onPartial;

  const bufferRef = useRef("");

  const lastKeyRef = useRef(0);

  const idleFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {

    if (!enabled) return;



    const clearIdleFlush = () => {

      if (idleFlushRef.current) {

        clearTimeout(idleFlushRef.current);

        idleFlushRef.current = null;

      }

    };



    const notifyPartial = () => {

      onPartialRef.current?.(bufferRef.current);

    };



    const flush = (e?: KeyboardEvent) => {

      clearIdleFlush();

      const raw = bufferRef.current.trim();

      bufferRef.current = "";

      onPartialRef.current?.("");

      const code = normalizeScannedBarcode(raw);

      if (code.length >= MIN_BARCODE_LENGTH) {

        e?.preventDefault();

        e?.stopPropagation();

        onScanRef.current(code);

      }

    };



    const scheduleIdleFlush = () => {

      clearIdleFlush();

      idleFlushRef.current = setTimeout(() => flush(), SCAN_IDLE_FLUSH_MS);

    };



    const onKeyDown = (e: KeyboardEvent) => {

      const target = e.target as HTMLElement | null;



      // Uncontrolled scanner field handles wedge input itself when focused.

      if (isScannerCaptureInput(target)) return;



      if (e.key === "Enter" || e.key === "Tab") {

        if (bufferRef.current) {

          flush(e);

        }

        return;

      }



      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;



      const now = Date.now();

      const gap = now - lastKeyRef.current;

      lastKeyRef.current = now;

      const rapid = gap < SCAN_INTER_KEY_MS;

      const inTextField = isTypingTarget(target);



      if (inTextField) {

        if (rapid || bufferRef.current.length > 0) {

          e.preventDefault();

          if (!rapid && bufferRef.current.length > 0) {

            bufferRef.current = "";

          }

          bufferRef.current += e.key;

          notifyPartial();

          scheduleIdleFlush();

        } else {

          bufferRef.current = "";

          onPartialRef.current?.("");

          clearIdleFlush();

        }

        return;

      }



      if (!rapid && bufferRef.current.length > 0) {

        bufferRef.current = "";

      }

      bufferRef.current += e.key;

      notifyPartial();

      scheduleIdleFlush();

    };



    window.addEventListener("keydown", onKeyDown, true);

    return () => {

      window.removeEventListener("keydown", onKeyDown, true);

      clearIdleFlush();

    };

  }, [enabled]);

}

