import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

// ---------------------------------------------------------------------------
// In-memory game state store (single session — one game at a time)
// This is the canonical server-side snapshot Godot pushes after every turn.
// ---------------------------------------------------------------------------

export interface GameState {
  day: number;
  turnsLeft: number;
  proof: number;
  suspicion: number;
  trust: {
    commander: number;
    citizen: number;
    priest: number;
  };
  priestFear: number;
  citizenOfferedBlackmail: boolean;
  citizenAcceptedDirt: boolean;
  citizenEndorsedCommander: boolean;
  priestSpilledDirt: string[];
  status: string;
  updatedAt: number; // epoch ms
}

const DEFAULT_STATE: GameState = {
  day: 1,
  turnsLeft: 5,
  proof: 0,
  suspicion: 0,
  trust: { commander: 30, citizen: 50, priest: 30 },
  priestFear: 0,
  citizenOfferedBlackmail: false,
  citizenAcceptedDirt: false,
  citizenEndorsedCommander: false,
  priestSpilledDirt: [],
  status: "intro",
  updatedAt: 0,
};

// Module-level singleton (lives for the lifetime of the server process)
let currentState: GameState = { ...DEFAULT_STATE };

export const Route = createFileRoute("/api/state")({
  server: {
    handlers: {
      // -----------------------------------------------------------------------
      // GET /api/state  →  returns the latest game state snapshot
      // -----------------------------------------------------------------------
      GET: async () => {
        return Response.json(currentState, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      },

      // -----------------------------------------------------------------------
      // POST /api/state  →  Godot pushes the full state after each turn
      // -----------------------------------------------------------------------
      POST: async ({ request }: { request: Request }) => {
        let body: Partial<GameState>;
        try {
          body = (await request.json()) as Partial<GameState>;
        } catch {
          return new Response("bad json", { status: 400 });
        }

        // Merge incoming fields, always stamp updatedAt
        currentState = {
          ...currentState,
          ...body,
          trust: {
            ...currentState.trust,
            ...(body.trust ?? {}),
          },
          updatedAt: Date.now(),
        };

        return Response.json({ ok: true, updatedAt: currentState.updatedAt }, {
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      },
    },
  },
});
