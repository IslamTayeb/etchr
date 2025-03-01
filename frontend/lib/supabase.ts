// frontend/lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient({
  options: {
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }
  }
})

export interface UserData {
  id: string
  github_id: string
  is_admin: boolean
  github_token?: string
  created_at: string
}

export async function updateUserGithubToken(userId: string, token: string) {
  const { error } = await supabase
    .from('users')
    .update({ github_token: token })
    .eq('id', userId)

  if (error) throw error
}

export async function getUser(userId: string): Promise<UserData | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getUserLimits(userId: string) {
  const { count: readmeCount } = await supabase
    .from('readme_generations')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)

  const { data: readmes } = await supabase
    .from('readme_generations')
    .select('id')
    .eq('user_id', userId)

  const readmeIds = readmes?.map(r => r.id) || []

  const { count: sectionCount } = await supabase
    .from('section_generations')
    .select('*', { count: 'exact' })
    .in('readme_id', readmeIds)

  return {
    readmeCount: readmeCount || 0,
    sectionCount: sectionCount || 0
  }
}

interface GithubData {
  user: {
    user_metadata: {
      provider_id: string;
    }
  };
  provider_token: string;
}

export async function storeGithubSession(userId: string, githubData: GithubData) {
  const { error } = await supabase
    .from('users')
    .upsert({
      id: userId,
      github_id: githubData.user.user_metadata.provider_id,
      github_token: githubData.provider_token,
      created_at: new Date().toISOString()
    })

  if (error) throw error
}
