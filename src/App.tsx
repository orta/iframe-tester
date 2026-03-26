import { useState } from "react"
import IframeRenderer from "./components/IframeRenderer"
import ScriptIframeRenderer from "./components/ScriptIframeRenderer"
import "./App.css"

type Tab = "iframe" | "script"

function App() {
  const params = new URLSearchParams(document.location.search)
  const defaultTab: Tab = params.get("mode") === "script" ? "script" : "iframe"
  const [tab, setTab] = useState<Tab>(defaultTab)

  const iframeProps = {
    defaultUrl: params.get("url") || "https://www.youtube.com/embed/MBRqu0YOH14",
    defaultWidth: params.get("width") || "640px",
    defaultHeight: params.get("height") || "480px",
    defaultOtherAttributes: JSON.parse(params.get("otherAttributes") || "{}"),
    autoReload: !!params.get("autoReload"),
    showMessageEvents: !!params.get("showMessageEvents")
  }

  const scriptProps = {
    defaultScriptUrl: params.get("scriptUrl") || "",
    defaultScriptAttrs: JSON.parse(params.get("scriptAttrs") || "{}"),
  }

  return (
    <div className="app">
      <nav className="tab-bar">
        <button
          className={`tab ${tab === "iframe" ? "active" : ""}`}
          onClick={() => setTab("iframe")}
        >
          iframe tester
        </button>
        <span className="tab-separator">/</span>
        <button
          className={`tab ${tab === "script" ? "active" : ""}`}
          onClick={() => setTab("script")}
        >
          script iframe tester
        </button>
      </nav>
      {tab === "iframe" ? <IframeRenderer {...iframeProps} /> : <ScriptIframeRenderer {...scriptProps} />}
    </div>
  )
}

export default App
