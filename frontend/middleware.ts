// frontend/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
 const res = NextResponse.next()
 const supabase = createMiddlewareClient({ req, res })
 const { data: { session } } = await supabase.auth.getSession()
 const path = req.nextUrl.pathname

 // Only protect routes that need auth
 if (!session && path.startsWith('/generate/edit')) {
   return NextResponse.redirect(new URL('/', req.url))
 }

 return res
}

export const config = {
 matcher: ['/generate/edit/:path*']
}
