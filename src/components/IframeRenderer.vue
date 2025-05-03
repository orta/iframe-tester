<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from "vue"

const props = defineProps<{
  defaultUrl: string
  defaultWidth: string
  defaultHeight: string
  defaultOtherAttributes: Record<string, string>
  autoReload: boolean
  showMessageEvents: boolean
}>()
let url = ref(props.defaultUrl)
let width = ref(props.defaultWidth)
let height = ref(props.defaultHeight)
let otherAttributes = reactive(props.defaultOtherAttributes)
let autoReload = ref(props.autoReload)
let showMessageEventsRef = ref(props.showMessageEvents)
let iframekey = ref(1)

const updateURL = () => {
  const params = new URLSearchParams()
  if (autoReload.value) params.set("autoReload", "1")
  if (showMessageEventsRef.value) params.set("showMessageEvents", "1")
  params.set("url", url.value)
  params.set("width", width.value)
  params.set("height", height.value)
  params.set("otherAttributes", JSON.stringify(otherAttributes))
  const domain = new URL(window.location.href).origin
  window.history.replaceState({}, `Iframe tester: ${domain}`, `${window.location.pathname}?${params}`)
}

watch(url, updateURL)
watch(width, updateURL)
watch(height, updateURL)
watch(otherAttributes, updateURL)
watch(autoReload, updateURL)
watch(showMessageEventsRef, updateURL)

const iframeAttributes = ["frameborder", "allow", "csp", "importance", "loading", "name", "referrerpolicy", "sandbox", "srcdoc"]

let timer: number | null = null
if (autoReload.value && !timer) {
  timer = setInterval(() => {
    iframekey.value++
  }, 5000)
} else if (timer) {
  clearInterval(timer)
  timer = null
}

const receivedMessages = ref<any[]>([])

const handleMessage = (event: MessageEvent) => {
  // Potentially filter messages by origin here if needed
  // if (event.origin !== 'expected_origin') return;

  const suppress = event.data.type === "TIMER_TICK" || event.data.type === "TIMER_SYNC"
  if (suppress) return

  receivedMessages.value.unshift({
    data: event.data,
    origin: event.origin,
    timestamp: new Date().toLocaleTimeString()
  })
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div>
    <label for="checkbox">Auto-reload every 5s</label>
    <input type="checkbox" id="checkbox" v-model="autoReload" />
  </div>

  <input id="url" v-model="url" placeholder="URL here" />

  <div class="main-content">
    <iframe :key="iframekey" :width="width" :height="height" :src="url" v-bind="otherAttributes"></iframe>

    <div v-if="showMessageEventsRef" class="sidebar">
      <h3>Received Messages:</h3>
      <ul>
        <li v-for="(msg, index) in receivedMessages" :key="index">
          <pre><code>{{ JSON.stringify(msg, null, 2) }}</code></pre>
        </li>
      </ul>
      <button @click="receivedMessages = []" v-if="receivedMessages.length > 0">Clear Messages</button>
    </div>
  </div>

  <div>
    <p>Size:</p>
    <input v-model="width" placeholder="640px" />
    by
    <input v-model="height" placeholder="480px" />
  </div>

  <div>
    <label for="showMessages">Show Message Events</label>
    <input type="checkbox" id="showMessages" v-model="showMessageEventsRef" />
  </div>

  <div class="row">
    <div style="flex: 1; padding:10px;">
      <h3>Iframe custom Attributes:</h3>

      <div class="row">
        <ul>
          <li v-for="value in iframeAttributes">
            <p>
              <code>
                <a :href="`https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#${value}`">{{ value }}</a></code
              >
            </p>
            <input v-model="otherAttributes[value]" placeholder="" />
          </li>
        </ul>
      </div>
    </div>

    <div style="flex: 1;padding:10px;">
      <h3>Code:</h3>

      <pre>
        <code>
    &lt;iframe
    width="{{width}}"
    height="{{height}}"
    src="{{url}}"
    {{Object.entries(otherAttributes).map(([key, value]) => `${key}="${value}"`).join(" ")}}
    &gt;&lt;/iframe&gt;
        </code>
      </pre>
    </div>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
  margin-top: 50px;
  margin-bottom: 0px;
}

iframe {
  margin-top: 12px;
  margin-bottom: 36px;
  flex-grow: 1; /* Allow iframe to grow */
  margin-right: 20px; /* Space between iframe and sidebar */
}

input#url {
  font-size: x-large;
  width: 100%;
}

input[type="checkbox"] {
  margin: 0 8px;
}

div.row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.main-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start; /* Align items at the top */
}

.sidebar {
  width: 360px; /* Adjust width as needed */
  border-left: 1px solid #ccc;
  padding-left: 20px;
  height: calc(100vh - 200px); /* Adjust height based on your layout */
  overflow-y: auto;
}

.sidebar h3 {
  margin-top: 0;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  margin-bottom: 10px;
  border-bottom: 1px dashed #eee;
  padding-bottom: 10px;
}

.sidebar pre {
  white-space: pre-wrap; /* Wrap long lines */
  word-break: break-all; /* Break words if needed */
  background-color: #f5f5f5;
  padding: 5px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
