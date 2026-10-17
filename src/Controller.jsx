import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { randomId } from "./id";

const BUTTONS = [
  ["triangle", "menu"],
  ["square", "attack"],
  ["circle", "defend"],
  ["cross", "interact"],
];

function PlayStationSymbol({ name }) {
  return (
    <svg className="ps-symbol" viewBox="0 0 100 100" aria-hidden="true">
      {name === "triangle" && <path d="M50 14 L86 80 H14 Z" />}
      {name === "square" && <rect x="19" y="19" width="62" height="62" rx="2" />}
      {name === "circle" && <circle cx="50" cy="50" r="33" />}
      {name === "cross" && <path d="M24 24 L76 76 M76 24 L24 76" />}
    </svg>
  );
}

export default function Controller() {
  const token = new URLSearchParams(location.search).get("token") || "";
  const [connected, setConnected] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [portrait, setPortrait] = useState(() => matchMedia("(orientation: portrait)").matches);
  const channel = useRef(null);
  const held = useRef(new Map());
  const joystick = useRef(null);
  const joystickPointer = useRef(null);
  const joystickDirection = useRef(null);
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!supabase || !token) return undefined;
    setRetrying(true);
    const updateConnection = () => {
      const presence = channel.current?.presenceState() || {};
      setConnected(
        Object.values(presence).flat().some((peer) => peer.role === "host"),
      );
    };
    const room = supabase.channel(`controller:${token}`, {
      config: { presence: { key: `controller-${randomId()}` } },
    });
    channel.current = room;
    room
      .on("presence", { event: "sync" }, updateConnection)
      .on("presence", { event: "join" }, updateConnection)
      .on("presence", { event: "leave" }, updateConnection)
      .subscribe(async (status) => {
        setRetrying(status !== "SUBSCRIBED");
        if (status === "SUBSCRIBED") await room.track({ role: "controller" });
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnected(false);
      });
    return () => {
      room.untrack();
      supabase.removeChannel(room);
      channel.current = null;
    };
  }, [token]);

  useEffect(() => {
    const orientation = matchMedia("(orientation: portrait)");
    const updateOrientation = async () => {
      setPortrait(orientation.matches);
      if (document.fullscreenElement) {
        try { await screen.orientation?.lock?.("landscape"); } catch {}
      }
    };
    orientation.addEventListener?.("change", updateOrientation);
    document.addEventListener("fullscreenchange", updateOrientation);
    return () => {
      orientation.removeEventListener?.("change", updateOrientation);
      document.removeEventListener("fullscreenchange", updateOrientation);
    };
  }, []);

  const send = useCallback((type, control) => {
    channel.current?.send({
      type: "broadcast",
      event: "control",
      payload: { type, control },
    });
  }, []);

  const press = (control) => (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    held.current.set(event.pointerId, control);
    send(["up", "down", "left", "right"].includes(control) ? "directionDown" : "buttonDown", control);
    navigator.vibrate?.(18);
  };
  const release = (event) => {
    event.preventDefault();
    const control = held.current.get(event.pointerId);
    if (!control) return;
    held.current.delete(event.pointerId);
    send(["up", "down", "left", "right"].includes(control) ? "directionUp" : "buttonUp", control);
  };

  const moveJoystick = (event) => {
    if (joystickPointer.current !== event.pointerId || !joystick.current) return;
    event.preventDefault();
    const rect = joystick.current.getBoundingClientRect();
    const radius = rect.width * 0.31;
    let x = event.clientX - (rect.left + rect.width / 2);
    let y = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    if (distance > radius) {
      x = (x / distance) * radius;
      y = (y / distance) * radius;
    }
    setStickPosition({ x, y });
    const threshold = radius * 0.2;
    let nextDirection = null;
    if (Math.hypot(x, y) >= threshold)
      nextDirection = Math.abs(x) > Math.abs(y) ? (x < 0 ? "left" : "right") : (y < 0 ? "up" : "down");
    if (nextDirection === joystickDirection.current) return;
    if (joystickDirection.current) send("directionUp", joystickDirection.current);
    joystickDirection.current = nextDirection;
    if (nextDirection) send("directionDown", nextDirection);
  };

  const startJoystick = (event) => {
    event.preventDefault();
    joystickPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveJoystick(event);
    navigator.vibrate?.(12);
  };

  const stopJoystick = (event) => {
    if (joystickPointer.current !== event.pointerId) return;
    event.preventDefault();
    if (joystickDirection.current) send("directionUp", joystickDirection.current);
    joystickDirection.current = null;
    joystickPointer.current = null;
    setStickPosition({ x: 0, y: 0 });
  };

  return (
    <main className="remote-controller" onContextMenu={(event) => event.preventDefault()}>
      <div className="remote-status" aria-live="polite">
        <i className={connected ? "online" : ""} />
        {connected ? "CONECTADO" : retrying ? "RECONECTANDO" : "DESCONECTADO"}
      </div>
      <section ref={joystick} className="joystick" aria-label="Joystick de movimento"
        onPointerDown={startJoystick} onPointerMove={moveJoystick} onPointerUp={stopJoystick}
        onPointerCancel={stopJoystick} onLostPointerCapture={stopJoystick}>
        <div className="joystick-ring" />
        <div className="joystick-knob" style={{ transform: `translate(calc(-50% + ${stickPosition.x}px), calc(-50% + ${stickPosition.y}px))` }}>
          <i />
        </div>
      </section>
      <section className="face-buttons" aria-label="Botões de ação">
        {BUTTONS.map(([name, control]) => (
          <button key={name} className={`face-${name}`} aria-label={control}
            onPointerDown={press(control)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
            <PlayStationSymbol name={name} />
          </button>
        ))}
      </section>
      {portrait && (
        <div className="portrait-lock" role="status">
          <span>↻</span>
          <strong>GIRE O CELULAR</strong>
        </div>
      )}
    </main>
  );
}
