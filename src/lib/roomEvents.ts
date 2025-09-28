import { EventEmitter } from "events";
import type { Room } from "@/lib/rooms";

export type RoomEvent = {
  type: "room:update" | "party:redirect" | "party:countdown" | "chat:message";
  room?: Room;
  countdown?: number;
  message?: any;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function eventKey(roomCode: string) {
  return `room:${roomCode}`;
}

export function publishRoomUpdate(room: Room) {
  emitter.emit(eventKey(room.code), {
    type: "room:update",
    room,
  } satisfies RoomEvent);
}

export function publishPartyRedirect(room: Room) {
  emitter.emit(eventKey(room.code), {
    type: "party:redirect",
    room,
  } satisfies RoomEvent);
}

export function publishPartyCountdown(room: Room, countdown: number) {
  emitter.emit(eventKey(room.code), {
    type: "party:countdown",
    room,
    countdown,
  } satisfies RoomEvent);
}

export function publishChatMessage(roomCode: string, message: any) {
  emitter.emit(eventKey(roomCode), {
    type: "chat:message",
    message,
  } satisfies RoomEvent);
}

export function subscribeToRoom(
  roomCode: string,
  listener: (event: RoomEvent) => void,
): () => void {
  const key = eventKey(roomCode);
  emitter.on(key, listener);

  return () => emitter.off(key, listener);
}
