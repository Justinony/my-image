import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rfcnlzqtynhbwdujlnua.supabase.co'
const supabaseKey = 'sb_publishable_qB7FtZEoZL6NaLYQRLIUzg_iFXEHSxg' // from previous conversation context, wait, the key in the prompt is 'sb_publishable_...' actually let's read frontend/src/supabase.js

async function test() {
  const { data, error } = await supabase.from('accounts').select('*').limit(1)
  console.log('Accounts table check:', { data, error })
}
test()
