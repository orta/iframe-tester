import { useState, useEffect, useRef, useCallback } from "react"
import "./IframeRenderer.css"
import { scriptAttributes } from "../data/element-attrs"

interface ScriptIframeRendererProps {
  defaultScriptUrl: string
  defaultScriptAttrs: Record<string, string>
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
  const [scriptAttrValues, setScriptAttrValues] = useState<Record<string, string>>(props.defaultScriptAttrs)
  const [attributesExpanded, setAttributesExpanded] = useState(false)
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
      const nonEmpty = Object.fromEntries(Object.entries(scriptAttrValues).filter(([, v]) => v))
      if (Object.keys(nonEmpty).length > 0) params.set("scriptAttrs", JSON.stringify(nonEmpty))
      const domain = new URL(window.location.href).origin
      window.history.replaceState({}, `Script iframe tester: ${domain}`, `${window.location.pathname}?${params}`)
    }, 300)
    return () => {
      if (updateURLTimeoutRef.current) {
        clearTimeout(updateURLTimeoutRef.current)
      }
    }
  }, [scriptUrl, scriptAttrValues])

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
    if (props.defaultScriptUrl) {
      const timer = setTimeout(() => {
        loadScript()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const origin = iframeSrc ? (() => { try { return new URL(iframeSrc).origin } catch { return null } })() : null

    const handleMessage = (event: MessageEvent) => {
      const suppress = event.data?.type === "TIMER_TICK" || event.data?.type === "TIMER_SYNC"
      if (suppress) return

      if (typeof event.data?.source === "string" && /devtools/i.test(event.data.source)) return

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
            <textarea
              id="script-url-input"
              value={scriptUrl}
              onChange={(e) => {
                setScriptUrl(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = e.target.scrollHeight + "px"
              }}
              placeholder="https://cdn.example.com/embed.js?slug=abc"
              rows={1}
              style={{ resize: "none", overflow: "hidden" }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto"
                  el.style.height = el.scrollHeight + "px"
                }
              }}
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

          <div className="sidebar-section">
            <div className="collapsible-header" onClick={() => setAttributesExpanded(!attributesExpanded)}>
              <h3>Script Attributes</h3>
              <span className={`collapse-icon ${attributesExpanded ? "expanded" : ""}`}>▼</span>
            </div>
            {attributesExpanded && (
              <div className="attributes-list">
                {scriptAttributes.map((attr) => {
                  const isBool = ["async", "defer", "nomodule"].includes(attr.name)
                  const currentValue = scriptAttrValues[attr.name] || ""
                  return (
                    <div key={attr.name} className="attribute-item">
                      <label className={isBool ? "attr-label-inline" : undefined}>
                        {isBool && (
                          <input
                            type="checkbox"
                            checked={!!currentValue}
                            onChange={(e) =>
                              setScriptAttrValues((prev) => ({ ...prev, [attr.name]: e.target.checked ? attr.name : "" }))
                            }
                          />
                        )}
                        <a
                          href={`https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#${attr.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {attr.name}
                        </a>
                      </label>
                      <p className="attribute-description">{attr.description}</p>
                      {isBool ? null : attr.options ? (
                        <select
                          value={currentValue}
                          onChange={(e) => setScriptAttrValues((prev) => ({ ...prev, [attr.name]: e.target.value }))}
                        >
                          {attr.options.map((opt) => (
                            <option key={opt} value={opt}>{opt || "(default)"}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={currentValue}
                          onChange={(e) => setScriptAttrValues((prev) => ({ ...prev, [attr.name]: e.target.value }))}
                          placeholder=""
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="sidebar-section code-section">
            <h3>Embed code:</h3>
            <pre>
              <code>{`<script src="${scriptUrl}"${Object.entries(scriptAttrValues)
                .filter(([, v]) => v)
                .map(([k, v]) => (v === k ? ` ${k}` : ` ${k}="${v}"`))
                .join("")}></script>`}</code>
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
