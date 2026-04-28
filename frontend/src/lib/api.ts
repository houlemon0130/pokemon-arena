import type { CreateBattleResponse, PokemonDef } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchPokemonList(): Promise<PokemonDef[]> {
  return request<PokemonDef[]>("/api/pokemon");
}

export function fetchPokemonDetail(id: string): Promise<PokemonDef> {
  return request<PokemonDef>(`/api/pokemon/${id}`);
}

export function createBattle(
  player_active: string,
  player_bench: string[],
  opponent_team: string[],
): Promise<CreateBattleResponse> {
  return request<CreateBattleResponse>("/api/battles", {
    method: "POST",
    body: JSON.stringify({
      player_active_id: player_active,
      player_bench_ids: player_bench,
      opponent_team_ids: opponent_team,
    }),
  });
}
