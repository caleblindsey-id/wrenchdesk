'use client'

import { createContext, useContext, ReactNode } from 'react'
import { UserRole } from '@/types/database'

interface UserContextValue {
  id: string
  role: UserRole
  name: string
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  user,
  children,
}: {
  user: UserContextValue | null
  children: ReactNode
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser(): UserContextValue | null {
  return useContext(UserContext)
}
