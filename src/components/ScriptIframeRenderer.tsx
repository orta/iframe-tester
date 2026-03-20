import { useState, useEffect, useRef, useCallback } from "react"
import "./IframeRenderer.css"

interface ScriptIframeRendererProps {
  defaultScriptUrl: string
}

interface ReceivedMessage {
  data: any
  origin: string
  timestamp: string
}

export default function ScriptIframeRenderer(props: ScriptIframeRendererProps) {
  const [scriptUrl, setScriptUrl] = useState(props.defaultScriptUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  const [iframeWidth, setIframeWidth] = useState<string | null>(null)
  const [iframeHeight, setIframeHeight] = useState<string | null>(null)
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])
  const [eventsSidebarOpen, setEventsSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('eventsSidebarOpen')
    return stored ? JSON.parse(stored) : false
  })
  const [filterByIframeOrigin, setFilterByIframeOrigin] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const updateURLTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    localStorage.setItem('eventsSidebarOpen', JSON.stringify(eventsSidebarOpen))
  }, [eventsSidebarOpen])

  useEffect(() => {
    if (updateURLTimeoutRef.current) {
      clearTimeout(updateURLTimeoutRef.current)
    }
    updateURLTimeoutRef.current = window.setTimeout(() => {
      const params = new URLSearchParams()
      params.set("mode", "script")
      if (scriptUrl) params.set("scriptUrl", scriptUrl)
      const domain = new URL(window.location.href).origin
      window.history.replaceState({}, `Script iframe tester: ${domain}`, `${window.location.pathname}?${params}`)
    }, 300)
    return () => {
      if (updateURLTimeoutRef.current) {
        clearTimeout(updateURLTimeoutRef.current)
      }
    }
  }, [scriptUrl])

  const loadScript = useCallback(() => {
    if (!scriptUrl) return

    setLoading(true)
    setError(null)
    setIframeSrc(null)
    setIframeWidth(null)
    setIframeHeight(null)

    const container = containerRef.current
    if (!container) return

    // Clear previous content
    container.innerHTML = ""

    const script = document.createElement("script")
    script.src = scriptUrl

    script.onload = () => {
      // Wait a moment for the script to create the iframe
      const checkForIframe = () => {
        const iframe = container.querySelector("iframe")
        if (iframe) {
          setIframeSrc(iframe.src)
          setIframeWidth(iframe.width || iframe.style.width || null)
          setIframeHeight(iframe.height || iframe.style.height || null)
          setLoading(false)
        } else {
          // Keep checking for a bit
          setTimeout(checkForIframe, 200)
        }
      }
      checkForIframe()

      // Give up after 10 seconds
      setTimeout(() => {
        if (!container.querySelector("iframe")) {
          setLoading(false)
          setError("Script loaded but no iframe was created after 10 seconds")
        }
      }, 10000)
    }

    script.onerror = () => {
      setLoading(false)
      setError("Failed to load script")
    }

    container.appendChild(script)
  }, [scriptUrl])

  useEffect(() => {
    const origin = iframeSrc ? (() => { try { return new URL(iframeSrc).origin } catch { return null } })() : null

    const handleMessage = (event: MessageEvent) => {
      const suppress = event.data?.type === "TIMER_TICK" || event.data?.type === "TIMER_SYNC"
      if (suppress) return

      if (filterByIframeOrigin && origin) {
        if (event.origin !== origin) return
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
    return () => window.removeEventListener("message", handleMessage)
  }, [filterByIframeOrigin, iframeSrc])

  return (
    <>
      <div className="container">
        <div className="sidebar">
          <div className="sidebar-section">
            <label htmlFor="script-url-input">Script URL:</label>
            <input
              id="script-url-input"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://cdn.example.com/embed.js?slug=abc"
            />
          </div>

          <div className="sidebar-section">
            <button className="load-button" onClick={loadScript} disabled={!scriptUrl || loading}>
              {loading ? "Loading..." : "Load Script"}
            </button>
          </div>

          {error && (
            <div className="sidebar-section">
              <p className="error-message">{error}</p>
            </div>
          )}

          {iframeSrc && (
            <div className="sidebar-section code-section">
              <h3>Generated iframe:</h3>
              <pre>
                <code>{`<iframe
  src="${iframeSrc}"${iframeWidth ? `\n  width="${iframeWidth}"` : ""}${iframeHeight ? `\n  height="${iframeHeight}"` : ""}
></iframe>`}</code>
              </pre>
            </div>
          )}

          <div className="sidebar-section code-section">
            <h3>Embed code:</h3>
            <pre>
              <code>{`<script src="${scriptUrl}"></script>`}</code>
            </pre>
          </div>
        </div>

        <div className="main-content">
          <div ref={containerRef} className="script-container" />
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
