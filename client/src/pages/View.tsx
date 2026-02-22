import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Loader2Icon } from "lucide-react"
import api from "@/configs/axios"
import { toast } from "sonner"

const View = () => {
  const { projectId } = useParams()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [blobUrl, setBlobUrl] = useState("")

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/api/project/published/${projectId}`)
      setCode(data.project.current_code)
      setLoading(false)
    } catch (error: any) {
      toast.error("Project not found")
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [])

  // ⭐ Convert HTML → Blob URL (FINAL SAFE SOLUTION)
  useEffect(() => {
    if (!code) return

    let finalHTML = code.includes("<html")
      ? code
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>body{margin:0}</style>
        </head>
        <body>${code}</body>
        </html>
      `

    const blob = new Blob([finalHTML], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [code])

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2Icon className="animate-spin text-white" />
      </div>
    )

  return (
    <iframe
      src={blobUrl}
      className="w-screen h-screen border-0"
    />
  )
}

export default View
