    import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"

export const useAuthGuard = () => {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const checkedRef = useRef(false)

  useEffect(() => {
    // wait until auth finishes loading
    if (isPending) return

    // prevent double execution in React StrictMode
    if (checkedRef.current) return
    checkedRef.current = true

    // redirect if not logged in
    if (!session?.user) {
      toast.error("Please login to continue")
      navigate("/")
    }
  }, [isPending, session?.user])

  return { session, isPending }
}
