import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Trip } from '../../fleet-service/src/entities/trip.entity';

const SYSTEM_PROMPT = `You are the TransportOS booking assistant for Pakistan bus travel.
Reply concisely in the user's language (English, Urdu, or Roman Urdu).
When the user wants to find or book a bus, END your reply with a single line:
INTENT: {"origin":"<city>","destination":"<city>","date":"YYYY-MM-DD"}
Use tomorrow's date if none is given. Otherwise just answer helpfully.`;

const CITIES = ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'multan', 'faisalabad', 'peshawar', 'hyderabad', 'quetta', 'sialkot', 'gujranwala', 'sukkur'];

interface ChatMsg { role: 'user' | 'assistant'; content: string }

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(@InjectRepository(Trip) private readonly tripRepo: Repository<Trip>) {}

  private tomorrow(): string {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  /** Regex intent extraction — the fallback when no Claude key is configured. */
  private regexIntent(message: string): { origin?: string; destination?: string; date: string } {
    const m = message.toLowerCase();
    // "karachi to lahore" or "karachi se lahore"
    const found = CITIES.filter((c) => m.includes(c));
    let origin: string | undefined, destination: string | undefined;
    const toMatch = m.match(/([a-z]+)\s+(?:to|se)\s+([a-z]+)/);
    if (toMatch) {
      origin = CITIES.find((c) => c.startsWith(toMatch[1])) || (CITIES.includes(toMatch[1]) ? toMatch[1] : undefined);
      destination = CITIES.find((c) => c.startsWith(toMatch[2])) || (CITIES.includes(toMatch[2]) ? toMatch[2] : undefined);
    }
    if (!origin && found[0]) origin = found[0];
    if (!destination && found[1]) destination = found[1];
    return { origin, destination, date: this.tomorrow() };
  }

  /** Ask Claude (if configured) for a reply + optional INTENT line. */
  private async askClaude(message: string, history: ChatMsg[]): Promise<{ reply: string; intent?: any } | null> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    try {
      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model, max_tokens: 400, system: SYSTEM_PROMPT, messages: [...history.slice(-6), { role: 'user', content: message }] },
        { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 20000 },
      );
      const text: string = res.data?.content?.[0]?.text ?? '';
      const intentMatch = text.match(/INTENT:\s*(\{.*\})/);
      let intent;
      if (intentMatch) { try { intent = JSON.parse(intentMatch[1]); } catch { /* ignore */ } }
      return { reply: text.replace(/INTENT:\s*\{.*\}/, '').trim(), intent };
    } catch (e: any) {
      this.logger.warn(`Claude call failed, using fallback: ${e.message}`);
      return null;
    }
  }

  private async searchTrips(origin: string, destination: string, date: string) {
    return this.tripRepo.query(
      `SELECT t.id, t."departureTime", t."basePrice", r."originCity" AS origin, r."destinationCity" AS destination
       FROM trips t JOIN routes r ON r.id::text = t."routeId"
       WHERE lower(r."originCity") = lower($1) AND lower(r."destinationCity") = lower($2)
         AND t."departureTime"::date = $3::date
       ORDER BY t."departureTime" LIMIT 5`,
      [origin, destination, date],
    );
  }

  async chat(message: string, history: ChatMsg[] = []) {
    // Prefer Claude; fall back to regex NLU so the assistant works with no key.
    const claude = await this.askClaude(message, history);
    let reply = claude?.reply || '';
    const intent = claude?.intent || this.regexIntent(message);

    let trips: any[] = [];
    if (intent?.origin && intent?.destination) {
      trips = await this.searchTrips(intent.origin, intent.destination, intent.date || this.tomorrow());
      const line = trips.length
        ? `Found ${trips.length} bus(es) ${intent.origin} → ${intent.destination} on ${intent.date}. Tap one to book.`
        : `No buses found ${intent.origin} → ${intent.destination} on ${intent.date}. Try another date?`;
      reply = reply ? `${reply}\n${line}` : line;
    } else if (!reply) {
      reply = 'Assalam-o-alaikum! Tell me your route, e.g. "Karachi to Lahore tomorrow", and I\'ll find buses for you.';
    }

    return { reply, trips, intent, poweredBy: claude ? 'claude' : 'rules' };
  }

  /** Twilio-style WhatsApp webhook: reply as plain TwiML. */
  async whatsapp(body: any): Promise<string> {
    const message = body?.Body || body?.message || '';
    const { reply } = await this.chat(message, []);
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply.replace(/</g, '&lt;')}</Message></Response>`;
  }
}
