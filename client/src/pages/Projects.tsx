import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { Project } from "../types"
import {
  ArrowBigDownDashIcon,
  Loader2Icon,
  SaveIcon,
  EyeIcon,
  GlobeIcon,
} from "lucide-react"

import Sidebar from "../components/Sidebar"
import ProjectPreview, { type ProjectPreviewRef } from "../components/ProjectPreview"
import api from "@/configs/axios"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"

const Projects = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // ⭐ fixes Better-Auth session flicker
  const [sessionResolved, setSessionResolved] = useState(false)

  const previewRef = useRef<ProjectPreviewRef>(null)
  const authCheckedRef = useRef(false)

  // ================= FETCH PROJECT =================
  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/api/user/project/${projectId}`)
      setProject(data.project)
      setIsGenerating(!data.project.current_code)
      setLoading(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
    }
  }

  // ================= SAVE PROJECT =================
  const saveProject = async () => {
    if (!previewRef.current) return
    const code = previewRef.current.getCode()
    if (!code) return

    setIsSaving(true)
    try {
      const { data } = await api.put(`/api/project/save/${projectId}`, { code })
      toast.success(data.message)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ================= DOWNLOAD CODE =================
  const downloadCode = () => {
    const code = previewRef.current?.getCode() || project?.current_code
    if (!code) return

    const blob = new Blob([code], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "index.html"
    a.click()
    URL.revokeObjectURL(url)
  }

  // ================= PUBLISH TOGGLE =================
  const togglePublish = async () => {
    try {
      const { data } = await api.get(`/api/user/publish-toggle/${projectId}`)
      toast.success(data.message)

      setProject(prev =>
        prev ? { ...prev, isPublished: !prev.isPublished } : null
      )
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
    }
  }

  // ================= OPEN PUBLIC PREVIEW =================
  const openPreview = () => {
    if (!project?.isPublished) {
      toast.error("Publish project first")
      return
    }
    window.open(`/preview/${project.id}`, "_blank")
  }

  // ⭐ Wait until auth finishes loading
  useEffect(() => {
    if (!isPending) setSessionResolved(true)
  }, [isPending])

  // ⭐ Safe auth guard
  useEffect(() => {
    if (!sessionResolved) return
    if (authCheckedRef.current) return
    authCheckedRef.current = true

    if (!session?.user) {
      toast.error("Please login to view your projects")
      navigate("/")
      return
    }

    fetchProject()
  }, [sessionResolved, session?.user])

  // ================= POLLING =================
  useEffect(() => {
    if (!project || project.current_code) return
    const interval = setInterval(fetchProject, 10000)
    return () => clearInterval(interval)
  }, [project?.current_code])

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2Icon className="animate-spin text-white" />
      </div>
    )
  }

  // ================= UI =================
  return project ? (
    <div className="flex flex-col h-screen w-full bg-gray-900 text-white">

      {/* HEADER */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-800">
        <img
          src="/favicon.svg"
          className="h-6 cursor-pointer"
          onClick={() => navigate("/")}
        />

        <div className="flex-1">
          <p className="text-sm font-semibold">{project.name}</p>
          <p className="text-xs text-gray-400">Previewing last saved version</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveProject}
            className="bg-gray-700 px-4 py-1.5 rounded flex items-center gap-2"
          >
            {isSaving
              ? <Loader2Icon className="animate-spin" size={16} />
              : <SaveIcon size={16} />}
            Save
          </button>

          <button
            onClick={openPreview}
            className="bg-gray-700 px-4 py-1.5 rounded flex items-center gap-2"
          >
            <EyeIcon size={16}/> Preview
          </button>

          <button
            onClick={downloadCode}
            className="bg-blue-600 px-4 py-1.5 rounded flex items-center gap-2"
          >
            <ArrowBigDownDashIcon size={16}/> Download
          </button>

          <button
            onClick={togglePublish}
            className={`px-4 py-1.5 rounded flex items-center gap-2 ${
              project.isPublished ? "bg-purple-700" : "bg-purple-600"
            }`}
          >
            <GlobeIcon size={16}/>
            {project.isPublished ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-auto">
        <Sidebar
          isMenuOpen={isMenuOpen}
          project={project}
          setProject={setProject}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          togglePublish={togglePublish}
        />

        <div className="flex-1 p-2">
          <ProjectPreview
            ref={previewRef}
            project={project}
            isGenerating={isGenerating}
            device="desktop"
          />
        </div>
      </div>
    </div>
  ) : null
}

export default Projects
