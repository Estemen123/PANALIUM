import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { RegisterUserInput, User } from "@/domain"

import { homeViewForRole, useNavigation } from "@/app/navigation"

import { fail, ok, type ActionResult } from "@/shared/lib/result"

import { apiFetch } from "@/shared/lib/api"

import { auth } from "@/shared/config/firebaseClient"

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth"

import { loadProductsFromBackend } from "@/features/products/api"

import { productsActions, useAppDispatch } from "@/store"

export type AuthResult = ActionResult

interface BackendProfile {
  email?: string

  displayName?: string

  phone?: string

  role?: User["role"]

  createdAt?: unknown

  avatar?: string

  /** Dirección de la smart account, que el backend crea al registrarse o al entrar. */

  wallet?: string | null
}

/** Forma laxa de un Timestamp de Firestore, que llega serializado de distintas maneras. */

interface TimestampLike {
  toDate?: () => Date

  _seconds?: number
}

interface BackendMeResponse {
  uid: string

  profile: BackendProfile | null
}

interface RegisterResponse {
  uid: string

  email: string

  role: User["role"]
}

interface AuthContextValue {
  user: User | null

  ready: boolean

  login: (email: string, password: string) => Promise<ActionResult>

  register: (
    input: RegisterUserInput & { password: string },
  ) => Promise<ActionResult>

  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toIsoDate(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value
  }

  if (!value || typeof value !== "object") {
    return new Date().toISOString()
  }

  const maybeTimestamp = value as TimestampLike

  if (typeof maybeTimestamp.toDate === "function") {
    return maybeTimestamp.toDate().toISOString()
  }

  if (typeof maybeTimestamp._seconds === "number") {
    return new Date(maybeTimestamp._seconds * 1000).toISOString()
  }

  return new Date().toISOString()
}

function mapFirebaseUser(
  firebaseUser: FirebaseUser,

  profile: BackendProfile | null,
): User {
  const effectiveProfile = profile ?? {}

  return {
    id: firebaseUser.uid,

    name: effectiveProfile.displayName || firebaseUser.displayName || "",

    email: effectiveProfile.email || firebaseUser.email || "",

    phone: effectiveProfile.phone || "",

    role: effectiveProfile.role || "buyer",

    wallet: { usdt: 0, bs: 0, address: effectiveProfile.wallet || "" },

    createdAt: toIsoDate(effectiveProfile.createdAt),

    verified: !!firebaseUser.emailVerified,

    avatar: effectiveProfile.avatar || firebaseUser.photoURL || undefined,
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { navigate, reset } = useNavigation()

  const dispatch = useAppDispatch()

  const [user, setUser] = useState<User | null>(null)

  const [ready, setReady] = useState(false)

  const signIn = useCallback(
    (u: User) => {
      setUser(u)

      navigate(homeViewForRole(u.role))
    },

    [navigate],
  )

  const hydrateSession = useCallback(
    async (firebaseUser: FirebaseUser) => {
      const token = await firebaseUser.getIdToken(true)

      let profile: BackendProfile | null = null

      try {
        const me = await apiFetch<BackendMeResponse>("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        profile = me.profile
      } catch (error) {
        console.warn("Failed to load backend profile", error)
      }

      try {
        const products = await loadProductsFromBackend(token)

        dispatch(productsActions.setAll(products))
      } catch (error) {
        console.warn("Failed to load backend products", error)

        dispatch(productsActions.setAll([]))
      }

      return mapFirebaseUser(firebaseUser, profile)
    },

    [dispatch],
  )

  const login = useCallback<AuthContextValue["login"]>(
    async (email, password) => {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,

          email,

          password,
        )

        const mapped = await hydrateSession(credential.user)

        signIn(mapped)

        return ok
      } catch (err: any) {
        const code = err?.code || ""

        console.warn("Firebase login error", code, err)

        if (typeof code === "string") {
          if (code.includes("wrong-password"))
            return fail("Contraseña incorrecta.")

          if (code.includes("user-not-found"))
            return fail("No existe una cuenta con ese correo.")

          if (code.includes("invalid-email"))
            return fail("Formato de correo inválido.")

          if (code.includes("user-disabled"))
            return fail("Cuenta deshabilitada. Contacta al soporte.")

          if (code.includes("invalid-credential"))
            return fail(
              "Credenciales inválidas. Intenta limpiar caché o revisar configuración.",
            )
        }

        return fail(err?.message || String(err))
      }
    },

    [hydrateSession, signIn],
  )

  const register = useCallback<AuthContextValue["register"]>(
    async (input) => {
      try {
        await apiFetch<RegisterResponse>(
          "/auth/register",

          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              email: input.email,

              password: (input as { password: string }).password,

              displayName: input.name,

              phone: input.phone,

              role: input.role,
            }),
          },
        )

        const credential = await signInWithEmailAndPassword(
          auth,

          input.email,

          (input as any).password,
        )

        await updateProfile(credential.user, { displayName: input.name })

        const mapped = await hydrateSession(credential.user)

        signIn(mapped)

        return ok
      } catch (err: any) {
        const code = err?.code || ""

        if (typeof code === "string" && code.includes("email-already-in-use")) {
          return fail(
            "El correo ya está registrado. Por favor inicia sesión o recupera la contraseña.",
          )
        }

        return fail(err?.message || String(err))
      }
    },

    [hydrateSession, signIn],
  )

  const logout = useCallback(() => {
    void signOut(auth)

    setUser(null)

    dispatch(productsActions.setAll([]))

    reset()
  }, [dispatch, reset])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)

        dispatch(productsActions.setAll([]))

        setReady(true)

        return
      }

      try {
        const mapped = await hydrateSession(firebaseUser)

        setUser(mapped)
      } catch (error) {
        console.warn("Failed to hydrate auth session", error)

        setUser(mapFirebaseUser(firebaseUser, null))
      } finally {
        setReady(true)
      }
    })

    return unsubscribe
  }, [dispatch, hydrateSession])

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),

    [user, ready, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)

  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")

  return ctx
}

/** Same as `useAuth` but guarantees a signed-in user; use inside protected screens. */

export function useCurrentUser(): User {
  const { user } = useAuth()

  if (!user) throw new Error("useCurrentUser requires an authenticated user")

  return user
}
