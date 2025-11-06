import IframeRenderer from "./components/IframeRenderer"
import "./App.css"

function App() {
  const params = new URLSearchParams(document.location.search)
  const props = {
    defaultUrl: params.get("url") || "https://www.youtube.com/embed/MBRqu0YOH14",
    defaultWidth: params.get("width") || "640px",
    defaultHeight: params.get("height") || "480px",
    defaultOtherAttributes: JSON.parse(params.get("otherAttributes") || "{}"),
    autoReload: !!params.get("autoReload"),
    showMessageEvents: !!params.get("showMessageEvents")
  }

  return <IframeRenderer {...props} />
}

export default App
