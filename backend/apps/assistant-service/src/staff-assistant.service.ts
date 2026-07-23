import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

const DRIVER_SYSTEM = `You are the TransportOS Driver Assistant for intercity bus drivers in Pakistan.
Help with: route guidance, fatigue/rest reminders, fuel-efficiency tips, safety coaching, and how to report an incident.
Reply briefly in the driver's language (English, Urdu, or Roman Urdu). Be practical and safety-first.
Never give medical or legal advice; for emergencies tell them to contact dispatch/rescue 1122.`;

const MECHANIC_SYSTEM = `You are the TransportOS Mechanic Assistant for bus workshop technicians in Pakistan.
Help with: fault diagnosis from symptoms, likely causes, parts to check, and estimated repair effort.
Reply briefly in the mechanic's language. Always add a safety note when a fault affects brakes, steering, or tyres.
You are advisory only — a qualified technician must verify before the vehicle returns to service.`;

/**
 * Layer-1 personal AI assistants (blueprint lines 1023/1037): Driver AI and
 * Mechanic AI. Claude when configured, else a grounded rule-based responder so
 * they work live either way.
 */
@Injectable()
export class StaffAssistantService {
  private readonly logger = new Logger(StaffAssistantService.name);

  async chat(persona: 'driver' | 'mechanic', message: string, history: ChatMsg[] = []) {
    const via = await this.askClaude(persona, message, history);
    if (via) return { reply: via, poweredBy: 'claude' as const };
    return { reply: this.fallback(persona, message), poweredBy: 'rules' as const };
  }

  private async askClaude(persona: 'driver' | 'mechanic', message: string, history: ChatMsg[]): Promise<string | null> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    const system = persona === 'driver' ? DRIVER_SYSTEM : MECHANIC_SYSTEM;
    try {
      const res = await axios.post('https://api.anthropic.com/v1/messages',
        { model, max_tokens: 400, system, messages: [...history.slice(-6), { role: 'user', content: message }] },
        { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 20000 });
      return (res.data?.content?.[0]?.text ?? '').trim() || null;
    } catch (e: any) { this.logger.warn(`staff-assistant claude failed: ${e.message}`); return null; }
  }

  // ── Grounded fallback ───────────────────────────────────────────────
  private fallback(persona: 'driver' | 'mechanic', message: string): string {
    const m = message.toLowerCase();
    if (persona === 'driver') {
      if (/(fatigue|neend|tired|rest|thak|so gaya|sleep)/.test(m)) return 'Fatigue is a top safety risk. Take a 15–20 min break every 2–3 hours, and never drive if drowsy. If you feel sleepy, pull over safely and inform dispatch.';
      if (/(fuel|mileage|diesel|petrol|average|efficien)/.test(m)) return 'For better fuel efficiency: keep a steady speed (80–90 km/h on motorway), avoid harsh acceleration/braking, check tyre pressure daily, and switch off idling when stopped long.';
      if (/(route|traffic|jam|band|road|motorway|rasta)/.test(m)) return 'Check the live route on your app before departure. If the motorway is blocked, dispatch will suggest an alternative — always confirm the diversion with them before changing route.';
      if (/(incident|accident|breakdown|puncture|report|kharabi|haadsa)/.test(m)) return 'To report an incident: open the Driver app → Trip → Report, choose the type (incident/breakdown/expense), add a photo and note. For emergencies call rescue 1122 first, then dispatch.';
      if (/(speed|fast|tez|limit)/.test(m)) return 'Stay within the posted limit (motorway 100–120 km/h for buses as signed). Overspeeding is logged and affects your safety score.';
      return 'I can help with route guidance, rest/fatigue, fuel tips, safety, and incident reporting. For emergencies, contact dispatch or rescue 1122.';
    }
    // mechanic
    if (/(brake|braking|stop nahi|break)/.test(m)) return 'Brake issues — check pad wear, brake fluid level, and air in the lines. SAFETY: do not release the vehicle until braking is fully tested. Likely parts: pads, discs, or a leaking wheel cylinder.';
    if (/(overheat|garam|temperature|coolant|heat)/.test(m)) return 'Overheating — check coolant level, radiator for blockage/leaks, thermostat, and fan/belt. Inspect the water pump if it persists. Do not run the engine hot.';
    if (/(smoke|dhuan|exhaust|black|blue|white)/.test(m)) return 'Exhaust smoke: black = rich fuel/air-filter, blue = oil burning (rings/valve seals), white = coolant into combustion (head gasket). Check the matching system.';
    if (/(tyre|tire|puncture|wheel|balance)/.test(m)) return 'Tyre wear/vibration — check pressure, alignment, and balancing. SAFETY: replace any tyre below the legal tread or with sidewall damage before dispatch.';
    if (/(battery|start nahi|self|electric|light)/.test(m)) return 'No-start/electrical — check battery terminals & charge, alternator output, and fuses. A weak battery under load often reads OK at rest; test under cranking.';
    return 'Describe the symptom (e.g. brakes, overheating, smoke, tyres, no-start) and I’ll suggest likely causes and parts to check. A qualified technician must verify before return to service.';
  }
}
