import React, {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
} from "react"
import type { Project } from "../types"
import { iframeScript } from "../assets/assets"
import EditorPanel from "./EditorPanel"
import LoaderSteps from "./LoaderSteps"

interface ProjectPreviewProps {
  project: Project
  isGenerating: boolean
  device?: "phone" | "tablet" | "desktop"
  showEditorPanel?: boolean
}

export interface ProjectPreviewRef {
  getCode: () => string | undefined
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(
  ({ project, isGenerating, device = "desktop", showEditorPanel = true }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [selectedElement, setSelectedElement] = useState<any>(null)
    const [blobUrl, setBlobUrl] = useState<string>("")

    const resolutions = {
      phone: "w-[412px]",
      tablet: "w-[768px]",
      desktop: "w-full",
    }

    // ⭐ inject editor script into generated HTML
    const injectPreview = (html: string) => {
      if (!html) return ""

      if (!showEditorPanel) return html

      if (html.includes("</body>")) {
        return html.replace("</body>", iframeScript + "</body>")
      }

      return html + iframeScript
    }

    // ⭐ Convert HTML → Blob URL (FINAL SOLUTION)
   // ⭐ Convert HTML → Blob URL + silence iframe errors
useEffect(() => {
  if (!project.current_code) return

  const injectedHTML = injectPreview(project.current_code)

  // 🔇 stop console errors coming from generated sites
  const safeHTML =
    `<script>
        window.onerror = () => true;
        console.error = () => {};
     </script>` + injectedHTML

  const blob = new Blob([safeHTML], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  setBlobUrl(url)

  return () => URL.revokeObjectURL(url)
}, [project.current_code])

    // ⭐ expose clean HTML to parent (Save button)
    useImperativeHandle(ref, () => ({
      getCode: () => {
        const doc = iframeRef.current?.contentDocument
        if (!doc) return undefined

        doc
          .querySelectorAll(".ai-selected-element,[data-ai-selected]")
          .forEach((el) => {
            el.classList.remove("ai-selected-element")
            el.removeAttribute("data-ai-selected")
            ;(el as HTMLElement).style.outline = ""
          })

        doc.getElementById("ai-preview-style")?.remove()
        doc.getElementById("ai-preview-script")?.remove()

        return doc.documentElement.outerHTML
      },
    }))

    // listen messages from iframe (editor selection)
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === "ELEMENT_SELECTED")
          setSelectedElement(event.data.payload)
        if (event.data.type === "CLEAR_SELECTION") setSelectedElement(null)
      }

      window.addEventListener("message", handleMessage)
      return () => window.removeEventListener("message", handleMessage)
    }, [])

    const handleUpdate = (updates: any) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "UPDATE_ELEMENT", payload: updates },
        "*"
      )
    }

    return (
      <div className="relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2">
         {project.current_code && blobUrl ? (
  <>
    <iframe
      key={blobUrl}
      ref={iframeRef}
      src={blobUrl}
      className={`h-full max-sm:w-full ${resolutions[device]} mx-auto transition-all`}
    />


            {showEditorPanel && selectedElement && (
              <EditorPanel
                selectedElement={selectedElement}
                onUpdate={handleUpdate}
                onClose={() => {
                  setSelectedElement(null)
                  iframeRef.current?.contentWindow?.postMessage(
                    { type: "CLEAR_SELECTION_REQUEST" },
                    "*"
                  )
                }}
              />
            )}
          </>
        ) : (
          isGenerating && <LoaderSteps />
        )}
      </div>
    )
  }
)

export default ProjectPreview
