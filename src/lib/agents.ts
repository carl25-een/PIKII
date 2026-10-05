import { supabase } from './supabase';
import type { Agent, Route, Zone } from './types';
import { must } from './use-async';

export type Directory = { routes: Route[]; agents: Agent[]; fees: Record<Zone, number>; byId: Record<string, Agent> };

// Routes, agent points and zone fees change rarely; screens load them once.
export async function loadDirectory(): Promise<Directory> {
  const [routes, agents, fees] = await Promise.all([
    supabase.from('routes').select('*').order('sort'),
    supabase.from('agents').select('*').eq('active', true).order('stop_order'),
    supabase.from('zone_fees').select('*'),
  ]);
  const agentList = must(agents) as Agent[];
  return {
    routes: must(routes) as Route[],
    agents: agentList,
    fees: Object.fromEntries((must(fees) as { zone: Zone; fee_tzs: number }[]).map((f) => [f.zone, f.fee_tzs])) as Record<Zone, number>,
    byId: Object.fromEntries(agentList.map((a) => [a.id, a])),
  };
}
