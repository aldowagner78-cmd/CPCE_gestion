import { createBrowserClient } from '@supabase/ssr';
import { Database } from './src/types/supabase';

const sb = createBrowserClient<Database>('', '');
const q1 = sb.from('audits');
const q2 = sb.from('audit_requests');

// Check if the types resolve
type T1 = typeof q1;
type T2 = typeof q2;
