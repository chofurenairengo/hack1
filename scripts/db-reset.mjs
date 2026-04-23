import { execSync } from 'node:child_process';

execSync('supabase db reset', { stdio: 'inherit' });
