import { useState, useEffect, useRef } from "react"
import "./IframeRenderer.css"

interface IframeRendererProps {
  defaultUrl: string
  defaultWidth: string
  defaultHeight: string
  defaultOtherAttributes: Record<string, string>
  autoReload: boolean
  showMessageEvents: boolean
}

interface ReceivedMessage {
  data: any
  origin: string
  timestamp: string
}

export default function IframeRenderer(props: IframeRendererProps) {
  const [url, setUrl] = useState(props.defaultUrl)
  const [width, setWidth] = useState(props.defaultWidth)
  const [height, setHeight] = useState(props.defaultHeight)
  const [otherAttributes, setOtherAttributes] = useState(props.defaultOtherAttributes)
  const [autoReload, setAutoReload] = useState(props.autoReload)
  const [showMessageEventsRef, setShowMessageEventsRef] = useState(props.showMessageEvents)
  const [iframekey, setIframekey] = useState(1)
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])
  const [eventsSidebarOpen, setEventsSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('eventsSidebarOpen')
    return stored ? JSON.parse(stored) : false
  })
  const [filterByIframeOrigin, setFilterByIframeOrigin] = useState(true)
  const [attributesExpanded, setAttributesExpanded] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Save events sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('eventsSidebarOpen', JSON.stringify(eventsSidebarOpen))
  }, [eventsSidebarOpen])

  const iframeAttributes = [
    { name: "allow", description: "Specifies a Permissions Policy for the iframe (e.g., 'camera; microphone')" },
    { name: "allowfullscreen", description: "Set to true to allow the iframe to activate fullscreen mode" },
    { name: "loading", description: "Indicates how the browser should load the iframe (eager or lazy)" },
    { name: "name", description: "A targetable name for the embedded browsing context" },
    { name: "referrerpolicy", description: "Controls which referrer is sent when fetching the iframe's resource" },
    { name: "sandbox", description: "Applies extra restrictions to the content in the frame" },
    { name: "srcdoc", description: "Inline HTML to embed, overriding the src attribute" }
  ]

  const updateURL = () => {
    const params = new URLSearchParams()
    if (autoReload) params.set("autoReload", "1")
    if (showMessageEventsRef) params.set("showMessageEvents", "1")
    params.set("url", url)
    params.set("width", width)
    params.set("height", height)
    params.set("otherAttributes", JSON.stringify(otherAttributes))
    const domain = new URL(window.location.href).origin
    window.history.replaceState({}, `Iframe tester: ${domain}`, `${window.location.pathname}?${params}`)
  }

  useEffect(() => {
    updateURL()
  }, [url, width, height, otherAttributes, autoReload, showMessageEventsRef])

  useEffect(() => {
    if (autoReload && !timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setIframekey((prev) => prev + 1)
      }, 5000)
    } else if (!autoReload && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [autoReload])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const suppress = event.data.type === "TIMER_TICK" || event.data.type === "TIMER_SYNC"
      if (suppress) return

      // Filter by iframe origin if enabled
      if (filterByIframeOrigin) {
        try {
          const iframeOrigin = new URL(url).origin
          if (event.origin !== iframeOrigin) {
            return
          }
        } catch (e) {
          // Invalid URL, skip filtering
        }
      }

      setReceivedMessages((prev) => [
        {
          data: event.data,
          origin: event.origin,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ])
    }

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [filterByIframeOrigin, url])

  const handleAttributeChange = (key: string, value: string) => {
    setOtherAttributes((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleMouseDown = (direction: "top" | "right" | "bottom" | "left") => (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = parseInt(width)
    const startHeight = parseInt(height)

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      if (direction === "right") {
        setWidth(`${Math.max(100, startWidth + deltaX)}px`)
      } else if (direction === "left") {
        setWidth(`${Math.max(100, startWidth - deltaX)}px`)
      } else if (direction === "bottom") {
        setHeight(`${Math.max(100, startHeight + deltaY)}px`)
      } else if (direction === "top") {
        setHeight(`${Math.max(100, startHeight - deltaY)}px`)
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <>
      <header className="page-header">
        <h1>iframe tester</h1>
        <p className="subtitle">Enter a URL to set as the iframe, all possible params are saved into the URL so you can refresh/share.</p>
      </header>
      <div className="container">
        <div className="sidebar">
        <div className="sidebar-section">
          <label htmlFor="url-input">URL:</label>
          <input id="url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter iframe URL" />
        </div>

        <div className="sidebar-section">
          <label>Size:</label>
          <div className="size-inputs">
            <input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="640px" />
            <span>×</span>
            <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="480px" />
          </div>
        </div>

        <div className="sidebar-section">
          <label htmlFor="auto-reload">
            <input type="checkbox" id="auto-reload" checked={autoReload} onChange={(e) => setAutoReload(e.target.checked)} />
            Auto-reload every 5s
          </label>
        </div>

        <div className="sidebar-section">
          <div className="collapsible-header" onClick={() => setAttributesExpanded(!attributesExpanded)}>
            <h3>Iframe Attributes</h3>
            <span className={`collapse-icon ${attributesExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          {attributesExpanded && (
            <div className="attributes-list">
              {iframeAttributes.map((attr) => (
                <div key={attr.name} className="attribute-item">
                  <label>
                    <a href={`https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#${attr.name}`} target="_blank" rel="noopener noreferrer">
                      {attr.name}
                    </a>
                  </label>
                  <p className="attribute-description">{attr.description}</p>
                  <input value={otherAttributes[attr.name] || ""} onChange={(e) => handleAttributeChange(attr.name, e.target.value)} placeholder="" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-section code-section">
          <h3>Code:</h3>
          <pre>
            <code>
              {`<iframe
  width="${width}"
  height="${height}"
  src="${url}"${Object.entries(otherAttributes).filter(([, value]) => value).length > 0 ? '\n  ' : ''}${Object.entries(otherAttributes)
                .filter(([, value]) => value)
                .map(([key, value]) => `${key}="${value}"`)
                .join('\n  ')}
></iframe>`}
            </code>
          </pre>
        </div>
      </div>

      <div className="main-content">
        <div className="iframe-container">
          <iframe key={iframekey} width={width} height={height} src={url} {...otherAttributes}></iframe>
          <div className="resize-handle resize-handle-top" onMouseDown={handleMouseDown("top")}></div>
          <div className="resize-handle resize-handle-right" onMouseDown={handleMouseDown("right")}></div>
          <div className="resize-handle resize-handle-bottom" onMouseDown={handleMouseDown("bottom")}></div>
          <div className="resize-handle resize-handle-left" onMouseDown={handleMouseDown("left")}></div>
        </div>
      </div>

      <div className={`events-sidebar ${eventsSidebarOpen ? 'open' : ''}`}>
        <div className="events-sidebar-toggle" onClick={() => setEventsSidebarOpen(!eventsSidebarOpen)}>
          <span className="events-label">EVENTS</span>
        </div>
        {eventsSidebarOpen && (
          <div className="events-sidebar-content">
            <div className="events-sidebar-header">
              <h3>Received Messages ({receivedMessages.length})</h3>
              <div className="header-controls">
                {receivedMessages.length > 0 && (
                  <button className="clear-button" onClick={() => setReceivedMessages([])}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="events-filter">
              <label>
                <input
                  type="checkbox"
                  checked={filterByIframeOrigin}
                  onChange={(e) => setFilterByIframeOrigin(e.target.checked)}
                />
                Only show events from iframe origin
              </label>
            </div>
            <div className="events-list">
              {receivedMessages.length === 0 ? (
                <p className="no-events">No events received yet</p>
              ) : (
                <ul>
                  {receivedMessages.map((msg, index) => {
                    const displayMsg = filterByIframeOrigin
                      ? { data: msg.data, timestamp: msg.timestamp }
                      : msg
                    return (
                      <li key={index}>
                        <pre>
                          <code>{JSON.stringify(displayMsg, null, 2)}</code>
                        </pre>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
