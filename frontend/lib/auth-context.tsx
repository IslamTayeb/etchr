import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, UserData, getUserLimits } from './supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: UserData | null
  loading: boolean
  limits: {
    readmeCount: number
    sectionCount: number
  } | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  limits: null
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [limits, setLimits] = useState<AuthContextType['limits']>(null)

  const validateGithubToken = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.ok
    } catch {
      return false
    }
  }

  const fetchUserData = async (supabaseUser: User) => {
    try {
      const { data: authData } = await supabase.auth.getSession()
      if (!authData?.session?.provider_token) return

      // First create/update user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: supabaseUser.id,
          github_id: supabaseUser.user_metadata.provider_id,
          github_token: authData.session.provider_token,
          email: supabaseUser.email,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .single()

      if (userError) throw userError

      // Validate token after storing
      const isValid = await validateGithubToken(authData.session.provider_token)
      if (!isValid) {
        await supabase
          .from('users')
          .update({ github_token: null })
          .eq('id', supabaseUser.id)
        return
      }

      const userLimits = await getUserLimits(supabaseUser.id)
      setUser(userData)
      setLimits(userLimits)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserData(session.user)
      }
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserData(session.user)
      } else {
        setUser(null)
        setLimits(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, limits }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
