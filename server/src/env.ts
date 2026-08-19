import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') });

export const env = {
  TOMTOM_API_KEY: process.env.TOMTOM_API_KEY ?? '',
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
  ORS_API_KEY: process.env.ORS_API_KEY ?? '',
  FOURSQUARE_API_KEY: process.env.FOURSQUARE_API_KEY ?? '',
  PORT: Number(process.env.PORT ?? 4000),
};
