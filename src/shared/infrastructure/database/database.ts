import postgres from 'postgres';
import { postgresConfig } from '../config';

export const database = postgres(postgresConfig);

export type Database = typeof database;

await database`
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    username text NOT NULL
)
`;
await database`
CREATE TABLE IF NOT EXISTS posts (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    body text,
    date timestamp
)
`;
