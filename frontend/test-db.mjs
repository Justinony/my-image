import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rfcnlzqtynhbwdujlnua.supabase.co'
const supabaseKey = 'sb_publishable_qB7FtZEoZL6NaLYQRLIUzg_iFXEHSxg'

export const supabase = createClient(supabaseUrl, supabaseKey)
async function test() {
  const { error } = await supabase.from('saves').upsert({ account: 'test_user', config: { password: '123', hair: 'variant01' } })
  console.log('insert error:', error)
}
test()
