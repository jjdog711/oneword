# OneWord Expo App

This directory contains a starter Expo (React Native + TypeScript) implementation of the **OneWord** daily ritual app. The goal of this project is to provide a scaffold that can be extended into a full production client that talks to a Supabase backend and implements all of the business rules defined in the product spec.

## Getting Started

1. **Install dependencies** – In a normal development environment you would run:

   ```bash
   npm install
   ```

   However, note that package installation may be restricted in this environment. All of the source files are included here so you can inspect the structure.

2. **Configure environment variables** – Copy `.env.example` to `.env` and fill in your Supabase project URL, anon key, service role key, and the Expo push URL. Expo will expose variables prefixed with `EXPO_PUBLIC_` to your app at runtime.

3. **Start the development server** – Once dependencies are installed and env vars are configured, run:

   ```bash
   npx expo start -c
   ```

   You can then open the project in Expo Go on a physical device or run it in an emulator. The starter uses the Expo Router for navigation and Zustand for state management.

## Contents

* **`app/`** – Contains the route components for your screens. Tabs live in `app/(tabs)` and stack screens live in their respective directories.
* **`src/store/app.ts`** – A Zustand store that holds all client state. In this starter it simulates backend behavior locally, including auto‑reply from a “System Friend”. In a complete implementation this store should be replaced with calls to Supabase.
* **`src/lib/`** – Utility functions for time calculations, validation, and reveal status helpers.
* **`src/services/`** – Place shared service clients here. A `supabase.ts` module has been stubbed out to show how to initialize a client with environment variables.
* **`supabase/migrations/`** – SQL scripts for setting up your Supabase Postgres schema. `001_init.sql` contains the tables and indexes described in the spec.

## Next Steps

* Hook up authentication using Supabase Auth. Replace the local mock user with real user sessions.
* Replace the mock Zustand store with remote data fetching via Supabase RPC calls. Use React Query to manage server state and caching.
* Implement scheduled functions and edge functions in your Supabase project to handle burn‑if‑unread deletions and scheduled reveals.
* Add push notification logic using `expo-notifications` and your server functions.

The included files and docs are meant to bootstrap your development. Refer to the product specification and milestone checklist for a detailed breakdown of the remaining tasks.