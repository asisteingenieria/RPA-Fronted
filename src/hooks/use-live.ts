/**
 * Monitor en vivo (D-032): streams SSE de /admin/live. Solo con la pestaña visible: al ocultarla
 * se cierran (el robot deja de transmitir su pantalla y la sesión no se mantiene viva sin nadie).
 */
import { useEffect, useState } from "react";
import { liveUrls, type LiveBoard, type LiveChat, type ScreenFrame } from "@/lib/api";

export type LiveState = "connecting" | "open" | "reconnecting" | "closed";

function useVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}

/**
 * EventSource con estados legibles. El navegador reconecta solo si se corta la red; si el servidor
 * responde con error (sesión vencida, sin permiso, chat inexistente) queda `closed` y `retry`
 * vuelve a abrirlo.
 */
function useEventSource(url: string | null, handlers: Record<string, (data: unknown) => void>) {
  const visible = useVisible();
  const [state, setState] = useState<LiveState>("connecting");
  const [attempt, setAttempt] = useState(0);
  const active = !!url && visible;

  useEffect(() => {
    if (!active || !url) return;
    setState("connecting");
    const es = new EventSource(url, { withCredentials: true });
    es.onopen = () => setState("open");
    es.onerror = () => setState(es.readyState === EventSource.CLOSED ? "closed" : "reconnecting");
    for (const [event, fn] of Object.entries(handlers)) {
      es.addEventListener(event, (e) => {
        try {
          fn(JSON.parse((e as MessageEvent<string>).data));
        } catch {
          // evento mal formado: se ignora
        }
      });
    }
    // El servidor corta el stream si la sesión venció o el usuario perdió el rol.
    es.addEventListener("end", () => {
      es.close();
      setState("closed");
    });
    return () => es.close();
    // Los handlers son setters estables; solo la URL, la visibilidad y el reintento reabren.
  }, [url, active, attempt]);

  return { state: active ? state : ("closed" as LiveState), paused: !visible, retry: () => setAttempt((n) => n + 1) };
}

/** Tablero de los robots y, con `chatId`, los mensajes de ese chat. */
export function useLiveStream(enabled: boolean, chatId: string | null) {
  const [board, setBoard] = useState<LiveBoard | null>(null);
  const [chat, setChat] = useState<LiveChat | null>(null);
  useEffect(() => setChat(null), [chatId]);
  const s = useEventSource(enabled ? liveUrls.stream(chatId) : null, {
    board: (d) => setBoard(d as LiveBoard),
    chat: (d) => setChat(d as LiveChat),
  });
  return { board, chat, ...s };
}

/** Pantalla de un robot: mientras esté abierta, el robot transmite. */
export function useScreenStream(robotUser: string | null) {
  const [frame, setFrame] = useState<ScreenFrame | null>(null);
  useEffect(() => setFrame(null), [robotUser]);
  const s = useEventSource(robotUser ? liveUrls.screen(robotUser) : null, {
    frame: (d) => setFrame(d as ScreenFrame),
  });
  return { frame, ...s };
}
