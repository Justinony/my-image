import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rfcnlzqtynhbwdujlnua.supabase.co'
const supabaseKey = 'sb_publishable_qB7FtZEoZL6NaLYQRLIUzg_iFXEHSxg'

export const supabase = createClient(supabaseUrl, supabaseKey)