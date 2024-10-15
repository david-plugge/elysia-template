import postgres from 'postgres';
import { postgresConfig } from '../config';

export const database = postgres(postgresConfig);

export type Database = typeof database;
