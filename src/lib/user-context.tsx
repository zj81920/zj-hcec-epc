'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface UserInfo {
  name: string
}

const UserContext = createContext<{
  user: UserInfo
  setUser: (user: UserInfo) => void
} | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo>({ name: '管理员' })
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
